import { getAllReleases } from '$lib/server/releases.js';
import { buildReleasesRss } from '$lib/rss.js';
import { base } from '$app/paths';

export const prerender = true;

/** @type {import('./$types').RequestHandler} */
export function GET() {
	const xml = buildReleasesRss(getAllReleases(), base);
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'max-age=3600'
		}
	});
}
