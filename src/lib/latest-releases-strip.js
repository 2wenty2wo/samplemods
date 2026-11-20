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
