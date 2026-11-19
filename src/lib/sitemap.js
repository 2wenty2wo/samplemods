import { entryPath } from './categories.js';
import { absoluteUrl } from './seo.js';
import { SITE_ORIGIN } from './site.js';

/**
 * @param {{ pushed_at?: string | null, released?: string | null, latest_release?: { published_at?: string | null } | null }} entry
 * @returns {string | null}
 */
export function entryLastmod(entry) {
	const raw = entry.pushed_at || entry.released || entry.latest_release?.published_at || null;
	if (!raw) return null;
	const day = String(raw).slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * Canonical sitemap URLs: home, about, submit, and every entry (not legacy /mod/ stubs).
 * @param {Array<{ id: string, section: string, pushed_at?: string | null, released?: string | null, latest_release?: { published_at?: string | null } | null }>} entries
 * @param {string} [base='']
 */
export function buildSitemapEntries(entries, base = '') {
	/** @type {Array<{ loc: string, lastmod?: string }>} */
	const pages = [
		{ loc: absoluteUrl('/', base) },
		{ loc: absoluteUrl('/releases/', base) },
		{ loc: absoluteUrl('/about/', base) },
		{ loc: absoluteUrl('/submit/', base) }
	];

	for (const entry of [...entries].sort((a, b) => a.id.localeCompare(b.id))) {
		const item = { loc: absoluteUrl(entryPath(entry), base) };
		const lastmod = entryLastmod(entry);
		if (lastmod) item.lastmod = lastmod;
		pages.push(item);
	}

	return pages;
}

/**
 * @param {Array<{ loc: string, lastmod?: string }>} pages
 */
export function renderSitemapXml(pages) {
	const body = pages
		.map((page) => {
			const last = page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : '';
			return `  <url>\n    <loc>${page.loc}</loc>${last}\n  </url>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export { SITE_ORIGIN };
