import mods from '$lib/data.json';
import details from '$lib/server/details.json';
import { entryPath } from '$lib/categories.js';
import { releaseDisplayLabel } from '$lib/release-label.js';

/**
 * Strip HTML tags and headings to build a clean one-line plain-text excerpt.
 * @param {string | null | undefined} html
 * @param {string} [fallback='']
 * @returns {string}
 */
export function releaseExcerpt(html) {
	if (!html || !String(html).trim()) return '';
	const text = String(html)
		.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&')
		.replace(/\s+/g, ' ')
		.trim();
	return text;
}

/**
 * Flatten and sort all releases across every catalog entry (newest first).
 * @param {Array<any>} [entries=mods]
 * @param {Record<string, any>} [entryDetails=details]
 */
export function getAllReleases(entries = mods, entryDetails = details) {
	/** @type {Array<{
	 *   key: string,
	 *   entryId: string,
	 *   entryName: string,
	 *   entryPath: string,
	 *   section: string,
	 *   status: string | null,
	 *   repo: string | null,
	 *   thumb: { kind: 'shot' | 'logo' | 'splash', src: string | null },
	 *   tag: string,
	 *   name: string | null,
	 *   label: string,
	 *   published_at: string | null,
	 *   day: string,
	 *   html_url: string | null,
	 *   body_html: string,
	 *   excerpt: string,
	 *   prerelease: boolean,
	 *   truncated: boolean
	 * }>} */
	const list = [];

	for (const entry of entries) {
		const rels = entryDetails[entry.id]?.releases ?? [];
		const thumb = entry.screenshots?.length
			? { kind: /** @type {const} */ ('shot'), src: entry.screenshots[0] }
			: entry.logo
				? { kind: /** @type {const} */ ('logo'), src: entry.logo }
				: { kind: /** @type {const} */ ('splash'), src: null };
		const path = entryPath(entry);

		for (const rel of rels) {
			const tag = String(rel.tag ?? '');
			const rawName = rel.name && rel.name !== tag ? String(rel.name) : null;
			const label = rel.label ?? releaseDisplayLabel(tag, rel.name);
			const published = rel.published_at ?? null;
			const day = published ? String(published).slice(0, 10) : 'Unknown';
			list.push({
				key: `${entry.id}:${tag}:${published ?? ''}`,
				entryId: entry.id,
				entryName: entry.name,
				entryPath: path,
				section: entry.section,
				status: entry.status ?? null,
				repo: entry.repo ?? null,
				thumb,
				tag,
				name: rawName,
				label,
				published_at: published,
				day,
				html_url: rel.html_url ?? null,
				body_html: rel.body_html ?? '',
				excerpt: releaseExcerpt(rel.body_html),
				prerelease: Boolean(rel.prerelease),
				truncated: Boolean(rel.truncated)
			});
		}
	}

	list.sort((a, b) => {
		const at = a.published_at ? Date.parse(a.published_at) : 0;
		const bt = b.published_at ? Date.parse(b.published_at) : 0;
		return bt - at || a.entryName.localeCompare(b.entryName);
	});

	return list;
}
