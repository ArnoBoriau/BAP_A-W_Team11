import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getEntries } from '../lib/data';

export async function GET(context) {
	const entries = await getEntries();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: entries.map((entry) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.date,
			categories: [entry.data.pillar, ...entry.data.tags],
			link: `/logbook/${entry.id}/`,
		})),
	});
}
