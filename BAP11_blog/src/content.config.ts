import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CHRONOTYPES, MILESTONE_TYPES, PILLAR_IDS, TAG_IDS, TASK_STATUSES } from './consts';

// The local content. When a Notion database is set, src/lib/data.ts reads that part live from Notion instead.

// The data files hold a single object so the CMS can edit them as one document.
// This parser turns a list inside into entries with an id.
const listFrom = (key: string) => (text: string) =>
	(JSON.parse(text)[key] ?? []).map((item: Record<string, unknown>, i: number) => ({
		id: String(i + 1).padStart(4, '0'),
		...item,
	}));

const logbook = defineCollection({
	loader: glob({ base: './src/content/logbook', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			pillar: z.enum(PILLAR_IDS),
			tags: z.array(z.enum(TAG_IDS)).default([]),
			authors: z.array(reference('team')).default([]),
			cover: image().optional(),
			draft: z.boolean().default(false),
		}),
});

const team = defineCollection({
	loader: glob({ base: './src/content/team', pattern: '*.md' }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			order: z.number().default(0),
			pillar: z.enum(PILLAR_IDS),
			role: z.string(),
			responsibilities: z.array(z.string()).default([]),
			chronotype: z.enum(CHRONOTYPES).optional(),
			avatar: image().optional(),
			email: z.string().optional(),
			website: z.string().optional(),
		}),
});

const time = defineCollection({
	loader: file('src/data/time.json', { parser: listFrom('sessions') }),
	schema: z.object({
		date: z.coerce.date(),
		member: reference('team'),
		hours: z.number().positive(),
		pillar: z.enum(PILLAR_IDS),
		task: z.string(),
	}),
});

const weeks = defineCollection({
	loader: file('src/data/planning.json', { parser: listFrom('weeks') }),
	schema: z.object({
		label: z.string(),
		start: z.coerce.date(),
		end: z.coerce.date(),
		focus: z.string(),
	}),
});

const milestones = defineCollection({
	loader: file('src/data/planning.json', { parser: listFrom('milestones') }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		time: z.string().optional(),
		type: z.enum(MILESTONE_TYPES).default('deadline'),
	}),
});

const tasks = defineCollection({
	loader: file('src/data/planning.json', { parser: listFrom('tasks') }),
	schema: z.object({
		title: z.string(),
		status: z.enum(TASK_STATUSES).default('todo'),
		week: z.string(),
		due: z.coerce.date().optional(),
		owners: z.array(reference('team')).default([]),
		notes: z.string().optional(),
		pillar: z.enum(PILLAR_IDS).optional(),
	}),
});

export const collections = { logbook, team, time, weeks, milestones, tasks };
