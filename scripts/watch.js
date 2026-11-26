import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';
import { releaseDisplayLabel } from '../src/lib/release-label.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = path.join(root, 'data', 'watch.json');
const LABEL = 'release-watch';
const LABEL_DESCRIPTION = 'Upstream release or page change detected for a catalog entry';
const SITE_ORIGIN = 'https://samplemods.com';
const SECTION_SINGULAR = {
	mods: 'mod', apps: 'app', games: 'game', tools: 'tool', guides: 'guide', dev: 'dev'
};
const USER_AGENT = 'samplemods-release-watch';
const FETCH_MS = 20_000;
const PAGE_TEXT_CAP = 8 * 1024;

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
 * Release rows for an entry without a repo: its watch feed items, or else one row from the
 * hand-kept version/released. Alpha, beta and rc versions count as pre-releases.
 * @param {Record<string, any>} raw
 * @param {Array<Record<string, any>>} items
 */
export function manualReleases(raw, items) {
	const rows = items.map((item) => {
		const rawName = String(item.title ?? '').trim().replace(/^\/+/, '');
		const tag = deriveVersionFromTitle(item.title ?? '');
		return { tag, name: rawName || tag, published_at: item.published_at ?? null, html_url: item.html_url ?? raw.website ?? null };
	}).filter((row) => row.tag);
	if (!rows.length && raw.version) {
		const tag = String(raw.version);
		rows.push({ tag, name: tag, published_at: raw.released ?? null, html_url: raw.website ?? null });
	}
	return rows.map((row) => ({
		...row,
		label: releaseDisplayLabel(row.tag, row.name),
		prerelease: /(?:^|[\s._-])(?:alpha|beta|rc)/i.test(row.tag),
		body_html: ''
	}));
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

/** Distinct data/watch.json key so page watches never clash with release `watch:` state. */
export function pageWatchStateKey(entryId, url) {
	return `page:${entryId}:${url}`;
}

/** @param {string} url */
export function pageWatchDisplay(url) {
	try {
		const parsed = new URL(url);
		return `${parsed.host}${parsed.hash || ''}`;
	} catch {
		return String(url);
	}
}

/** @param {string} html @param {string} id */
export function extractElementById(html, id) {
	const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const openRe = new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid\\s*=\\s*(["'])${escaped}\\2[^>]*>`, 'i');
	const match = openRe.exec(html);
	if (!match) return null;
	const tag = match[1];
	const start = match.index;
	const afterOpen = match.index + match[0].length;
	if (/^(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i.test(tag)) {
		return match[0];
	}
	const re = new RegExp(`</?${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^>]*>`, 'gi');
	re.lastIndex = afterOpen;
	let depth = 1;
	let nest;
	while ((nest = re.exec(html))) {
		if (nest[0].startsWith('</')) {
			depth -= 1;
			if (depth === 0) return html.slice(start, nest.index + nest[0].length);
		} else if (!/\/\s*>$/.test(nest[0])) {
			depth += 1;
		}
	}
	return html.slice(start);
}

/**
 * Visible text for page watches: tags stripped, block boundaries → lines, whitespace collapsed.
 * @param {string} html
 * @param {string} [watchUrl] URL whose hash selects an element id; omit/empty hash = whole page
 */
export function extractPageWatchText(html, watchUrl = '') {
	let fragment = '';
	try {
		fragment = new URL(watchUrl, 'https://example.invalid').hash.replace(/^#/, '');
	} catch {
		fragment = '';
	}
	let scope = String(html ?? '');
	if (fragment) {
		const el = extractElementById(scope, fragment);
		if (!el) throw new Error(`No element with id="${fragment}"`);
		scope = el;
	}
	const lined = scope
		.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
		.replace(/<(?:br|hr)\b[^>]*>/gi, '\n')
		.replace(/<\/(?:p|div|tr|li|h[1-6]|section|article|header|footer|table|thead|tbody|tfoot|ul|ol)\s*>/gi, '\n')
		.replace(/<[^>]+>/g, ' ');
	return lined
		.split(/\r?\n/)
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n');
}

/** @param {string} text @param {number} [cap=PAGE_TEXT_CAP] */
export function capPageWatchText(text, cap = PAGE_TEXT_CAP) {
	const value = String(text ?? '');
	if (value.length <= cap) return value;
	return value.slice(0, cap);
}

/** @param {string} text */
export function pageWatchFingerprint(text) {
	return crypto.createHash('sha256').update(String(text ?? '')).digest('hex');
}

/**
 * @param {string} previous
 * @param {string} next
 * @returns {{ added: string[], removed: string[] }}
 */
export function diffPageWatchLines(previous, next) {
	const oldLines = String(previous ?? '').split('\n').filter(Boolean);
	const newLines = String(next ?? '').split('\n').filter(Boolean);
	const oldSet = new Set(oldLines);
	const newSet = new Set(newLines);
	return {
		added: newLines.filter((line) => !oldSet.has(line)),
		removed: oldLines.filter((line) => !newSet.has(line))
	};
}

/** @param {{ record?: { compatible?: unknown, watch?: unknown } }} entry @param {string} url */
export function pageWatchFieldHint(entry, url) {
	if (/#works-with\b/i.test(url) || Array.isArray(entry.record?.compatible)) return '`compatible`';
	return '`version` / `released` / related fields';
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
	const existing = await optionalRequest(`repos/${repository}/labels/${encodeURIComponent(LABEL)}`, token);
	if (!existing) {
		await request(`repos/${repository}/labels`, token, 'POST', {
			name: LABEL,
			color: 'fbca04',
			description: LABEL_DESCRIPTION
		});
		return;
	}
	if (existing.description !== LABEL_DESCRIPTION) {
		await request(`repos/${repository}/labels/${encodeURIComponent(LABEL)}`, token, 'PATCH', {
			new_name: LABEL,
			color: existing.color ?? 'fbca04',
			description: LABEL_DESCRIPTION
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

function formatDiffBlock(label, lines) {
	if (!lines.length) return `_No ${label} lines._`;
	const shown = lines.slice(0, 40);
	const more = lines.length > shown.length ? `\n…and ${lines.length - shown.length} more` : '';
	return ['```', ...shown, '```'].join('\n') + more;
}

export function pageWatchIssueBody(entry, watchUrl, previousText, nextText) {
	const page = entryPageUrl(entry.section, entry.id);
	const { added, removed } = diffPageWatchLines(previousText, nextText);
	const field = pageWatchFieldHint(entry, watchUrl);
	return [
		`Page section change detected for **${entry.record.name}**.`,
		'',
		`- Catalog page: ${page}`,
		`- Watched URL: ${watchUrl}`,
		`- Likely catalog field: ${field}`,
		'',
		'### Added lines',
		formatDiffBlock('added', added),
		'',
		'### Removed lines',
		formatDiffBlock('removed', removed),
		'',
		'Checklist:',
		`- [ ] review and update ${field} (and any related notes) if needed`
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

export function pageWatchChangedIssueTitle(entry, watchUrl) {
	return `Page watch: ${entry.record.name} — ${pageWatchDisplay(watchUrl)} changed`;
}

export function pageWatchMissingIssueTitle(entry, watchUrl) {
	return `Page watch: ${entry.record.name} — ${pageWatchDisplay(watchUrl)} not found`;
}

export function pageWatchMissingIssueBody(entry, watchUrl) {
	const page = entryPageUrl(entry.section, entry.id);
	return [
		`The watched page loaded, but the section id was not found for **${entry.record.name}**.`,
		'',
		`- Catalog page: ${page}`,
		`- Watched URL: ${watchUrl}`,
		`- Likely catalog field: ${pageWatchFieldHint(entry, watchUrl)}`,
		'',
		'The site may have renamed or removed that section. Previous page-watch state was kept.',
		'',
		'Checklist:',
		'- [ ] confirm the fragment still exists (or update `watch_pages`)'
	].join('\n');
}

function isMissingFragmentError(error) {
	return /No element with id=/.test(String(error?.message ?? error ?? ''));
}

async function openOrUpdatePageWatchIssue(token, repository, entry, watchUrl, previousText, nextText) {
	const title = pageWatchChangedIssueTitle(entry, watchUrl);
	const body = pageWatchIssueBody(entry, watchUrl, previousText, nextText);
	await ensureLabel(token, repository);
	const existing = await findOpenIssue(token, repository, title);
	if (existing) {
		// Keep the original issue body (first change); append later diffs as comments.
		await request(`repos/${repository}/issues/${existing.number}/comments`, token, 'POST', { body });
		console.log(`Commented on issue: ${title}`);
		return;
	}
	await request(`repos/${repository}/issues`, token, 'POST', {
		title,
		body,
		labels: [LABEL]
	});
	console.log(`Opened issue: ${title}`);
}

async function openOrUpdatePageWatchMissingIssue(token, repository, entry, watchUrl) {
	const title = pageWatchMissingIssueTitle(entry, watchUrl);
	const body = pageWatchMissingIssueBody(entry, watchUrl);
	await ensureLabel(token, repository);
	const existing = await findOpenIssue(token, repository, title);
	if (existing) {
		console.log(`Issue already open: ${title}`);
		return;
	}
	await request(`repos/${repository}/issues`, token, 'POST', {
		title,
		body,
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

	const allEntries = options.entries ?? readEntries();
	const releaseEntries = allEntries.filter((entry) => entry.record?.watch);
	const pageEntries = allEntries.filter(
		(entry) => Array.isArray(entry.record?.watch_pages) && entry.record.watch_pages.length
	);
	/** @type {Record<string, any>} */
	let state = {};
	if (fs.existsSync(statePath)) {
		try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')) ?? {}; }
		catch { state = {}; }
	}

	const nextState = { ...state };
	const results = [];

	for (const entry of releaseEntries) {
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
			results.push({ id: entry.id, name: entry.record.name, url, decision, fingerprint: fp, kind: 'release' });

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
			results.push({ id: entry.id, name: entry.record.name, url, error: error.message, kind: 'release' });
		}
	}

	for (const entry of pageEntries) {
		for (const rawUrl of entry.record.watch_pages) {
			const url = String(rawUrl);
			const stateKey = pageWatchStateKey(entry.id, url);
			const previous = state[stateKey] ?? null;
			const fetchUrl = url.replace(/#.*$/, '') || url;
			try {
				const response = await fetchImpl(fetchUrl, {
					signal: AbortSignal.timeout(FETCH_MS),
					headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' }
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const body = await response.text();
				let text;
				try {
					text = extractPageWatchText(body, url);
				} catch (error) {
					if (!isMissingFragmentError(error)) throw error;
					console.warn(`${stateKey}: ${error.message}; keeping previous state`);
					const missingTitle = pageWatchMissingIssueTitle(entry, url);
					if (canOpenIssues) {
						await openOrUpdatePageWatchMissingIssue(token, repository, entry, url);
					} else {
						console.log(`Would open issue: ${missingTitle}`);
					}
					results.push({
						id: entry.id,
						name: entry.record.name,
						url,
						error: error.message,
						kind: 'page',
						stateKey,
						missingFragment: true
					});
					continue;
				}
				const capped = capPageWatchText(text);
				const fp = pageWatchFingerprint(text);
				const decision = decideWatchUpdate({ previous, url, fingerprint: fp });
				results.push({
					id: entry.id,
					name: entry.record.name,
					url,
					decision,
					fingerprint: fp,
					kind: 'page',
					stateKey
				});

				if (decision.action === 'unchanged') {
					console.log(`${stateKey}: unchanged`);
					continue;
				}
				if (decision.action === 'changed') {
					console.log(`${stateKey}: CHANGED`);
					const issueTitle = pageWatchChangedIssueTitle(entry, url);
					if (canOpenIssues) {
						await openOrUpdatePageWatchIssue(
							token,
							repository,
							entry,
							url,
							previous?.text ?? '',
							capped
						);
					} else {
						console.log(`Would open issue: ${issueTitle}`);
						console.log(pageWatchIssueBody(entry, url, previous?.text ?? '', capped));
					}
				} else {
					console.log(`${stateKey}: ${decision.action === 'baseline' ? 'baseline recorded' : 'watch URL changed; re-baselined'}`);
				}
				nextState[stateKey] = {
					url,
					fingerprint: fp,
					text: capped,
					checked_at: now()
				};
			} catch (error) {
				console.warn(`${stateKey}: page watch failed (${error.message}); keeping previous state`);
				results.push({
					id: entry.id,
					name: entry.record.name,
					url,
					error: error.message,
					kind: 'page',
					stateKey
				});
			}
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
