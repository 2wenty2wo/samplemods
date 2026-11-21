/**
 * Keep first occurrence per entryId (caller must pass newest-first list), up to limit.
 * @template {{ entryId: string }} T
 * @param {T[]} releases
 * @param {number} [limit=5]
 * @returns {T[]}
 */
export function latestReleasesOnePerEntry(releases, limit = 5) {
	const seen = new Set();
	const out = [];
	for (const rel of releases) {
		if (seen.has(rel.entryId)) continue;
		seen.add(rel.entryId);
		out.push(rel);
		if (out.length >= limit) break;
	}
	return out;
}

/**
 * Select the newest catalog entries by `added` ISO timestamp, excluding any entry
 * already shown in the Latest releases strip. Returns empty if no entries have `added`.
 * @template {{ id: string, name?: string, added?: string | null }} T
 * @param {T[]} entries
 * @param {Array<{ entryId?: string, id?: string }>} [excludedReleases=[]]
 * @param {number} [limit=5]
 * @returns {T[]}
 */
export function selectNewestCatalogEntries(entries, excludedReleases = [], limit = 5) {
	const excluded = new Set(
		excludedReleases.map((r) => r.entryId ?? r.id).filter(Boolean)
	);
	return entries
		.filter((entry) => {
			if (!entry?.added || excluded.has(entry.id)) return false;
			const ts = Date.parse(entry.added);
			return Number.isFinite(ts) && ts > 0;
		})
		.sort((a, b) => {
			const diff = Date.parse(/** @type {string} */ (b.added)) - Date.parse(/** @type {string} */ (a.added));
			if (diff !== 0) return diff;
			return String(a.name ?? a.id).localeCompare(String(b.name ?? b.id));
		})
		.slice(0, limit);
}
