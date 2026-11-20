/**
 * Display label for a release: keep tags that already look like versions;
 * otherwise prefer the release title/name when present.
 *
 * @param {string | null | undefined} tag
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function releaseDisplayLabel(tag, name) {
	const t = String(tag ?? '').trim();
	const n = String(name ?? '').trim();
	if (/\d/.test(t)) return t || n;
	if (n) return n;
	return t;
}
