import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(root, 'data', 'watch.json');
const LABEL = 'release-watch';
const SITE_ORIGIN = 'https://samplemods.com';
const SECTION_SINGULAR = {
	mods: 'mod', apps: 'app', games: 'game', tools: 'tool', guides: 'guide', dev: 'dev'
};
const USER_AGENT = 'samplemods-release-watch';
const FETCH_MS = 20_000;

/** @param {string} section @param {string} id */
export function entryPageUrl(section, id) {
	const singular = SECTION_SINGULAR[section] ?? section;
	return `${SITE_ORIGIN}/${singular}/${id}/`;
}

/** @param {string} body @param {string} [contentType=''] */
function isXmlFeed(body, contentType = '') {
	const type = String(contentType).toLowerCase();
	const trimmed = String(body ?? '');
	return /xml|rss|atom/.test(type)
		|| /^\s*<\?xml/i.test(trimmed)
		|| /^\s*<(?:rss|feed|rdf:RDF)\b/i.test(trimmed);
}

/**
 * Parse up to `limit` feed items from an RSS/Atom XML body.
 * Returns `null` when the body is not an XML feed.
 * @param {string} body
 * @param {string} [contentType='']
 * @param {number} [limit=10]
 * @returns {Array<{ title: string, published_at: string | null, html_url: string | null }> | null}
 */
export function parseFeedItems(body, contentType = '', limit = 10) {
	const trimmed = String(body ?? '');
	if (!isXmlFeed(trimmed, contentType)) return null;
	const blocks = trimmed.match(/<item\b[\s\S]*?<\/item>/gi)
		?? trimmed.match(/<entry\b[\s\S]*?<\/entry>/gi)
		?? [];
	return blocks.slice(0, limit).map((item) => {
		const title = textOf(item, 'title') || '';
		const rawDate = textOf(item, 'pubDate') || textOf(item, 'updated') || textOf(item, 'published') || '';
		const parsed = rawDate ? new Date(rawDate) : null;
		const published_at = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : (rawDate || null);
		const html_url = linkOf(item) || null;
		return { title, published_at, html_url };
	}).filter((item) => item.title || item.html_url);
}

/**
 * Derive a human version tag from a file name or path:
 * strip path + extension, take from the first digit onward, '-' → ' ';
 * if no digit, use the stripped file name.
 * @param {string} title
 */
export function deriveVersionFromTitle(title) {
	const raw = String(title ?? '').trim().replace(/\/+$/, '');
	const base = raw.split('/').pop() || raw;
	const stem = base.replace(/\.(?:tar\.(?:gz|xz|bz2|zst)|[a-z0-9]{1,6})$/i, '') || base;
	const digitIdx = stem.search(/\d/);
	if (digitIdx === -1) return stem;
	return stem.slice(digitIdx).replace(/-+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} body
 * @param {string} [contentType='']
 */
export function fingerprint(body, contentType = '') {
	const type = String(contentType).toLowerCase();
	const trimmed = String(body ?? '');
	if (isXmlFeed(trimmed, contentType)) {
		const item = trimmed.match(/<item\b[\s\S]*?<\/item>/i)?.[0]
			?? trimmed.match(/<entry\b[\s\S]*?<\/entry>/i)?.[0];
		if (!item) throw new Error('XML feed has no <item> or <entry>');
		const title = textOf(item, 'title') || '';
		const date = textOf(item, 'pubDate') || textOf(item, 'updated') || textOf(item, 'published') || '';
		return `${title} | ${date}`;
	}

	const looksJson = /json/.test(type) || /^\s*[\[{]/.test(trimmed);
	if (looksJson) {
		try {
			return JSON.stringify(JSON.parse(trimmed));
		} catch {
			if (/json/.test(type)) throw new Error('Invalid JSON body');
		}
	}

	const text = trimmed
		.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return crypto.createHash('sha256').update(text).digest('hex');
}

/** @param {string} xml @param {string} tag */
function textOf(xml, tag) {
	const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
	if (!match) return '';
	return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').replace(/<[^>]+>/g, '').trim();
}

/** @param {string} xml */
function linkOf(xml) {
	const text = textOf(xml, 'link');
	if (text) return text;
	const href = xml.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
	if (href) return href[1].trim();
	const guid = textOf(xml, 'guid');
	return /^https?:\/\//i.test(guid) ? guid : '';
}

/**
 * @param {{ previous?: { url?: string, fingerprint?: string } | null, url: string, fingerprint: string }} input
 * @returns {{ action: 'baseline' | 'rebaseline' | 'changed' | 'unchanged', oldFingerprint?: string }}
 */
export function decideWatchUpdate({ previous, url, fingerprint: next }) {
	if (!previous) return { action: 'baseline' };
	if (previous.url !== url) return { action: 'rebaseline' };
	if (previous.fingerprint !== next) {
		return { action: 'changed', oldFingerprint: previous.fingerprint };
	}
	return { action: 'unchanged' };
}

/** @param {Record<string, unknown>} state */
export function serializeState(state) {
	const sorted = Object.fromEntries(
		Object.keys(state).sort().map((key) => [key, state[key]])
	);
	return `${JSON.stringify(sorted, null, 2)}\n`;
}

async function request(endpoint, token, method = 'GET', body) {
	const response = await fetch(`https://api.github.com/${endpoint}`, {
		method,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'X-GitHub-Api-Version': '2022-11-28'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(`GitHub ${endpoint}: HTTP ${response.status}: ${data.message ?? response.statusText}`);
		error.status = response.status;
		throw error;
	}
	return data;
}

async function optionalRequest(endpoint, token) {
	try { return await request(endpoint, token); }
	catch (error) { if (error.status === 404) return null; throw error; }
}

async function ensureLabel(token, repository) {
	if (!await optionalRequest(`repos/${repository}/labels/${encodeURIComponent(LABEL)}`, token)) {
		await request(`repos/${repository}/labels`, token, 'POST', {
			name: LABEL,
			color: 'fbca04',
			description: 'Upstream change detected for a repo-less catalog entry'
		});
	}
}

async function findOpenIssue(token, repository, title) {
	const q = `repo:${repository} is:issue is:open in:title "${title.replace(/"/g, '')}"`;
	const data = await request(`search/issues?q=${encodeURIComponent(q)}&per_page=5`, token);
	return (data.items ?? []).find((issue) => issue.title === title) ?? null;
}

function issueBody(entry, watchUrl, oldFingerprint, newFingerprint) {
	const page = entryPageUrl(entry.section, entry.id);
	return [
		`Upstream change detected for **${entry.record.name}**.`,
		'',
		`- Catalog page: ${page}`,
		`- Watch URL: ${watchUrl}`,
		`- Previous fingerprint: \`${oldFingerprint}\``,
		`- New fingerprint: \`${newFingerprint}\``,
		'',
		'Checklist:',
		'- [ ] update `version` / `released` / `about.md` / screenshots if needed'
	].join('\n');
}

async function openChangeIssue(token, repository, entry, watchUrl, oldFingerprint, newFingerprint) {
	const title = `Release watch: ${entry.record.name} changed upstream`;
	await ensureLabel(token, repository);
	if (await findOpenIssue(token, repository, title)) {
		console.log(`Issue already open: ${title}`);
		return;
	}
	await request(`repos/${repository}/issues`, token, 'POST', {
		title,
		body: issueBody(entry, watchUrl, oldFingerprint, newFingerprint),
		labels: [LABEL]
	});
	console.log(`Opened issue: ${title}`);
}

/**
 * @param {{ dryRun?: boolean, entries?: ReturnType<typeof readEntries>, statePath?: string, fetchImpl?: typeof fetch, now?: () => string, token?: string | null, repository?: string | null }} [options]
 */
export async function runWatch(options = {}) {
	const dryRun = options.dryRun === true || process.argv.includes('--dry-run');
	const statePath = options.statePath ?? STATE_PATH;
	const fetchImpl = options.fetchImpl ?? fetch;
	const now = options.now ?? (() => new Date().toISOString());
	const token = options.token ?? process.env.GITHUB_TOKEN ?? null;
	const repository = options.repository ?? process.env.GITHUB_REPOSITORY ?? null;
	const canOpenIssues = Boolean(token && repository) && !dryRun;

	const entries = (options.entries ?? readEntries()).filter((entry) => entry.record?.watch);
	/** @type {Record<string, { url: string, fingerprint: string, checked_at: string }>} */
	let state = {};
	if (fs.existsSync(statePath)) {
		try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')) ?? {}; }
		catch { state = {}; }
	}

	const nextState = { ...state };
	const results = [];

	for (const entry of entries) {
		const url = String(entry.record.watch);
		const previous = state[entry.id] ?? null;
		try {
			const response = await fetchImpl(url, {
				signal: AbortSignal.timeout(FETCH_MS),
				headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const body = await response.text();
			const contentType = response.headers.get('content-type') ?? '';
			const fp = fingerprint(body, contentType);
			const items = parseFeedItems(body, contentType);
			const decision = decideWatchUpdate({ previous, url, fingerprint: fp });
			results.push({ id: entry.id, name: entry.record.name, url, decision, fingerprint: fp });

			if (decision.action === 'unchanged') {
				if (items && !Array.isArray(previous?.items)) {
					nextState[entry.id] = { ...previous, items };
				}
				// Leave state untouched so an unchanged run produces no commit or redeploy.
				console.log(`${entry.id}: unchanged`);
				continue;
			}
			if (decision.action === 'changed') {
				console.log(`${entry.id}: CHANGED`);
				if (canOpenIssues) {
					// Throws on failure, so the old fingerprint is kept and the next run retries.
					await openChangeIssue(token, repository, entry, url, decision.oldFingerprint, fp);
				} else {
					console.log(`Would open issue: Release watch: ${entry.record.name} changed upstream`);
				}
			} else {
				console.log(`${entry.id}: ${decision.action === 'baseline' ? 'baseline recorded' : 'watch URL changed; re-baselined'}`);
			}
			nextState[entry.id] = { url, fingerprint: fp, checked_at: now(), ...(items ? { items } : {}) };
		} catch (error) {
			console.warn(`${entry.id}: watch failed (${error.message}); keeping previous state`);
			results.push({ id: entry.id, name: entry.record.name, url, error: error.message });
		}
	}

	if (!dryRun) {
		fs.writeFileSync(statePath, serializeState(nextState));
	} else {
		console.log('Dry run: state not written, no issues opened.');
	}

	return { results, state: nextState, dryRun };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	runWatch().catch((error) => {
		console.warn(`watch.js: ${error.message}`);
		process.exitCode = 0;
	});
}
