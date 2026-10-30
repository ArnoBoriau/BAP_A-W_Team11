// Redirects to a fresh link for a file uploaded to Notion. Those links expire after an hour, so pages link here
// instead of to Notion directly. The redirect itself is cached for half an hour (see routeRules in astro.config.mjs).
import type { APIRoute } from 'astro';
import { blockFileUrl, coverUrl } from '../../../../notion/client';
import { PROPERTIES } from '../../../../notion/config';

const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params }) => {
	const { kind, id = '' } = params;
	if (!NOTION_ID.test(id)) return new Response('Not found', { status: 404 });

	const lookup = kind === 'block' ? blockFileUrl(id) : kind === 'cover' ? coverUrl(id, PROPERTIES.logbook.cover) : undefined;
	const url = await lookup?.catch(() => undefined);
	if (!url) return new Response('Not found', { status: 404 });
	return new Response(null, { status: 302, headers: { Location: url } });
};
