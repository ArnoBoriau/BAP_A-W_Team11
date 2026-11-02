import type { ImageMetadata } from 'astro';
import { type CollectionEntry, getCollection, render } from 'astro:content';
import { MEMBER_COLORS } from '../consts';
import { notion } from '../notion/client';
import * as fromNotion from '../notion/source';

// Every part of the site comes from Notion when its database is set (see src/notion), and from the local
// content collections otherwise. Both give the same shape, so the pages don't care where the data lives.

export const live = Object.values(notion).some(Boolean);

export type Post = {
	id: string;
	data: Omit<CollectionEntry<'logbook'>['data'], 'cover'> & { cover?: ImageMetadata | string };
	/** Set for posts that come from Notion. */
	notionId?: string;
};
export type Member = { id: string; data: CollectionEntry<'team'>['data']; color: string };

async function teamList() {
	const members = notion.team ? await fromNotion.team(notion.team) : await getCollection('team');
	return members.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}
const names = async () => (await teamList()).map((m) => ({ id: m.id, name: m.data.name }));

/** Published logbook posts, newest first. */
export async function getEntries(): Promise<Post[]> {
	const posts: Post[] = notion.logbook
		? await fromNotion.posts(notion.logbook, await names())
		: await getCollection('logbook', ({ data }) => import.meta.env.DEV || !data.draft);
	return posts.sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.data.title.localeCompare(b.data.title),
	);
}

/**
 * One post with its neighbours and content: `html` for Notion posts, a `Content` component for local ones.
 * A Notion post that was renamed is found by the id at the end of its old URL and returns `moved`.
 */
export async function getPost(id: string) {
	const posts = await getEntries();
	const i = posts.findIndex((p) => p.id === id);
	if (i < 0) {
		const short = /-([0-9a-f]{8})$/.exec(id)?.[1];
		const moved = short && posts.find((p) => p.notionId && fromNotion.shortId(p.notionId) === short);
		return moved ? { moved: moved.id } : undefined;
	}
	const post = posts[i];
	const around = { post, newer: posts[i - 1], older: posts[i + 1] };

	if (post.notionId) return { ...around, ...(await fromNotion.postContent(post.notionId)) };
	const entry = post as CollectionEntry<'logbook'>;
	const { Content } = await render(entry);
	return { ...around, Content, text: entry.body ?? '' };
}

/** Team members in their configured order, each with a fixed chart colour. */
export async function getTeam(): Promise<Member[]> {
	return (await teamList()).map((m, i) => ({ id: m.id, data: m.data, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }));
}

export async function getTimeLog() {
	const sessions = notion.time ? await fromNotion.sessions(notion.time, await names()) : await getCollection('time');
	return sessions.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** The weeks overview is a plain table in Notion, so it always comes from src/data/planning.json. */
export async function getWeeks() {
	return (await getCollection('weeks')).sort((a, b) => a.data.start.valueOf() - b.data.start.valueOf());
}

export async function getPlanning() {
	const byDate = <T extends { data: { date: Date } }>(a: T, b: T) => a.data.date.valueOf() - b.data.date.valueOf();
	const weeks = await getWeeks();
	const { milestones, tasks } = notion.planning
		? await fromNotion.planning(notion.planning, await names())
		: { milestones: await getCollection('milestones'), tasks: await getCollection('tasks') };
	return { weeks, milestones: [...milestones].sort(byDate), tasks };
}

export const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

/** Today at 00:00 UTC, so a deadline today still counts as upcoming. */
export function today() {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const DAY = 24 * 60 * 60 * 1000;

type Week = { data: { start: Date; end: Date } };

/** A planning week runs until the Sunday after its last working day. */
export const weekEnd = (end: Date) => new Date(end.valueOf() + 2 * DAY);
export const inWeek = (date: Date, w: Week) => date >= w.data.start && date <= weekEnd(w.data.end);

export function formatDate(date: Date, style: 'short' | 'long' | 'day' = 'short') {
	if (style === 'day') {
		return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
	}
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: style === 'long' ? 'long' : 'short',
		year: style === 'long' ? 'numeric' : undefined,
		timeZone: 'UTC',
	});
}

export const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;

export function readingTime(body = '') {
	return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}
