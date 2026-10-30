// Prints every configured Notion database: its properties, which of them the site uses, and select values the site doesn't know yet.
// Run with `npm run notion:inspect` after filling in .env.
import { Client, collectAllDataSourceRows, extractNotionId } from '@notionhq/client';
import {
	CHRONOTYPE_ALIASES,
	MILESTONE_GROUPS,
	PILLAR_ALIASES,
	PROPERTIES,
	TAG_ALIASES,
	TASK_GROUPS,
} from '../src/notion/config.ts';

const DATABASES = {
	logbook: 'NOTION_LOGBOOK_DB',
	time: 'NOTION_TIME_DB',
	planning: 'NOTION_PLANNING_DB',
	team: 'NOTION_TEAM_DB',
} as const;

// Fields the site can do without.
const OPTIONAL = new Set([
	'logbook.description',
	'logbook.cover',
	'logbook.slug',
	'logbook.published',
	'time.pillar',
	'planning.notes',
	'planning.pillar',
	'planning.time',
	'team.order',
	'team.email',
]);

// Which select-like fields are checked against which alias table.
const VALUES: Record<string, Record<string, string>> = {
	'logbook.pillar': PILLAR_ALIASES,
	'logbook.tags': TAG_ALIASES,
	'time.pillar': PILLAR_ALIASES,
	'planning.group': { ...MILESTONE_GROUPS, ...TASK_GROUPS },
	'planning.pillar': PILLAR_ALIASES,
	'team.pillar': PILLAR_ALIASES,
	'team.chronotype': CHRONOTYPE_ALIASES,
};

const token = process.env.NOTION_TOKEN;
if (!token) {
	console.error('NOTION_TOKEN is missing. Copy .env.example to .env and fill it in.');
	process.exit(1);
}
const notion = new Client({ auth: token });
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const warn = (s: string) => `\x1b[33m${s}\x1b[0m`;
const ok = (s: string) => `\x1b[32m${s}\x1b[0m`;

for (const [collection, key] of Object.entries(DATABASES) as [keyof typeof DATABASES, string][]) {
	const value = process.env[key]?.trim();
	console.log(`\n${bold(collection)} ${dim(`(${key})`)}`);
	if (!value) {
		console.log(dim('  not set, the site uses the local files'));
		continue;
	}

	try {
		const id = extractNotionId(value) ?? value;
		const db = await notion.databases.retrieve({ database_id: id });
		const sources = 'data_sources' in db ? db.data_sources : [];
		const title = 'title' in db ? db.title.map((t) => t.plain_text).join('') : id;
		console.log(`  ${ok('✓')} ${title} ${dim(`· ${sources.length} data source(s)`)}`);

		for (const source of sources) {
			const ds = await notion.dataSources.retrieve({ data_source_id: source.id });
			const props = 'properties' in ds ? ds.properties : {};
			const rows = await collectAllDataSourceRows(notion, { data_source_id: source.id });
			console.log(`  ${dim(`${rows.length} rows`)}`);

			console.log(`  ${bold('Properties in Notion')}`);
			for (const [name, prop] of Object.entries(props)) {
				const options =
					prop.type === 'select'
						? prop.select.options.map((o: { name: string }) => o.name)
						: prop.type === 'multi_select'
							? prop.multi_select.options.map((o: { name: string }) => o.name)
							: prop.type === 'status'
								? prop.status.options.map((o: { name: string }) => o.name)
								: [];
				console.log(`    ${name} ${dim(prop.type)}${options.length ? dim(` · ${options.join(', ')}`) : ''}`);
			}

			console.log(`  ${bold('Used by the site')}`);
			const lower = new Map(Object.entries(props).map(([name, prop]) => [name.toLowerCase(), { name, prop }]));
			for (const [field, candidates] of Object.entries(PROPERTIES[collection])) {
				const match = (candidates as readonly string[]).map((c) => lower.get(c.toLowerCase())).find(Boolean);
				const isTitle = field === 'title' || field === 'task' || field === 'name';
				const fallback = !match && isTitle ? Object.entries(props).find(([, p]) => p.type === 'title') : undefined;
				const label = match
					? ok(`→ "${match.name}" (${match.prop.type})`)
					: fallback
						? ok(`→ "${fallback[0]}" (title)`)
						: OPTIONAL.has(`${collection}.${field}`)
						? dim('→ not in Notion (optional)')
						: warn('→ not found, add the Notion name to src/notion/config.ts');
				console.log(`    ${field.padEnd(12)} ${label}`);

				const table = VALUES[`${collection}.${field}`];
				if (match && table) {
					const p = match.prop;
					const names =
						p.type === 'select'
							? p.select.options.map((o: { name: string }) => o.name)
							: p.type === 'multi_select'
								? p.multi_select.options.map((o: { name: string }) => o.name)
								: p.type === 'status'
									? p.status.options.map((o: { name: string }) => o.name)
									: [];
					const unknown = names.filter((n: string) => !table[n.toLowerCase().replace(/\s+/g, ' ').trim()]);
					if (unknown.length) console.log(`    ${''.padEnd(12)} ${warn(`unknown values: ${unknown.join(', ')}`)}`);
				}
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.log(`  ${warn('✗')} ${message}`);
		console.log(dim('  Is the database shared with the integration? In Notion: ••• → Connections → add your integration.'));
	}
}
console.log();
