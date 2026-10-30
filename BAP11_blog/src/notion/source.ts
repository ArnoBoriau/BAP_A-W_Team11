// Reads our Notion databases into the same shape as the local content collections, so the pages don't care
// where the data comes from. Used by src/lib/data.ts when a database is set; results are cached briefly.
import type { CollectionEntry } from 'astro:content';
import { cached } from './cache';
import {
	blocksToHtml,
	fileRoute,
	normalize,
	properties,
	queryDatabase,
	slugify,
	teamMatcher,
	type Page,
} from './client';
import {
	CHRONOTYPE_ALIASES,
	MILESTONE_GROUPS,
	PILLAR_ALIASES,
	PROPERTIES,
	TAG_ALIASES,
	TASK_GROUPS,
} from './config';

type TeamRef = { collection: 'team'; id: string };
type Data<C extends 'logbook' | 'team' | 'time' | 'milestones' | 'tasks'> = CollectionEntry<C>['data'];

const warned = new Set<string>();
/** Looks a select value up in an alias table, and warns once per unknown value. */
function alias(table: Record<string, string>, what: string) {
	return (value: string) => {
		const hit = table[normalize(value)];
		if (!hit && value && !warned.has(`${what}:${value}`)) {
			warned.add(`${what}:${value}`);
			console.warn(`Unknown ${what} "${value}" in Notion. Add it to src/notion/config.ts.`);
		}
		return hit;
	};
}
const pillar = alias(PILLAR_ALIASES, 'pillar');
const firstPillar = (names: string[]) => names.map(pillar).find(Boolean) as Data<'logbook'>['pillar'] | undefined;

const day = (iso?: string) => (iso ? new Date(iso.slice(0, 10)) : undefined);
const refs = (ids: string[]): TeamRef[] => [...new Set(ids)].map((id) => ({ collection: 'team', id }));

export type Team = { id: string; name: string }[];

// ---------- logbook ----------

/** The first 8 characters of a Notion id, enough to tell our posts apart. */
export const shortId = (id: string) => id.replace(/-/g, '').slice(0, 8);

export type NotionPost = { id: string; notionId: string; data: Omit<Data<'logbook'>, 'cover'> & { cover?: string } };

export function posts(database: string, team: Team): Promise<NotionPost[]> {
	return cached(`posts:${database}`, async () => {
		const P = PROPERTIES.logbook;
		const tag = alias(TAG_ALIASES, 'tag');
		const person = teamMatcher(team);
		const list: NotionPost[] = [];

		for (const page of await queryDatabase(database)) {
			const p = properties(page);
			if (p.has(P.published) && !p.checkbox(P.published)) continue;
			const title = p.title(P.title);
			if (!title) continue;

			const date = day(p.date(P.date)?.start) ?? day(page.created_time)!;
			const cover = p.file(P.cover) ?? (page.cover?.type === 'external' ? { hosted: false, url: page.cover.external.url } : page.cover ? { hosted: true, url: '' } : undefined);
			list.push({
				// The end of the Notion id keeps old links working after a rename (see getPost in src/lib/data.ts).
				id: slugify(p.text(P.slug)) || `${date.toISOString().slice(0, 10)}-${slugify(title)}-${shortId(page.id)}`,
				notionId: page.id,
				data: {
					title,
					description: p.text(P.description),
					date,
					pillar: firstPillar(p.names(P.pillar)) ?? 'general',
					tags: [...new Set(p.names(P.tags).map(tag).filter(Boolean))] as Data<'logbook'>['tags'],
					authors: refs(p.names(P.authors).map(person)),
					cover: cover ? (cover.hosted ? fileRoute('cover', page.id) : cover.url) : undefined,
					draft: false,
				},
			});
		}
		return list;
	});
}

/** The content of one post as HTML, plus its plain text for the reading time. */
export function postContent(pageId: string): Promise<{ html: string; text: string }> {
	return cached(`content:${pageId}`, async () => {
		const text: string[] = [];
		const html = await blocksToHtml(pageId, text);
		return { html, text: text.join(' ') };
	});
}

// ---------- time log ----------

export function sessions(database: string, team: Team): Promise<{ id: string; data: Data<'time'> }[]> {
	return cached(`sessions:${database}`, async () => {
		const P = PROPERTIES.time;
		const person = teamMatcher(team);
		return (await queryDatabase(database)).flatMap((page) => {
			const p = properties(page);
			const hours = p.number(P.hours);
			const who = p.names(P.member)[0];
			if (!hours || !who) return [];
			return [
				{
					id: page.id,
					data: {
						date: day(p.date(P.date)?.start) ?? day(page.created_time)!,
						member: { collection: 'team' as const, id: person(who) },
						hours,
						pillar: firstPillar(p.names(P.pillar)) ?? 'general',
						task: p.title(P.task) || p.text(P.task),
					},
				},
			];
		});
	});
}

// ---------- planning: one database, split into dates and tasks by Group ----------

const isJury = (page: Page, title: string) =>
	(page.icon?.type === 'emoji' && page.icon.emoji === '🏆') || /\bjury\b/i.test(title);

export function planning(database: string, team: Team) {
	return cached(`planning:${database}`, async () => {
		const P = PROPERTIES.planning;
		const person = teamMatcher(team);
		const status = alias(TASK_GROUPS, 'planning group');
		const clock = (iso?: string) => (iso && iso.length > 10 ? iso.slice(11, 16) : undefined);
		const milestones: { id: string; data: Data<'milestones'> }[] = [];
		const tasks: { id: string; data: Data<'tasks'> }[] = [];

		for (const page of await queryDatabase(database)) {
			const p = properties(page);
			const title = p.title(P.title);
			if (!title) continue;
			const group = p.text(P.group);
			const type = isJury(page, title) ? 'jury' : MILESTONE_GROUPS[normalize(group)];

			if (type) {
				const date = p.date(P.date);
				if (!date) continue;
				const from = clock(date.start);
				const to = clock(date.end);
				milestones.push({
					id: page.id,
					data: {
						title,
						date: day(date.start)!,
						time: p.text(P.time) || (from && to ? `${from}–${to}` : from),
						type: type as Data<'milestones'>['type'],
					},
				});
			} else {
				tasks.push({
					id: page.id,
					data: {
						title,
						status: (status(group) ?? 'todo') as Data<'tasks'>['status'],
						week: p.text(P.phase) || 'Ongoing',
						owners: refs(p.names(P.owners).map(person)),
						notes: p.text(P.notes) || undefined,
						pillar: firstPillar(p.names(P.pillar)),
					},
				});
			}
		}
		return { milestones, tasks };
	});
}

// ---------- team ----------

export function team(database: string): Promise<{ id: string; data: Data<'team'> }[]> {
	return cached(`team:${database}`, async () => {
		const P = PROPERTIES.team;
		const chronotype = alias(CHRONOTYPE_ALIASES, 'kind of person');
		return (await queryDatabase(database)).flatMap((page) => {
			const p = properties(page);
			const name = p.title(P.name);
			if (!name) return [];
			return [
				{
					// Their first name, the same id the other databases use to refer to them.
					id: slugify(name.split(/\s+/)[0]),
					data: {
						name,
						order: p.number(P.order) ?? 0,
						role: p.text(P.role) || 'Team member',
						pillar: firstPillar(p.names(P.pillar)) ?? 'general',
						responsibilities: p
							.text(P.responsibilities)
							.split(/[,\n]/)
							.map((r) => r.trim())
							.filter(Boolean),
						chronotype: chronotype(p.text(P.chronotype)) as Data<'team'>['chronotype'],
						email: p.text(P.email) || undefined,
					},
				},
			];
		});
	});
}
