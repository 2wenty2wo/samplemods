/** @type {Record<string, string>} */
export const CATEGORY_LABELS = {
	'os-mod': 'OS mod',
	addon: 'Add-on',
	app: 'App',
	game: 'Game',
	'dev-tool': 'Dev tool',
	guide: 'Guide',
	'external-tool': 'External tool'
};

/** Pad glow / hardware button lit colours per category (sampled from MPC Sample LEDs & buttons). */
export const CATEGORY_GLOW = {
	'os-mod': '#FF4D7D',
	addon: '#FF9E2C',
	app: '#2EE65A',
	game: '#C8F526',
	'dev-tool': '#1DA1DB',
	guide: '#E8C811',
	'external-tool': '#B07CFF'
};

/** Soft fills for initials placeholders on pad cards. */
export const CATEGORY_TINTS = {
	'os-mod': '#E8A0B4',
	addon: '#E8C89A',
	app: '#A8E8B8',
	game: '#D8E8A0',
	'dev-tool': '#98CEE8',
	guide: '#E8D888',
	'external-tool': '#C8B0E8'
};

/** @type {Record<string, string>} */
export const INSTALL_LABELS = {
	'sd-card': 'SD card',
	'web-installer': 'Web installer',
	'usb-midi': 'USB-MIDI',
	none: ''
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS);

/** @param {string} category */
export function categoryLabel(category) {
	return CATEGORY_LABELS[category] ?? category;
}

/** @param {string} category */
export function categoryGlow(category) {
	return CATEGORY_GLOW[category] ?? '#FF9E2C';
}

/** @param {string} category */
export function categoryTint(category) {
	return CATEGORY_TINTS[category] ?? '#BEBBB6';
}

/**
 * @param {string | null | undefined} install
 * @returns {string | null}
 */
export function installLabel(install) {
	if (!install || install === 'none') return null;
	return INSTALL_LABELS[install] ?? install;
}

/**
 * Initials after stripping leading MPC/Sample prefixes so
 * "MPC Sample DOOM" → "DO", not "MS".
 * @param {string} name
 */
export function initials(name) {
	let cleaned = String(name).trim();
	cleaned = cleaned.replace(/^(mpc\s+sample|mpc|mp)\s+/i, '').trim();
	if (!cleaned) cleaned = String(name).trim();

	const parts = cleaned.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	if (parts.length === 1 && parts[0].length >= 2) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return (parts[0]?.[0] ?? '?').toUpperCase();
}
