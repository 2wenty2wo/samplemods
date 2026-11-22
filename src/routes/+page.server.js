import mods from '$lib/data.json';
import { entryPath } from '$lib/categories.js';
import { getAllReleases } from '$lib/server/releases.js';
import {
	latestReleasesOnePerEntry,
	selectNewestCatalogEntries
} from '$lib/latest-releases-strip.js';

/** @param {any} entry */
function toNewEntryRow(entry) {
	const thumb = entry.screenshots?.length
		? { kind: /** @type {const} */ ('shot'), src: entry.screenshots[0] }
		: entry.logo
			? { kind: /** @type {const} */ ('logo'), src: entry.logo }
			: { kind: /** @type {const} */ ('splash'), src: null };
	return {
		key: `added:${entry.id}`,
		entryId: entry.id,
		entryName: entry.name,
		entryPath: entryPath(entry),
		section: entry.section,
		status: entry.status ?? null,
		repo: entry.repo ?? null,
		thumb,
		tag: '',
		name: null,
		label: '',
		published_at: entry.added ?? null,
		html_url: null,
		body_html: '',
		excerpt: '',
		prerelease: false,
		truncated: false
	};
}

/** @type {import('./$types').PageServerLoad} */
export function load() {
	const latestReleases = latestReleasesOnePerEntry(getAllReleases(), 5);
	const newEntries = selectNewestCatalogEntries(mods, 5).map(toNewEntryRow);
	return {
		latestReleases,
		newEntries
	};
}
