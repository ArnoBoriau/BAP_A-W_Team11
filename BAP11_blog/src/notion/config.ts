// How our Notion databases (BAP → Behind the scenes → Databases) map onto the site.
//
// Property names are matched case-insensitively; the first name that exists in the database wins.
// Run `npm run notion:inspect` to see the real property names and values, and adjust the lists below.
// Select values are matched the same way (lower case, trimmed) against the alias tables.

export const PROPERTIES = {
	logbook: {
		title: ['Title', 'Name'],
		date: ['Date'],
		description: ['Summary', 'Description'],
		pillar: ['Pillar'],
		tags: ['Tags'],
		authors: ['Author', 'Authors'],
		cover: ['Cover'],
		slug: ['Slug'],
		// When this checkbox exists, only checked pages are published on the site.
		published: ['Published', 'On website'],
	},
	time: {
		task: ['What did you do', 'Task', 'Name'],
		date: ['Logged on', 'Date'],
		member: ['Person', 'Who'],
		hours: ['Hours'],
		pillar: ['Pillar'],
	},
	// One database for both the task board and the dates: the Group decides which is which.
	planning: {
		title: ['Task', 'Name'],
		date: ['Due', 'Date'],
		group: ['Group', 'Status'],
		owners: ['Owner', 'Owners', 'Assignee'],
		phase: ['Phase', 'Week'],
		notes: ['Notes'],
		pillar: ['Pillar'],
		time: ['Time'],
	},
	team: {
		name: ['Name'],
		role: ['Role'],
		pillar: ['Main pillar', 'Pillar'],
		responsibilities: ['Responsibilities'],
		chronotype: ['Kind of person'],
		order: ['Order'],
		email: ['Email'],
	},
} as const;

export const PILLAR_ALIASES: Record<string, string> = {
	ux: 'ux',
	design: 'design',
	dev: 'dev',
	development: 'dev',
	general: 'general',
};

export const TAG_ALIASES: Record<string, string> = {
	research: 'research',
	process: 'process',
	'feedback client': 'feedback-client',
	'expert talk': 'expert-talk',
	ai: 'ai',
	decision: 'decision',
	result: 'result',
	planning: 'planning',
};

// Planning rows in these groups are dates (milestones). A 🏆 icon or "jury" in the title makes it the jury.
export const MILESTONE_GROUPS: Record<string, string> = {
	deadlines: 'deadline',
	meetings: 'event',
};

// Every other planning row is a task on the board.
export const TASK_GROUPS: Record<string, string> = {
	'not started': 'todo',
	'in progress': 'doing',
	'to review': 'doing',
	done: 'done',
};

export const CHRONOTYPE_ALIASES: Record<string, string> = {
	'morning person': 'morning',
	'evening person': 'evening',
};
