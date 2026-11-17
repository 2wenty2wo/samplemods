/** @type {Record<string, string>} */
export const SECTION_LABELS = {
	mods: 'Mods', apps: 'Apps', games: 'Games', tools: 'Tools', guides: 'Guides', dev: 'Developers'
};

/** @type {Record<string, string>} */
export const SECTION_SINGULAR = {
	mods: 'mod',
	apps: 'app',
	games: 'game',
	tools: 'tool',
	guides: 'guide',
	dev: 'dev'
};

/** @type {Record<string, string>} */
export const SECTION_SINGULAR_LABELS = {
	mods: 'MOD',
	apps: 'APP',
	games: 'GAME',
	tools: 'TOOL',
	guides: 'GUIDE',
	dev: 'DEV'
};

/** @type {Record<string, string>} */
export const SECTION_EXPLAINERS = {
	mods: 'Mods add features to the stock MPC Sample firmware, keeping its familiar workflow.',
	apps: 'Apps run their own workflow and interface on the MPC Sample.',
	games: 'Games and game runtimes playable directly on the MPC Sample.',
	tools: 'Launchers, emulators and computer or browser companions for the MPC Sample.',
	guides: 'Handbooks, hardware references and step-by-step modding instructions.',
	dev: 'SDKs, libraries and platform source code for building your own MPC Sample projects.'
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
	'boot-thingy': 'Boot Thingy',
	'web-installer': 'Web installer',
	ssh: 'SSH',
	desktop: 'Desktop',
	'usb-midi': 'USB-MIDI',
	none: ''
};

/** @type {Record<string, string>} */
export const RUNS_ON_LABELS = {
	device: 'MPC Sample',
	desktop: 'Desktop',
	browser: 'Browser',
	docs: 'Docs'
};

/** @type {Record<string, string>} */
export const AUDIENCE_LABELS = {
	musician: 'Musicians',
	player: 'Players',
	developer: 'Developers',
	curious: 'Curious'
};

export const SECTIONS = Object.keys(SECTION_LABELS);

/** Catalog YAML filename per section (matches scripts/catalog.js). */
export const SECTION_YAML_FILES = {
	mods: 'mod.yaml',
	apps: 'app.yaml',
	games: 'game.yaml',
	tools: 'tool.yaml',
	guides: 'guide.yaml',
	dev: 'dev.yaml'
};

export const CATALOG_GITHUB_REPO = '2wenty2wo/samplemods';

const STARTER_YAML = `name: My Project
description: A concise description of what the project does and where it runs.
repo: owner/repository
# Or omit repo and set website instead:
# website: https://example.com/project
author: owner
install: sd-card
runs_on: [device]
audience: [musician]
# tags: [example]
`;

/** @param {string} section */
export function sectionYamlFile(section) {
	return SECTION_YAML_FILES[section] ?? `${sectionSingular(section)}.yaml`;
}

/**
 * GitHub web editor for an existing entry YAML (forks + Propose changes for non-collaborators).
 * @param {{ id: string, section: string }} entry
 */
export function githubEditEntryUrl(entry) {
	const file = sectionYamlFile(entry.section);
	return `https://github.com/${CATALOG_GITHUB_REPO}/edit/main/data/${entry.section}/${entry.id}/${file}`;
}

/**
 * GitHub "Create new file" URL with starter YAML for a catalog section.
 * @param {string} section
 * @param {string} [entryId='your-id']
 */
export function githubNewEntryUrl(section, entryId = 'your-id') {
	const file = sectionYamlFile(section);
	const id = String(entryId || 'your-id').trim() || 'your-id';
	const params = new URLSearchParams({
		filename: `${id}/${file}`,
		value: STARTER_YAML
	});
	return `https://github.com/${CATALOG_GITHUB_REPO}/new/main/data/${section}?${params}`;
}

/** Issue form for people who cannot open a PR (no GitHub account / prefer a form). */
export function githubChangeEntryIssueUrl(entryUrl = '') {
	const params = new URLSearchParams({ template: 'change-entry.yml' });
	if (entryUrl) params.set('entry', entryUrl);
	return `https://github.com/${CATALOG_GITHUB_REPO}/issues/new?${params}`;
}

export function githubNewEntryIssueUrl() {
	return `https://github.com/${CATALOG_GITHUB_REPO}/issues/new?template=new-entry.yml`;
}

/** @param {string} section */
export function sectionLabel(section) {
	return SECTION_LABELS[section] ?? section;
}

/** @param {string} section */
export function sectionSingular(section) {
	return SECTION_SINGULAR[section] ?? section;
}

/** @param {string} section */
export function sectionSingularLabel(section) {
	return SECTION_SINGULAR_LABELS[section] ?? String(section).toUpperCase();
}

/** @param {string} section */
export function sectionExplainer(section) {
	return SECTION_EXPLAINERS[section] ?? '';
}

/**
 * Resolve a ?section= query parameter (singular or plural) to the canonical section key.
 * @param {string | null | undefined} param
 * @returns {string}
 */
export function sectionFromParam(param) {
	if (!param) return '';
	const clean = String(param).trim().toLowerCase();
	if (SECTION_LABELS[clean]) return clean;
	for (const [sec, sing] of Object.entries(SECTION_SINGULAR)) {
		if (sing === clean) return sec;
	}
	if (clean === 'developers' || clean === 'developer') return 'dev';
	return '';
}

/**
 * Canonical detail path with trailing slash, e.g. "/game/mp-doom/".
 * @param {{ id: string, section: string }} entry
 */
export function entryPath(entry) {
	return `/${sectionSingular(entry.section)}/${entry.id}/`;
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

/** @param {string} target */
export function runsOnLabel(target) {
	return RUNS_ON_LABELS[target] ?? target;
}

/** @param {string} aud */
export function audienceLabel(aud) {
	return AUDIENCE_LABELS[aud] ?? aud;
}

/**
 * Hostname for CTA / credit copy (strips www.).
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function hostnameOf(url) {
	if (!url) return null;
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

/**
 * Card/hero chip for any non-free price (paid or pay-what-you-want).
 * @param {string | null | undefined} price
 * @returns {string | null}
 */
export function priceBadge(price) {
	if (!price || price === 'free') return null;
	return '$ Paid';
}

/**
 * Quick-facts price line, e.g. "Pay what you want · Suggested €9.99" or "Free".
 * @param {string | null | undefined} price
 * @param {string | null | undefined} note
 */
export function priceFact(price, note) {
	const base =
		!price || price === 'free'
			? 'Free'
			: price === 'paid'
				? 'Paid'
				: price === 'pay-what-you-want'
					? 'Pay what you want'
					: price;
	return note ? `${base} · ${note}` : base;
}

/**
 * Quick-facts source line.
 * @param {string | null | undefined} source
 */
export function sourceFact(source) {
	return source === 'closed' ? 'Closed source' : 'Open source';
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
