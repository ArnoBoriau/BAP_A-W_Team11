// Notion calls this whenever something changes in a page the integration can see.
// It clears the cached pages, so the change shows up on the site within seconds.
//
// Setup: in the integration's Webhooks tab, subscribe https://<site>/api/notion-webhook. Notion then sends a
// verification token once; it is printed in the Vercel logs. Paste it back in Notion to verify, and save it as the
// NOTION_WEBHOOK_SECRET environment variable so every later call can be checked.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIRoute } from 'astro';
import { NOTION_WEBHOOK_SECRET } from 'astro:env/server';
import { clearCache } from '../../notion/cache';

const signed = (body: string, signature: string, secret: string) => {
	const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
	const given = Buffer.from(signature);
	return expected.length === given.length && timingSafeEqual(expected, given);
};

export const POST: APIRoute = async ({ request, cache }) => {
	const body = await request.text();
	let payload: { verification_token?: string; type?: string };
	try {
		payload = JSON.parse(body);
	} catch {
		return new Response('Bad request', { status: 400 });
	}

	// The one-time verification request when the subscription is created.
	if (payload.verification_token) {
		console.log(`Notion webhook verification token: ${payload.verification_token}`);
		return new Response('OK');
	}

	if (!NOTION_WEBHOOK_SECRET) return new Response('Webhook secret not configured', { status: 503 });
	if (!signed(body, request.headers.get('x-notion-signature') ?? '', NOTION_WEBHOOK_SECRET)) {
		return new Response('Invalid signature', { status: 401 });
	}

	clearCache();
	if (cache.enabled) await cache.invalidate({ tags: ['notion'] });
	return new Response('OK');
};
