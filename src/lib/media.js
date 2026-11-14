import { base } from '$app/paths';

/** @param {string | null | undefined} rel */
export function assetUrl(rel) {
	if (!rel) return null;
	if (/^https?:\/\//i.test(rel)) return rel;
	return `${base}/${String(rel).replace(/^\/+/, '')}`;
}
