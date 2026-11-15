import mods from '$lib/data.json';
import { buildSitemapEntries, renderSitemapXml } from '$lib/sitemap.js';
import { base } from '$app/paths';

export const prerender = true;

/** @type {import('./$types').RequestHandler} */
export function GET() {
	const xml = renderSitemapXml(buildSitemapEntries(mods, base));
	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=3600'
		}
	});
}
