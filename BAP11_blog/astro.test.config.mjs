// @ts-check

import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

import { defineConfig, envField, memoryCache } from 'astro/config';

const notionDatabase = () => envField.string({ context: 'server', access: 'secret', optional: true });

// https://astro.build/config
export default defineConfig({
	// Replace with the real URL once the site is deployed.
	site: 'https://example.com',
	// Pages are rendered on request, so content from Notion is live.
	output: 'server',
	adapter: node({ mode: 'standalone' }), root: '/Users/arnoboriau/Documents/HOWEST/DEVINE/Semester07/BAP/BAP_code/BAP11_blog', outDir: '/private/tmp/claude-501/-Users-arnoboriau-Documents-HOWEST-DEVINE-Semester07-BAP-BAP-code/7e6eff4d-89ce-482f-9e70-733fd0932bee/scratchpad/test-dist',
	integrations: [mdx()],

	// Vercel's CDN keeps each page for a minute and refreshes it in the background.
	// The Notion webhook (src/pages/api/notion-webhook.ts) clears the "notion" tag as soon as something changes.
	cache: { provider: memoryCache() },
	routeRules: {
		'/': { maxAge: 60, swr: 600, tags: ['notion'] },
		'/[...path]': { maxAge: 60, swr: 600, tags: ['notion'] },
		// Signed Notion file links are valid for an hour.
		'/notion/file/[...path]': { maxAge: 1800 },
	},

	env: {
		schema: {
			NOTION_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			NOTION_LOGBOOK_DB: notionDatabase(),
			NOTION_TIME_DB: notionDatabase(),
			NOTION_PLANNING_DB: notionDatabase(),
			NOTION_TEAM_DB: notionDatabase(),
			NOTION_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
		},
	},
});
