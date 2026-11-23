import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const source = 'https://github.com/pxcm/SampleBoot#works-with';
const columns = ['System', 'Versions', 'Status', 'Checked by', 'Notes', 'From'];

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

function matchingId(href, name, catalogEntries) {
	const url = URL.parse(href);
	if (!url || !['https:', 'http:'].includes(url.protocol)) return;
	const repo = url.hostname === 'github.com' ? url.pathname.match(/^\/([^/]+\/[^/]+)\/?$/)?.[1].toLowerCase() : undefined;
	const repoMatches = repo ? catalogEntries.filter(({ record }) => record.repo?.toLowerCase() === repo) : [];
	const matches = repoMatches.length ? repoMatches : catalogEntries.filter(({ record }) => {
		const website = record.website && URL.parse(record.website);
		return website && websiteKey(website) === websiteKey(url);
	});
	if (matches.length === 1) return matches[0].id;
	return matches.find(({ record }) => record.name?.toLowerCase() === name.toLowerCase())?.id;
}

function parseEntries(markdown, catalogEntries) {
	const tokens = marked.lexer(markdown, { gfm: true });
	const heading = tokens.findIndex((token) => token.type === 'heading' && token.depth === 2 && token.text === 'Works with');
	if (heading === -1) return {};
	const next = tokens.findIndex((token, i) => i > heading && token.type === 'heading' && token.depth <= 2);
	const section = tokens.slice(heading + 1, next === -1 ? undefined : next);
	const table = section.find((token) => token.type === 'table'
		&& token.header.length === columns.length && token.header.every((cell, i) => cell.text === columns[i]));
	const entries = {};
	for (const [system, versions, status, checkedBy, notes, from] of table?.rows ?? []) {
		const link = from.tokens.find((token) => token.type === 'link');
		const id = link && matchingId(link.href, plainText(system.tokens).trim(), catalogEntries);
		if (!id || id === 'sampleboot') continue;
		entries[id] = {
			versions: plainText(versions.tokens).trim(),
			status: plainText(status.tokens).trim(),
			checked_by: plainText(checkedBy.tokens).trim(),
			notes: plainText(notes.tokens).trim()
		};
	}
	return entries;
}

export function readSampleBootCompat(dataDir) {
	const file = path.join(dataDir, 'compat.json');
	if (!fs.existsSync(file)) return null;
	const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'))?.sampleboot;
	const date = Date.parse(snapshot?.updated);
	if (snapshot?.source !== source || !Number.isFinite(date)
		|| new Date(date).toISOString().slice(0, 10) !== snapshot.updated
		|| !snapshot.entries || typeof snapshot.entries !== 'object' || Array.isArray(snapshot.entries)
		|| !Object.entries(snapshot.entries).every(([id, row]) =>
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
			&& ['versions', 'status', 'checked_by', 'notes'].every((key) => typeof row?.[key] === 'string'))) {
		throw new Error('Invalid SampleBoot compatibility snapshot.');
	}
	return snapshot;
}

export function updateSampleBootCompat(dataDir, catalogEntries, now = new Date()) {
	const readme = path.join(dataDir, 'readme', 'sampleboot.md');
	const entries = fs.existsSync(readme) ? parseEntries(fs.readFileSync(readme, 'utf8'), catalogEntries) : {};
	if (!Object.keys(entries).length) {
		console.warn('warn: SampleBoot README has no matching "Works with" rows; keeping compatibility data.');
		return;
	}
	if (JSON.stringify(readSampleBootCompat(dataDir)?.entries) === JSON.stringify(entries)) return;

	const updated = now.toISOString().slice(0, 10);
	const file = path.join(dataDir, 'compat.json');
	const temporary = file + '.tmp';
	fs.writeFileSync(temporary, JSON.stringify({ sampleboot: { source, updated, entries } }, null, 2) + '\n');
	fs.renameSync(temporary, file);
}
