import { SITE_NAME, SITE_ORIGIN } from './site.js';

/** Default Open Graph image path (under static/). */
export const DEFAULT_OG_IMAGE_PATH = '/og-default.png';
export const DEFAULT_OG_WIDTH = 1200;
export const DEFAULT_OG_HEIGHT = 630;
export const DEFAULT_OG_ALT = `${SITE_NAME}: mods, apps, games & tools for the Akai MPC Sample`;

/**
 * Absolute site URL. `pathname` may already include the kit `base` prefix.
 * @param {string} pathname
 * @param {string} [base='']
 */
export function absoluteUrl(pathname, base = '') {
	if (/^https?:\/\//i.test(pathname)) return pathname;
	const joined = `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
	const normalized = joined.replace(/\/{2,}/g, '/');
	return `${SITE_ORIGIN}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

/**
 * Absolute URL for a catalog media path like `media/<id>/…` or a rooted asset.
 * @param {string | null | undefined} rel
 * @param {string} [base='']
 */
export function absoluteAssetUrl(rel, base = '') {
	if (!rel) return null;
	if (/^https?:\/\//i.test(rel)) return rel;
	const path = `/${String(rel).replace(/^\/+/, '')}`;
	return absoluteUrl(path, base);
}

/**
 * Pick the best share image for an entry, falling back to the site default.
 * @param {{ screenshots?: string[], logo?: string | null }} entry
 * @param {string} [base='']
 */
export function entryShareImage(entry, base = '') {
	const shot = entry.screenshots?.[0];
	if (shot) {
		return {
			url: absoluteAssetUrl(shot, base),
			alt: `${entry.name ?? 'Entry'} screenshot`
		};
	}
	if (entry.logo) {
		return {
			url: absoluteAssetUrl(entry.logo, base),
			alt: `${entry.name ?? 'Entry'} logo`
		};
	}
	return {
		url: absoluteUrl(DEFAULT_OG_IMAGE_PATH, base),
		width: DEFAULT_OG_WIDTH,
		height: DEFAULT_OG_HEIGHT,
		alt: DEFAULT_OG_ALT
	};
}

/**
 * @param {string} [base='']
 */
export function defaultShareImage(base = '') {
	return {
		url: absoluteUrl(DEFAULT_OG_IMAGE_PATH, base),
		width: DEFAULT_OG_WIDTH,
		height: DEFAULT_OG_HEIGHT,
		alt: DEFAULT_OG_ALT
	};
}
