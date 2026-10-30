// Small wrapper around the Notion API: reading rows, reading properties and turning page content into HTML.
// Runs on the server for every (uncached) request, so it never touches the file system.
import {
	Client,
	collectAllDataSourceRows,
	collectPaginatedAPI,
	extractNotionId,
	isFullBlock,
	isFullPage,
	LogLevel,
} from '@notionhq/client';
import type { BlockObjectResponse, PageObjectResponse, RichTextItemResponse } from '@notionhq/client';
import {
	NOTION_LOGBOOK_DB,
	NOTION_PLANNING_DB,
	NOTION_TEAM_DB,
	NOTION_TIME_DB,
	NOTION_TOKEN,
} from 'astro:env/server';

export type Page = PageObjectResponse;

/** Notion settings from .env (locally) or the Vercel environment. A database left empty uses the local files. */
const token = NOTION_TOKEN?.trim();
const database = (value?: string) => (token && value?.trim()) || undefined;
export const notion = {
	logbook: database(NOTION_LOGBOOK_DB),
	time: database(NOTION_TIME_DB),
	planning: database(NOTION_PLANNING_DB),
	team: database(NOTION_TEAM_DB),
};

let client: Client | undefined;
function api() {
	// Errors surface through our own messages; the SDK's warnings would only repeat them.
	client ??= new Client({ auth: token, logLevel: LogLevel.ERROR });
	return client;
}

/** All pages of a database. Accepts a database id or the database URL copied from Notion. */
export async function queryDatabase(databaseUrlOrId: string): Promise<Page[]> {
	const databaseId = extractNotionId(databaseUrlOrId) ?? databaseUrlOrId;
	const db = await api()
		.databases.retrieve({ database_id: databaseId })
		.catch((error: Error) => {
			throw new Error(
				`Could not read Notion database ${databaseId}: ${error.message} ` +
					'Check NOTION_TOKEN, and share the database with the integration (••• → Connections).',
				{ cause: error },
			);
		});
	const sources = 'data_sources' in db ? db.data_sources : [];

	const pages: Page[] = [];
	for (const source of sources) {
		const rows = await collectAllDataSourceRows(api(), { data_source_id: source.id });
		pages.push(...rows.filter((row): row is Page => row.object === 'page' && isFullPage(row)));
	}
	return pages;
}

// ---------- properties ----------

type Property = Page['properties'][string];

/** Reads properties by a list of candidate names, so small naming differences in Notion don't break the site. */
export function properties(page: Page) {
	const byName = new Map(Object.entries(page.properties).map(([name, value]) => [name.toLowerCase().trim(), value]));
	const find = (names: readonly string[]): Property | undefined => {
		for (const name of names) {
			const property = byName.get(name.toLowerCase());
			if (property) return property;
		}
	};

	return {
		has: (names: readonly string[]) => !!find(names),

		text(names: readonly string[]): string {
			const p = find(names);
			if (!p) return '';
			switch (p.type) {
				case 'title':
					return plain(p.title);
				case 'rich_text':
					return plain(p.rich_text);
				case 'select':
					return p.select?.name ?? '';
				case 'status':
					return p.status?.name ?? '';
				case 'url':
					return p.url ?? '';
				case 'number':
					return p.number == null ? '' : String(p.number);
				case 'formula':
					return p.formula.type === 'string' ? (p.formula.string ?? '') : '';
				default:
					return '';
			}
		},

		/** The page title, whatever the title property is called. */
		title(names: readonly string[]): string {
			const named = find(names);
			if (named?.type === 'title') return plain(named.title);
			const title = Object.values(page.properties).find((p) => p.type === 'title');
			return title?.type === 'title' ? plain(title.title) : '';
		},

		/** Names from a select, multi-select, status or people property, or a comma separated text. */
		names(names: readonly string[]): string[] {
			const p = find(names);
			if (!p) return [];
			switch (p.type) {
				case 'select':
					return p.select ? [p.select.name] : [];
				case 'multi_select':
					return p.multi_select.map((o) => o.name);
				case 'status':
					return p.status ? [p.status.name] : [];
				case 'people':
					return p.people.map((u) => ('name' in u && u.name) || ('person' in u && u.person?.email) || '').filter(Boolean);
				case 'rich_text':
				case 'title':
					return (p.type === 'title' ? plain(p.title) : plain(p.rich_text))
						.split(/[,;&]/)
						.map((s) => s.trim())
						.filter(Boolean);
				default:
					return [];
			}
		},

		date(names: readonly string[]): { start: string; end?: string } | undefined {
			const p = find(names);
			if (p?.type === 'date' && p.date) return { start: p.date.start, end: p.date.end ?? undefined };
			if (p?.type === 'created_time') return { start: p.created_time };
		},

		number(names: readonly string[]): number | undefined {
			const p = find(names);
			if (p?.type === 'number') return p.number ?? undefined;
			if (p?.type === 'formula' && p.formula.type === 'number') return p.formula.number ?? undefined;
			if (p?.type === 'rollup' && p.rollup.type === 'number') return p.rollup.number ?? undefined;
		},

		checkbox(names: readonly string[]): boolean {
			const p = find(names);
			return p?.type === 'checkbox' ? p.checkbox : false;
		},

		/** The first file of a files property, or a URL property. */
		file(names: readonly string[]): { hosted: boolean; url: string } | undefined {
			const p = find(names);
			if (p?.type === 'url' && p.url) return { hosted: false, url: p.url };
			if (p?.type === 'files') {
				const first = p.files[0];
				if (first?.type === 'file') return { hosted: true, url: first.file.url };
				if (first?.type === 'external') return { hosted: false, url: first.external.url };
			}
		},
	};
}

export const plain = (text: RichTextItemResponse[]) => text.map((t) => t.plain_text).join('');

/** Lower case, trimmed, used to match select values against alias tables. */
export const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const slugify = (value: string) =>
	value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * Maps Notion people or names onto team member ids by full or first name.
 * People who aren't on the team get their first name as id, which is also how team members from Notion get theirs.
 */
export function teamMatcher(team: { id: string; name: string }[]) {
	const members = team.map((m) => ({ id: m.id, full: normalize(m.name), first: normalize(m.name.split(/\s+/)[0]) }));
	return (value: string): string => {
		const v = normalize(value.split('@')[0].replace(/[._]/g, ' '));
		const first = v.split(' ')[0];
		return members.find((m) => m.id === v || m.full === v || m.first === first || m.id === first)?.id ?? slugify(first);
	};
}

// ---------- files ----------

/**
 * Files uploaded to Notion have links that expire after an hour, so the site links to /notion/file/…,
 * which asks Notion for a fresh link on every (cached) request. External links are used as they are.
 */
export const fileRoute = (kind: 'block' | 'cover', id: string) => `/notion/file/${kind}/${id}`;

/** A fresh link for the file in an image, video, file, PDF or audio block. */
export async function blockFileUrl(blockId: string): Promise<string | undefined> {
	const block = await api().blocks.retrieve({ block_id: blockId });
	if (!isFullBlock(block)) return;
	const media =
		block.type === 'image'
			? block.image
			: block.type === 'video'
				? block.video
				: block.type === 'file'
					? block.file
					: block.type === 'pdf'
						? block.pdf
						: block.type === 'audio'
							? block.audio
							: undefined;
	return media?.type === 'file' ? media.file.url : media?.type === 'external' ? media.external.url : undefined;
}

/** A fresh link for a page's cover: its Cover property first, then the page cover. */
export async function coverUrl(pageId: string, coverProperty: readonly string[]): Promise<string | undefined> {
	const page = await api().pages.retrieve({ page_id: pageId });
	if (!isFullPage(page)) return;
	const file = properties(page).file(coverProperty);
	if (file) return file.url;
	return page.cover?.type === 'file' ? page.cover.file.url : page.cover?.type === 'external' ? page.cover.external.url : undefined;
}

// ---------- page content to HTML ----------

async function children(blockId: string): Promise<BlockObjectResponse[]> {
	const results = await collectPaginatedAPI(api().blocks.children.list, { block_id: blockId });
	return results.filter(isFullBlock);
}

const escape = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Only web and mail links; links to other Notion pages open in Notion. */
function href(url: string) {
	if (url.startsWith('/')) return `https://www.notion.so${url}`;
	return /^(https?:|mailto:)/i.test(url) ? url : '#';
}

function richText(text: RichTextItemResponse[]): string {
	return text
		.map((t) => {
			if (t.type === 'equation') return `<code>${escape(t.equation.expression)}</code>`;
			let out = escape(t.plain_text).replace(/\n/g, '<br>');
			if (t.annotations.code) out = `<code>${out}</code>`;
			if (t.annotations.bold) out = `<strong>${out}</strong>`;
			if (t.annotations.italic) out = `<em>${out}</em>`;
			if (t.annotations.strikethrough) out = `<s>${out}</s>`;
			if (t.annotations.underline) out = `<u>${out}</u>`;
			if (t.href) out = `<a href="${escape(href(t.href))}">${out}</a>`;
			return out;
		})
		.join('');
}

const media = (file: { type: 'file' } | { type: 'external'; external: { url: string } }, blockId: string) =>
	file.type === 'external' ? file.external.url : fileRoute('block', blockId);

const LISTS = { bulleted_list_item: '<ul>', numbered_list_item: '<ol>', to_do: '<ul class="todo">' } as const;
const CLOSE = { bulleted_list_item: '</ul>', numbered_list_item: '</ol>', to_do: '</ul>' } as const;
type ListType = keyof typeof LISTS;
const isList = (type: string): type is ListType => type in LISTS;

/** Converts a page (or block) and its nested blocks to HTML. `text` collects the plain text, for the reading time. */
export async function blocksToHtml(blockId: string, text: string[] = []): Promise<string> {
	const blocks = await children(blockId);
	// Nested blocks of one level are fetched in parallel.
	const nested = await Promise.all(
		blocks.map((b) =>
			b.has_children && !['child_page', 'child_database', 'table'].includes(b.type) ? blocksToHtml(b.id, text) : '',
		),
	);

	let html = '';
	let list: ListType | undefined;
	for (const [i, block] of blocks.entries()) {
		const type = isList(block.type) ? block.type : undefined;
		if (type !== list) {
			if (list) html += CLOSE[list];
			if (type) html += LISTS[type];
			list = type;
		}
		html += await blockToHtml(block, nested[i], text);
	}
	if (list) html += CLOSE[list];
	return html;
}

async function blockToHtml(block: BlockObjectResponse, inner: string, text: string[]): Promise<string> {
	const rich = (value: RichTextItemResponse[]) => {
		text.push(plain(value));
		return richText(value);
	};

	switch (block.type) {
		case 'paragraph': {
			const content = rich(block.paragraph.rich_text);
			return (content ? `<p>${content}</p>` : '') + inner;
		}
		// The post title is the page's h1, so Notion headings start one level lower.
		case 'heading_1':
			return `<h2>${rich(block.heading_1.rich_text)}</h2>${inner}`;
		case 'heading_2':
			return `<h2>${rich(block.heading_2.rich_text)}</h2>${inner}`;
		case 'heading_3':
			return `<h3>${rich(block.heading_3.rich_text)}</h3>${inner}`;
		case 'bulleted_list_item':
			return `<li>${rich(block.bulleted_list_item.rich_text)}${inner}</li>`;
		case 'numbered_list_item':
			return `<li>${rich(block.numbered_list_item.rich_text)}${inner}</li>`;
		case 'to_do':
			return `<li><input type="checkbox" disabled${block.to_do.checked ? ' checked' : ''}> ${rich(block.to_do.rich_text)}${inner}</li>`;
		case 'quote':
			return `<blockquote><p>${rich(block.quote.rich_text)}</p>${inner}</blockquote>`;
		case 'callout': {
			const icon = block.callout.icon?.type === 'emoji' ? `<span class="callout-icon">${block.callout.icon.emoji}</span>` : '';
			return `<aside class="callout">${icon}<div><p>${rich(block.callout.rich_text)}</p>${inner}</div></aside>`;
		}
		case 'toggle':
			return `<details><summary>${rich(block.toggle.rich_text)}</summary>${inner}</details>`;
		case 'code':
			return `<pre><code>${escape(plain(block.code.rich_text))}</code></pre>`;
		case 'equation':
			return `<p><code>${escape(block.equation.expression)}</code></p>`;
		case 'divider':
			return '<hr>';
		case 'image': {
			const caption = rich(block.image.caption);
			return `<figure><img src="${escape(media(block.image, block.id))}" alt="${escape(plain(block.image.caption))}" loading="lazy">${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
		}
		case 'video':
		case 'file':
		case 'pdf':
		case 'audio': {
			const file =
				block.type === 'video' ? block.video : block.type === 'file' ? block.file : block.type === 'pdf' ? block.pdf : block.audio;
			const label = rich(file.caption) || `Open ${block.type}`;
			return `<p><a href="${escape(media(file, block.id))}" target="_blank" rel="noreferrer">${label} ↗</a></p>`;
		}
		case 'bookmark':
		case 'link_preview':
		case 'embed': {
			const url =
				block.type === 'bookmark' ? block.bookmark.url : block.type === 'embed' ? block.embed.url : block.link_preview.url;
			return `<p><a href="${escape(href(url))}" target="_blank" rel="noreferrer">${escape(url)} ↗</a></p>`;
		}
		case 'table': {
			const rows = (await children(block.id)).flatMap((r) => (r.type === 'table_row' ? [r.table_row.cells] : []));
			if (!rows.length) return '';
			const head = block.table.has_column_header ? rows.shift()! : undefined;
			const tr = (cells: RichTextItemResponse[][], tag: 'th' | 'td') =>
				`<tr>${cells.map((c) => `<${tag}>${rich(c)}</${tag}>`).join('')}</tr>`;
			return `<table>${head ? `<thead>${tr(head, 'th')}</thead>` : ''}<tbody>${rows.map((r) => tr(r, 'td')).join('')}</tbody></table>`;
		}
		case 'child_database':
			// An inline database (like the AI uses on the AI log) becomes a table in the post.
			return databaseToHtml(block.id, block.child_database.title);
		case 'column_list':
		case 'column':
		case 'synced_block':
			return inner;
		default:
			// Child pages, breadcrumbs and the like have no place in a post.
			return '';
	}
}

/** Any property as HTML, for tables. */
function cell(p: Property): string {
	const date = (iso: string) =>
		new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
	switch (p.type) {
		case 'title':
			return richText(p.title);
		case 'rich_text':
			return richText(p.rich_text);
		case 'number':
			return p.number == null ? '' : String(p.number);
		case 'select':
			return escape(p.select?.name ?? '');
		case 'multi_select':
			return escape(p.multi_select.map((o) => o.name).join(', '));
		case 'status':
			return escape(p.status?.name ?? '');
		case 'date':
			return p.date ? date(p.date.start) + (p.date.end ? ` – ${date(p.date.end)}` : '') : '';
		case 'people':
			return escape(p.people.map((u) => ('name' in u && u.name) || '').filter(Boolean).join(', '));
		case 'checkbox':
			return p.checkbox ? '✓' : '';
		case 'url':
			return p.url ? `<a href="${escape(href(p.url))}">${escape(p.url)}</a>` : '';
		case 'email':
			return escape(p.email ?? '');
		case 'phone_number':
			return escape(p.phone_number ?? '');
		case 'created_time':
			return date(p.created_time);
		case 'last_edited_time':
			return date(p.last_edited_time);
		case 'formula':
			return p.formula.type === 'string'
				? escape(p.formula.string ?? '')
				: p.formula.type === 'number'
					? String(p.formula.number ?? '')
					: p.formula.type === 'boolean' && p.formula.boolean
						? '✓'
						: '';
		case 'files':
			return escape(p.files.map((f) => f.name).join(', '));
		default:
			return '';
	}
}

async function databaseToHtml(databaseId: string, title: string): Promise<string> {
	let rows: Page[];
	try {
		rows = await queryDatabase(databaseId);
	} catch {
		// Linked databases (views of a database elsewhere) can't be read through the API.
		return title ? `<p><em>${escape(title)}: open in Notion to see this table.</em></p>` : '';
	}
	if (!rows.length) return '';

	// Title column first, then the others in Notion's order. Oldest rows first.
	const names = Object.entries(rows[0].properties)
		.sort(([, a], [, b]) => Number(b.type === 'title') - Number(a.type === 'title'))
		.map(([name]) => name);
	rows.sort((a, b) => a.created_time.localeCompare(b.created_time));
	const head = `<thead><tr>${names.map((n) => `<th>${escape(n)}</th>`).join('')}</tr></thead>`;
	const body = rows.map((r) => `<tr>${names.map((n) => `<td>${cell(r.properties[n])}</td>`).join('')}</tr>`).join('');
	return `${title ? `<h3>${escape(title)}</h3>` : ''}<table>${head}<tbody>${body}</tbody></table>`;
}
