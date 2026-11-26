import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

/** Per-launcher README table configs. Keep SampleBoot fields byte-stable. */
export const COMPAT_LAUNCHERS = {
	sampleboot: {
		readme: 'sampleboot.md',
		source: 'https://github.com/pxcm/SampleBoot#works-with',
		heading: { depth: 2, text: 'Works with' },
		columns: ['System', 'Versions', 'Status', 'Checked by', 'Notes', 'From'],
		linkColumn: 5,
		nameColumn: 0,
		mapRow(cells) {
			return {
				versions: plainText(cells[1].tokens).trim(),
				status: plainText(cells[2].tokens).trim(),
				checked_by: plainText(cells[3].tokens).trim(),
				notes: plainText(cells[4].tokens).trim()
			};
		}
	},
	mpselector: {
		readme: 'mpselector.md',
		sourceRepo: 'https://github.com/fomoPhil/mpselector',
		heading: { depth: 3, match: /^Opened on Akai/ },
		columns: ['Firmware', 'Version'],
		linkColumn: 0,
		nameColumn: 0,
		mapRow(cells) {
			return {
				versions: plainText(cells[1].tokens).trim(),
				status: 'Works',
				checked_by: 'Tested',
				notes: ''
			};
		}
	}
};

function plainText(tokens) {
	return tokens.map((token) => {
		if (token.type === 'br') return ' ';
		if (token.type === 'html') return '';
		return token.tokens ? plainText(token.tokens) : token.text ?? '';
	}).join('');
}

function websiteKey(url) {
	return url.host + url.pathname.replace(/\/+$/, '') + url.search + url.hash;
}

/** GitHub heading anchor (punctuation stripped, spaces to hyphens). */
function githubAnchor(text) {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

function matchingId(href, name, catalogEntries) {
	const url = URL.parse(href);
	if (!url || !['https:', 'http:'].includes(url.protocol)) return;
	// Allow repo subpaths like /releases so Melodee-style links still match.
	const repo = url.hostname === 'github.com'
		? url.pathname.match(/^\/([^/]+\/[^/]+)(?:\/|$)/)?.[1].toLowerCase()
		: undefined;
	const repoMatches = repo ? catalogEntries.filter(({ record }) => record.repo?.toLowerCase() === repo) : [];
	const matches = repoMatches.length ? repoMatches : catalogEntries.filter(({ record }) => {
		const website = record.website && URL.parse(record.website);
		return website && websiteKey(website) === websiteKey(url);
	});
	if (matches.length === 1) return matches[0].id;
	return matches.find(({ record }) => record.name?.toLowerCase() === name.toLowerCase())?.id;
}

function headingIndex(tokens, heading) {
	return tokens.findIndex((token) => {
		if (token.type !== 'heading' || token.depth !== heading.depth) return false;
		if (heading.text != null) return token.text === heading.text;
		return heading.match.test(token.text);
	});
}

function parseEntries(markdown, catalogEntries, launcherId, config) {
	const tokens = marked.lexer(markdown, { gfm: true });
	const heading = headingIndex(tokens, config.heading);
	if (heading === -1) return { source: resolveSource(config, null), entries: {} };
	const headingText = tokens[heading].text;
	const next = tokens.findIndex((token, i) => i > heading && token.type === 'heading' && token.depth <= config.heading.depth);
	const section = tokens.slice(heading + 1, next === -1 ? undefined : next);
	const table = section.find((token) => token.type === 'table'
		&& token.header.length === config.columns.length && token.header.every((cell, i) => cell.text === config.columns[i]));
	const entries = {};
	for (const cells of table?.rows ?? []) {
		const nameCell = cells[config.nameColumn];
		const linkCell = cells[config.linkColumn];
		const link = linkCell.tokens.find((token) => token.type === 'link');
		const name = plainText(nameCell.tokens).trim();
		const id = link && matchingId(link.href, name, catalogEntries);
		if (!id || id === launcherId) continue;
		entries[id] = config.mapRow(cells);
	}
	return { source: resolveSource(config, headingText), entries };
}

function resolveSource(config, headingText) {
	if (config.source) return config.source;
	const anchor = headingText ? githubAnchor(headingText) : '';
	return config.sourceRepo + (anchor ? '#' + anchor : '');
}

function validateSnapshot(snapshot, config, label) {
	const date = Date.parse(snapshot?.updated);
	const sourceOk = config.source
		? snapshot?.source === config.source
		: typeof snapshot?.source === 'string'
			&& snapshot.source.startsWith(config.sourceRepo + '#')
			&& snapshot.source.length > config.sourceRepo.length + 1;
	if (!sourceOk || !Number.isFinite(date)
		|| new Date(date).toISOString().slice(0, 10) !== snapshot.updated
		|| !snapshot.entries || typeof snapshot.entries !== 'object' || Array.isArray(snapshot.entries)
		|| !Object.entries(snapshot.entries).every(([id, row]) =>
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
			&& ['versions', 'status', 'checked_by', 'notes'].every((key) => typeof row?.[key] === 'string'))) {
		throw new Error('Invalid ' + label + ' compatibility snapshot.');
	}
}

export function readCompat(dataDir) {
	const file = path.join(dataDir, 'compat.json');
	if (!fs.existsSync(file)) return null;
	const data = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new Error('Invalid compatibility snapshot.');
	}
	for (const [id, config] of Object.entries(COMPAT_LAUNCHERS)) {
		if (!Object.hasOwn(data, id)) continue;
		validateSnapshot(data[id], config, id === 'sampleboot' ? 'SampleBoot' : id);
	}
	return data;
}

/** @deprecated Prefer readCompat; kept for SampleBoot-only callers. */
export function readSampleBootCompat(dataDir) {
	const data = readCompat(dataDir);
	return data?.sampleboot ?? null;
}

export function updateCompat(dataDir, catalogEntries, now = new Date()) {
	const file = path.join(dataDir, 'compat.json');
	const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
	if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
		throw new Error('Invalid compatibility snapshot.');
	}
	for (const [id, config] of Object.entries(COMPAT_LAUNCHERS)) {
		if (!Object.hasOwn(existing, id)) continue;
		validateSnapshot(existing[id], config, id === 'sampleboot' ? 'SampleBoot' : id);
	}

	const updated = now.toISOString().slice(0, 10);
	let changed = false;
	const next = { ...existing };

	for (const [id, config] of Object.entries(COMPAT_LAUNCHERS)) {
		const readme = path.join(dataDir, 'readme', config.readme);
		if (!fs.existsSync(readme)) continue;
		const parsed = parseEntries(fs.readFileSync(readme, 'utf8'), catalogEntries, id, config);
		if (!Object.keys(parsed.entries).length) {
			const label = id === 'sampleboot' ? 'SampleBoot' : id;
			const heading = config.heading.text ?? String(config.heading.match);
			console.warn('warn: ' + label + ' README has no matching "' + heading + '" rows; keeping compatibility data.');
			continue;
		}
		if (JSON.stringify(existing[id]?.entries) === JSON.stringify(parsed.entries)
			&& existing[id]?.source === parsed.source) continue;
		next[id] = { source: parsed.source, updated, entries: parsed.entries };
		changed = true;
	}

	if (!changed) return;

	const temporary = file + '.tmp';
	fs.writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n');
	fs.renameSync(temporary, file);
}

/** @deprecated Prefer updateCompat; updates every configured launcher. */
export function updateSampleBootCompat(dataDir, catalogEntries, now = new Date()) {
	return updateCompat(dataDir, catalogEntries, now);
}
