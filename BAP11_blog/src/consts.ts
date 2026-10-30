// Global data for the site. Keep public/admin/config.yml in sync when you change the lists below.

export const SITE_TITLE = 'BAP Team 11 — Next-Level Arrival Experience';
export const SITE_DESCRIPTION =
	'Bachelor project logbook of Arno, Emelie and Amber for ARCHITECT@WORK Kortrijk: research, process, feedback, planning, hours and AI use.';

export const PROJECT = {
	title: 'Next-Level Arrival Experience',
	team: 'Team 11',
	members: 'Arno, Emelie & Amber',
	client: 'ARCHITECT@WORK',
	coach: 'Gitte Neven',
	programme: 'Devine, Howest',
	start: '2026-10-27',
	end: '2026-12-17',
	event: '29 & 30 April 2027, Kortrijk Xpo',
	concept: 'Fenestra',
	repo: 'https://github.com/ArnoBoriau/BAP_A-W_Team11',
};

export const CLIENT_CONTACTS = [
	{ name: 'Anne-Laure Van de Ginste', role: 'Exhibition manager' },
	{ name: 'Isabeau Riquière', role: 'Project assistant' },
];

// Pillars: the same four as in Notion. Every logbook post, hour and task belongs to one.
export const PILLAR_IDS = ['ux', 'design', 'dev', 'general'] as const;
export type PillarId = (typeof PILLAR_IDS)[number];
export const PILLARS: Record<PillarId, { label: string; color: string }> = {
	ux: { label: 'UX', color: 'var(--p-ux)' },
	design: { label: 'Design', color: 'var(--p-design)' },
	dev: { label: 'Dev', color: 'var(--p-dev)' },
	general: { label: 'General', color: 'var(--p-general)' },
};

// Logbook tags. A post can have several.
export const TAG_IDS = ['research', 'process', 'feedback-client', 'expert-talk', 'ai', 'decision', 'result', 'planning'] as const;
export type TagId = (typeof TAG_IDS)[number];
export const TAGS: Record<TagId, string> = {
	process: 'Process',
	research: 'Research',
	planning: 'Planning',
	'feedback-client': 'Feedback client',
	'expert-talk': 'Expert talk',
	ai: 'AI',
	decision: 'Decision',
	result: 'Result',
};

export const CHRONOTYPES = ['morning', 'evening'] as const;

export const MILESTONE_TYPES = ['deadline', 'event', 'jury'] as const;
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export const TASK_STATUS_LABELS = { todo: 'Not started', doing: 'In progress', done: 'Done' } as const;

// One colour per team member (in team `order`), from the A@W country palette and checked for colour-blind separation.
export const MEMBER_COLORS = ['#2a9e8f', '#d4730a', '#1f88cc', '#b9852f'];
