/** @type {Record<string, string>} */
export const SECTION_LABELS = {
	mods: 'Mods', apps: 'Apps', games: 'Games', tools: 'Tools', guides: 'Guides', dev: 'Developers'
};

export const SECTION_GLOW = {
	mods: '#FF4D7D', apps: '#2EE65A', games: '#C8F526',
	tools: '#B07CFF', guides: '#E8C811', dev: '#1DA1DB'
};

export const SECTION_TINTS = {
	mods: '#E8A0B4', apps: '#A8E8B8', games: '#D8E8A0',
	tools: '#C8B0E8', guides: '#E8D888', dev: '#98CEE8'
};

/** @type {Record<string, string>} */
export const INSTALL_LABELS = {
	'sd-card': 'SD card',
	'web-installer': 'Web installer',
	'usb-midi': 'USB-MIDI',
	none: ''
};

export const SECTIONS = Object.keys(SECTION_LABELS);

/** @param {string} section */
export function sectionLabel(section) {
	return SECTION_LABELS[section] ?? section;
}

/** @param {string} section */
export function sectionGlow(section) {
	return SECTION_GLOW[section] ?? '#FF9E2C';
}

/** @param {string} section */
export function sectionTint(section) {
	return SECTION_TINTS[section] ?? '#BEBBB6';
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
