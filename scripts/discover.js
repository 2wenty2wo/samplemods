import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';
import { CATALOG_REPO } from './catalog-contributors.js';
import { markdownText, optionalRequest, readStarList, request } from './check-star-list.js';

export const TITLE = 'Discovery candidates';
export const LABEL = 'discovery';

const CLOSE_COMMENT = 'No open discovery candidates remain.';
const FOOTER =
	'Star a repo into the [mpc-sample list](https://github.com/stars/2wenty2wo/lists/mpc-sample) to draft an entry; tick it here to dismiss.';
const TOPIC_RE = /\b(?:mpc(?:[-_ ]?sample)?|akai)\b/i;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let apiCalls = 0;

export function getApiCallCount() {
	return apiCalls;
}

export function resetApiCallCount() {
	apiCalls = 0;
}

async function gh(endpoint, token, method = 'GET', body) {
	apiCalls += 1;
	return request(endpoint, token, method, body);
}

async function ghOptional(endpoint, token) {
	apiCalls += 1;
	return optionalRequest(endpoint, token, request);
}

export function normalizeRepo(repo) {
	return String(repo).toLowerCase();
}

export function sinceDateDaysAgo(days, now = new Date()) {
	const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

export function topicMatch(repo) {
	const haystack = [repo.name, repo.description, ...(repo.topics ?? [])].filter(Boolean).join(' ');
	return TOPIC_RE.test(haystack);
}

function createdOnOrAfter(iso, since) {
	return String(iso ?? '').slice(0, 10) >= since;
}

function toCandidate(repo, reason) {
	return {
		repo: repo.full_name ?? repo.repo,
		description: repo.description ?? '',
		stars: repo.stargazers_count ?? repo.stars ?? 0,
		created: String(repo.created_at ?? repo.created ?? '').slice(0, 10),
		reason,
		html_url: repo.html_url ?? `https://github.com/${repo.full_name ?? repo.repo}`,
		archived: Boolean(repo.archived)
	};
}

export const FEED_URL_ENV = 'DISCOVERY_FEED_URL';
export const LIST_URL_ENV = 'DISCOVERY_LIST_URL';
export const DIRECTORY_URL_ENV = 'DISCOVERY_DIRECTORY_URL';
const DIRECTORY_DETAIL_LIMIT = 10;
const SOURCE_HEADERS = { 'User-Agent': 'SampleModsDiscovery/1.0' };

export function feedHostname(feedUrl) {
	try {
		return new URL(String(feedUrl)).hostname.toLowerCase();
	} catch {
		return null;
	}
}

/** True when url's host equals feedHost or is a subdomain of it. */
export function isFeedSelfUrl(url, feedHost) {
	if (!feedHost) return false;
	try {
		const host = new URL(String(url)).hostname.toLowerCase().replace(/\.$/, '');
		const sourceHost = feedHost.replace(/\.$/, '');
		return host === sourceHost || host.endsWith(`.${sourceHost}`);
	} catch {
		return false;
	}
}

/** owner/repo from a github.com URL, or undefined. */
export function githubRepoFromUrl(url) {
	const match = String(url ?? '').match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:[/#?]|$)/i);
	if (!match) return;
	const owner = match[1];
	const name = match[2];
	if (['orgs', 'users', 'sponsors', 'settings', 'topics', 'collections'].includes(owner.toLowerCase())) return;
	return `${owner}/${name}`;
}

export function normalizeName(name) {
	return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** First github.com/owner/repo found in item.links values. */
export function githubRepoFromItemLinks(item) {
	for (const value of Object.values(item?.links ?? {})) {
		const repo = githubRepoFromUrl(value);
		if (repo) return repo;
	}
	return;
}

/** Prefer GitHub repo URL, else non-feed-host home / author URL, else null. */
export function pickFeedHref(item, feedHost) {
	const links = item?.links ?? {};
	const github = githubRepoFromItemLinks(item);
	if (github) return `https://github.com/${github}`;
	if (links.home && !isFeedSelfUrl(links.home, feedHost)) return links.home;
	for (const author of item?.authors ?? []) {
		if (author?.url && !isFeedSelfUrl(author.url, feedHost)) return author.url;
	}
	return null;
}

function feedSummary(summary, feedHost) {
	const text = String(summary ?? '');
	const sourceName = feedHost?.replace(/^www\./, '').split('.')[0];
	if (!sourceName || !text.toLowerCase().includes(sourceName)) return text;
	return text.split(/(?<=[.!?])\s+/)
		.filter((sentence) => !sentence.toLowerCase().includes(sourceName))
		.join(' ');
}

export function candidateFromFeedItem(item, feedHost) {
	if (!Array.isArray(item?.devices) || !item.devices.includes('mpc-sample')) return null;
	const github = githubRepoFromItemLinks(item);
	const href = pickFeedHref(item, feedHost);
	if (href && isFeedSelfUrl(href, feedHost)) return null;
	const label = github ?? String(item.name ?? '').trim();
	if (!label) return null;
	const added = String(item.added ?? '').slice(0, 10);
	return {
		repo: label,
		description: feedSummary(item.summary, feedHost),
		stars: 0,
		created: added,
		reason: `listed in a community catalog (added ${added || 'unknown'})`,
		html_url: href,
		archived: false
	};
}

export function filterFeedCandidates(items, entries, feedHost) {
	const catalogRepos = catalogRepoSet(entries);
	const catalogIds = new Set(entries.map((entry) => entry.id));
	const catalogNames = new Set(entries.map((entry) => normalizeName(entry.record?.name)).filter(Boolean));
	const out = [];
	for (const item of items ?? []) {
		const candidate = candidateFromFeedItem(item, feedHost);
		if (!candidate) continue;
		const github = githubRepoFromItemLinks(item);
		if (github && catalogRepos.has(normalizeRepo(github))) continue;
		if (item.slug && catalogIds.has(item.slug)) continue;
		if (normalizeName(item.name) && catalogNames.has(normalizeName(item.name))) continue;
		out.push(candidate);
	}
	return out;
}

/**
 * Fetch the optional catalog feed once.
 * Unset DISCOVERY_FEED_URL → [] (feed disabled).
 * Set but fetch/JSON fails → null (caller must leave the issue unchanged).
 * @returns {Promise<object[]|null>}
 */
export async function fetchFeedItems(fetchImpl = globalThis.fetch, env = process.env) {
	const url = env[FEED_URL_ENV];
	if (!url) {
		console.log('Catalog feed URL unset; continuing without feed candidates.');
		return [];
	}
	try {
		const response = await fetchImpl(url, { headers: SOURCE_HEADERS });
		if (!response.ok) {
			console.warn('warn: catalog feed returned an HTTP error.');
			return null;
		}
		const data = await response.json();
		if (!Array.isArray(data)) {
			console.warn('warn: catalog feed was not an array.');
			return null;
		}
		return data;
	} catch {
		console.warn('warn: catalog feed fetch failed.');
		return null;
	}
}

/** owner/repo from a raw.githubusercontent.com/<owner>/<repo>/… URL, or null. */
export function listSourceRepo(listUrl) {
	try {
		const parsed = new URL(String(listUrl));
		if (parsed.hostname.toLowerCase() !== 'raw.githubusercontent.com') return null;
		const parts = parsed.pathname.split('/').filter(Boolean);
		if (parts.length < 2) return null;
		return `${parts[0]}/${parts[1]}`;
	} catch {
		return null;
	}
}

/** Unique github.com owner/repo links from markdown (deeper paths reduce to owner/repo). */
export function githubReposFromMarkdown(markdown) {
	const found = [];
	const seen = new Set();
	const re = /https?:\/\/(?:www\.)?github\.com\/[^\s)\]>"']+/gi;
	for (const match of String(markdown ?? '').matchAll(re)) {
		const cleaned = match[0].replace(/[.,;:]+$/g, '');
		const repo = githubRepoFromUrl(cleaned);
		if (!repo) continue;
		const key = normalizeRepo(repo);
		if (seen.has(key)) continue;
		seen.add(key);
		found.push(repo);
	}
	return found;
}

/** Drop the list's own repo and anything already in the catalog. */
export function filterListRepos(repos, listUrl, entries) {
	const self = listSourceRepo(listUrl);
	const selfKey = self ? normalizeRepo(self) : null;
	const catalog = catalogRepoSet(entries);
	const out = [];
	const seen = new Set();
	for (const repo of repos ?? []) {
		const key = normalizeRepo(repo);
		if (seen.has(key)) continue;
		seen.add(key);
		if (selfKey && key === selfKey) continue;
		if (catalog.has(key)) continue;
		out.push(repo);
	}
	return out;
}

export function candidateFromListRepo(repo, meta) {
	if (meta) {
		if (meta.archived) return null;
		return toCandidate(meta, 'listed in a curated list');
	}
	return {
		repo,
		description: '',
		stars: 0,
		created: '',
		reason: 'listed in a curated list',
		html_url: `https://github.com/${repo}`,
		archived: false
	};
}

/**
 * Fetch the optional curated-list README once (plain text).
 * Unset DISCOVERY_LIST_URL → '' (list disabled).
 * Set but fetch fails → null (caller must leave the issue unchanged).
 * @returns {Promise<string|null>}
 */
export async function fetchListMarkdown(fetchImpl = globalThis.fetch, env = process.env) {
	const url = env[LIST_URL_ENV];
	if (!url) {
		console.log('Curated list URL unset; continuing without list candidates.');
		return '';
	}
	try {
		const response = await fetchImpl(url, { headers: SOURCE_HEADERS });
		if (!response.ok) {
			console.warn('warn: curated list returned an HTTP error.');
			return null;
		}
		return await response.text();
	} catch {
		console.warn('warn: curated list fetch failed.');
		return null;
	}
}

function htmlAttribute(attributes, name) {
	const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i');
	const match = attributes.match(pattern);
	return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

function hasHtmlClass(attributes, name) {
	return htmlAttribute(attributes, 'class').split(/\s+/).includes(name);
}

function jsonLdNodes(html) {
	const nodes = [];
	for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
		if (htmlAttribute(attributes, 'type').toLowerCase() !== 'application/ld+json') continue;
		try {
			const data = JSON.parse(body);
			for (const node of Array.isArray(data) ? data : [data]) {
				nodes.push(node);
				if (Array.isArray(node?.['@graph'])) nodes.push(...node['@graph']);
			}
		} catch {
			// A page can carry several independent JSON-LD scripts.
		}
	}
	return nodes;
}

function directoryItems(html) {
	return jsonLdNodes(html)
		.map((node) => node?.mainEntity ?? node)
		.find((node) => node?.['@type'] === 'ItemList' && Array.isArray(node.itemListElement))
		?.itemListElement ?? null;
}

function httpUrl(value, base) {
	if (typeof value !== 'string' || !value.trim()) return null;
	try {
		const url = new URL(value, base);
		if (/^https?:$/.test(url.protocol) && !url.username && !url.password) return url;
	} catch {
		// Ignore invalid links.
	}
	return null;
}

function directoryUpstream(html, detail) {
	function upstream(value) {
		const url = httpUrl(value, detail);
		return url && !isFeedSelfUrl(url, detail.hostname) ? url.href : null;
	}
	for (const node of jsonLdNodes(html)) {
		if (node?.['@type'] !== 'SoftwareApplication') continue;
		for (const value of Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs]) {
			const href = upstream(value);
			if (href) return href;
		}
	}
	for (const [, attributes, body] of html.matchAll(/<header\b([^>]*)>([\s\S]*?)<\/header\s*>/gi)) {
		if (!hasHtmlClass(attributes, 'mods-head')) continue;
		for (const [, link] of body.matchAll(/<a\b([^>]*)>/gi)) {
			if (!hasHtmlClass(link, 'mods-go')) continue;
			const href = upstream(htmlAttribute(link, 'href').replaceAll('&amp;', '&'));
			if (href) return href;
		}
	}
	return null;
}

export async function fetchDirectoryCandidates(entries, fetchImpl = globalThis.fetch, env = process.env, now = new Date()) {
	const url = env[DIRECTORY_URL_ENV];
	if (!url) {
		console.log('Mod directory URL unset; continuing without directory candidates.');
		return [];
	}
	const page = httpUrl(url);
	const options = { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'error' };
	let items;
	try {
		const response = page && await fetchImpl(page.href, options);
		if (response?.status === 200) items = directoryItems(await response.text());
	} catch {
		// Fetch and parse failures leave the issue unchanged.
	}
	if (!items) {
		console.warn('warn: mod directory unavailable.');
		return null;
	}
	const catalogNames = new Set(entries.map(({ record }) => normalizeName(record?.name)));
	const catalogIds = new Set(entries.map(({ id }) => normalizeName(id)));
	const unmatched = new Map();
	for (const item of items) {
		if (typeof item?.name !== 'string' || catalogNames.has(normalizeName(item.name))) continue;
		const name = item.name.replace(/[\[\]`]/g, '').trim().replace(/\s+/g, ' ');
		if (!name) continue;
		const detail = httpUrl(item.url, page);
		if (!detail || detail.origin !== page.origin) continue;
		const slug = detail.pathname.split('/').filter(Boolean).at(-1);
		if (catalogIds.has(normalizeName(slug))) continue;
		detail.hash = '';
		if (detail.href === page.href || unmatched.has(detail.href)) continue;
		unmatched.set(detail.href, { detail, name });
	}
	const urls = [...unmatched.keys()];
	let start = 0;
	if (urls.length > DIRECTORY_DETAIL_LIMIT) {
		// Advance by one full window per UTC day, independent of the listing order.
		urls.sort();
		const day = Math.floor(now.getTime() / 86_400_000);
		const offset = (day * DIRECTORY_DETAIL_LIMIT) % urls.length;
		start = (offset + urls.length) % urls.length;
	}
	const candidates = [];
	for (let index = 0; index < Math.min(DIRECTORY_DETAIL_LIMIT, urls.length); index += 1) {
		const { detail, name } = unmatched.get(urls[(start + index) % urls.length]);
		try {
			const response = await fetchImpl(detail.href, options);
			if (response.status !== 200) continue;
			const upstream = directoryUpstream(await response.text(), detail);
			const github = githubRepoFromUrl(upstream);
			const repo = github ? normalizeRepo(github) : name;
			const reason = 'listed in a mod directory';
			candidates.push({ ...toCandidate({ repo }, reason), html_url: github ? `https://github.com/${repo}` : upstream });
		} catch {
			// A broken detail page does not prevent other candidates from being found.
		}
	}
	return candidates;
}

export function candidateFromSearchItem(item, query) {
	if (isEmptyFork(item)) return null;
	return toCandidate(item, `search: ${query}`);
}

function isEmptyFork(repo) {
	return Boolean(repo.fork) && (repo.stargazers_count ?? 0) < 1 && !(repo.has_releases || (repo.release_count ?? 0) > 0);
}

export function filterAuthorRepos(repos, since, owner, exampleEntryId) {
	const out = [];
	for (const repo of repos) {
		if (repo.archived) continue;
		if (isEmptyFork(repo)) continue;
		if (!createdOnOrAfter(repo.created_at, since)) continue;
		if (!topicMatch(repo)) continue;
		out.push(toCandidate(repo, `new repo by catalog author ${owner} (${exampleEntryId})`));
	}
	return out;
}

export function filterForks(forks, since, parentRepo) {
	const out = [];
	for (const fork of forks) {
		if (fork.archived) continue;
		if (!createdOnOrAfter(fork.created_at, since)) continue;
		const releases = fork.release_count ?? (fork.has_releases ? 1 : 0);
		const stars = fork.stargazers_count ?? 0;
		if (stars < 1 && releases < 1) continue;
		const detail = stars >= 1
			? `${stars} star${stars === 1 ? '' : 's'}`
			: `${releases} release${releases === 1 ? '' : 's'}`;
		out.push(toCandidate(fork, `fork of ${parentRepo} with ${detail}`));
	}
	return out;
}

export function excludeKnown(candidates, { catalogRepos, starRepos, catalogRepo = CATALOG_REPO, listUrl }) {
	const catalog = catalogRepos instanceof Set ? catalogRepos : new Set([...catalogRepos].map(normalizeRepo));
	const stars = starRepos instanceof Set ? starRepos : new Set([...starRepos].map(normalizeRepo));
	const self = normalizeRepo(catalogRepo);
	const listSource = listSourceRepo(listUrl);
	const listSourceKey = listSource ? normalizeRepo(listSource) : null;
	const kept = [];
	const excluded = [];
	const seen = new Set();
	for (const candidate of candidates) {
		const key = normalizeRepo(candidate.repo);
		if (key === listSourceKey) continue;
		if (candidate.archived) {
			excluded.push({ ...candidate, why: 'archived' });
			continue;
		}
		if (seen.has(key)) continue;
		seen.add(key);
		if (key.split('/')[0] === self.split('/')[0] && key !== self) {
			excluded.push({ ...candidate, why: "maintainer's own repository" });
			continue;
		}
		if (key === self) {
			excluded.push({ ...candidate, why: 'catalog repository itself' });
			continue;
		}
		if (catalog.has(key)) {
			excluded.push({ ...candidate, why: 'already in catalog' });
			continue;
		}
		if (stars.has(key)) {
			excluded.push({ ...candidate, why: 'already in star list' });
			continue;
		}
		kept.push(candidate);
	}
	kept.sort((a, b) => a.repo.localeCompare(b.repo));
	excluded.sort((a, b) => a.repo.localeCompare(b.repo));
	return { candidates: kept, excluded };
}

const LINK_ROW_RE = /^- \[(x| )\] \[([^\]]+)\]\(([^)]+)\):(.*)$/i;
const PLAIN_TICKED_RE = /^- \[(x| )\] `([^`]+)`:\s*(.*)$/i;
/** Legacy plain rows without backticks (pre-backtick delimiter). */
const PLAIN_ROW_RE = /^- \[(x| )\] ([^[\n`][^:]*):\s*(.*)$/i;

function encodeLinkUrl(url) {
	return String(url).replaceAll('(', '%28').replaceAll(')', '%29');
}

function tickedRowKey(line) {
	const linked = line.match(LINK_ROW_RE);
	if (linked) return normalizeRepo(linked[2]);
	const plainTicked = line.match(PLAIN_TICKED_RE);
	if (plainTicked) return normalizeRepo(plainTicked[2].trim());
	const plain = line.match(PLAIN_ROW_RE);
	if (plain) return normalizeRepo(plain[2].trim());
	return null;
}

export function parseTickedRepos(body) {
	const ticked = new Set();
	if (!body) return ticked;
	for (const line of String(body).split(/\r?\n/)) {
		const key = /^- \[x\] /i.test(line) ? tickedRowKey(line) : null;
		if (key) ticked.add(key);
	}
	return ticked;
}

function parseTickedLines(body) {
	const lines = [];
	if (!body) return lines;
	for (const line of String(body).split(/\r?\n/)) {
		if (/^- \[x\] /i.test(line) && tickedRowKey(line)) lines.push(line.trim());
	}
	return lines;
}

function candidateRow(candidate) {
	const desc = markdownText(candidate.description || 'No description provided.');
	const tail = `${desc} · ★${candidate.stars} · created ${candidate.created} · ${candidate.reason}`;
	if (candidate.html_url) {
		return `- [ ] [${candidate.repo}](${encodeLinkUrl(candidate.html_url)}): ${tail}`;
	}
	const name = String(candidate.repo).replaceAll('`', '');
	return `- [ ] \`${name}\`: ${tail}`;
}

export function formatDiscoveryBody(candidates, tickedRepos = new Set(), previousBody = '') {
	return mergeDiscoveryBody(candidates, previousBody, tickedRepos);
}

/** Build issue body: preserved ticks + current unticked candidates. */
export function mergeDiscoveryBody(candidates, previousBody = '', tickedRepos) {
	const ticked = tickedRepos ?? parseTickedRepos(previousBody);
	const tickedLines = parseTickedLines(previousBody);
	const lines = ['Repositories that may belong in the catalog:', ''];
	for (const line of tickedLines) lines.push(line);
	const active = [];
	for (const candidate of candidates) {
		if (ticked.has(normalizeRepo(candidate.repo))) continue;
		active.push(candidateRow(candidate));
	}
	active.sort((a, b) => a.localeCompare(b));
	lines.push(...active);
	if (tickedLines.length || active.length) lines.push('');
	lines.push(FOOTER);
	return lines.join('\n');
}

export function hasUntickedRows(body) {
	return String(body ?? '').split(/\r?\n/).some((line) => /^- \[ \] /.test(line));
}

async function ensureLabel(token, repository) {
	if (!await ghOptional(`repos/${repository}/labels/${LABEL}`, token)) {
		await gh(`repos/${repository}/labels`, token, 'POST', {
			name: LABEL,
			color: '0e8a16',
			description: 'GitHub discovery candidates awaiting a star-list decision'
		});
	}
}

async function findDiscoveryIssue(token, repository) {
	const base = `repos/${repository}`;
	for (const state of ['open', 'closed']) {
		let page = 1;
		let issues;
		do {
			issues = await gh(`${base}/issues?state=${state}&per_page=100&page=${page++}`, token);
			const issue = issues.find((entry) => !entry.pull_request && entry.title === TITLE);
			if (issue) return issue;
		} while (issues.length === 100);
	}
	return null;
}

export async function syncDiscoveryIssue(token, repository, body, hasOpenCandidates) {
	const base = `repos/${repository}`;
	const issue = await findDiscoveryIssue(token, repository);

	if (!hasOpenCandidates) {
		if (issue?.state === 'open') {
			await gh(`${base}/issues/${issue.number}/comments`, token, 'POST', { body: CLOSE_COMMENT });
			await gh(`${base}/issues/${issue.number}`, token, 'PATCH', { state: 'closed' });
		}
		return;
	}

	await ensureLabel(token, repository);
	if (!issue || issue.state === 'closed') {
		await gh(`${base}/issues`, token, 'POST', { title: TITLE, body, labels: [LABEL] });
		return;
	}
	const labels = issue.labels.map((label) => label.name);
	if (issue.body !== body || !labels.includes(LABEL)) {
		await gh(`${base}/issues/${issue.number}`, token, 'PATCH', {
			body,
			labels: [...new Set([...labels, LABEL])]
		});
	}
}

function searchQueries(since) {
	return [
		`"MPC Sample" in:name,description,readme created:>=${since}`,
		`mpc-sample in:name created:>=${since}`,
		`topic:mpc-sample created:>=${since}`,
		`"mpc sample" in:name,description created:>=${since}`
	];
}

async function searchCandidates(token, since) {
	const out = [];
	for (const query of searchQueries(since)) {
		const encoded = encodeURIComponent(query);
		const data = await gh(`search/repositories?q=${encoded}&per_page=50&sort=updated`, token);
		for (const item of data.items ?? []) {
			if (item.archived) continue;
			const candidate = candidateFromSearchItem(item, query);
			if (candidate) out.push(candidate);
		}
		// Stay under ~30 search requests/minute.
		await new Promise((resolve) => setTimeout(resolve, 2200));
	}
	return out;
}

function catalogOwners(entries) {
	const owners = new Map();
	for (const { id, record } of entries) {
		const repo = record.repo;
		if (!repo || !repo.includes('/')) continue;
		const owner = repo.split('/')[0];
		if (!owners.has(owner.toLowerCase())) owners.set(owner.toLowerCase(), { owner, exampleId: id });
	}
	return [...owners.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}

async function authorCandidates(token, entries, since) {
	const out = [];
	for (const { owner, exampleId } of catalogOwners(entries)) {
		const repos = await ghOptional(`users/${encodeURIComponent(owner)}/repos?type=owner&sort=created&direction=desc&per_page=30`, token);
		if (!Array.isArray(repos)) continue;
		const mapped = repos.map((repo) => ({
			...repo,
			topics: repo.topics ?? []
		}));
		out.push(...filterAuthorRepos(mapped, since, owner, exampleId));
	}
	return out;
}

async function forkCandidates(token, entries, since) {
	const out = [];
	const seenParents = new Set();
	for (const { record } of entries) {
		const repo = record.repo;
		if (!repo || !repo.includes('/') || record.status === 'removed') continue;
		const key = normalizeRepo(repo);
		if (seenParents.has(key)) continue;
		seenParents.add(key);
		const forks = await ghOptional(`repos/${repo}/forks?sort=newest&per_page=30`, token);
		if (!Array.isArray(forks)) continue;
		const recent = [];
		for (const fork of forks) {
			if (!createdOnOrAfter(fork.created_at, since)) continue;
			if (fork.archived) continue;
			let release_count = 0;
			let has_releases = false;
			if ((fork.stargazers_count ?? 0) < 1) {
				const releases = await ghOptional(`repos/${fork.full_name}/releases?per_page=1`, token);
				if (Array.isArray(releases) && releases.length) {
					has_releases = true;
					release_count = releases.length;
				}
			}
			recent.push({ ...fork, has_releases, release_count });
		}
		out.push(...filterForks(recent, since, repo));
	}
	return out;
}

async function listCandidates(token, markdown, listUrl, entries) {
	const repos = filterListRepos(githubReposFromMarkdown(markdown), listUrl, entries);
	const out = [];
	for (const repo of repos) {
		const meta = await ghOptional(`repos/${repo}`, token);
		const candidate = candidateFromListRepo(repo, meta && typeof meta === 'object' ? meta : null);
		if (candidate) out.push(candidate);
	}
	return out;
}

function catalogRepoSet(entries) {
	const set = new Set();
	for (const { record } of entries) {
		if (record.repo) set.add(normalizeRepo(record.repo));
	}
	return set;
}

function parseSinceArg(argv) {
	const index = argv.indexOf('--since');
	if (index >= 0 && argv[index + 1]) return argv[index + 1];
	return sinceDateDaysAgo(30);
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const since = parseSinceArg(process.argv);
	const token = process.env.GITHUB_TOKEN;
	const repository = process.env.GITHUB_REPOSITORY || CATALOG_REPO;
	if (!token) throw new Error('GITHUB_TOKEN is required.');

	resetApiCallCount();
	const entries = readEntries(path.join(root, 'data'));
	const starUser = process.env.STAR_LIST_USER || '2wenty2wo';
	const starSlug = process.env.STAR_LIST_SLUG || 'mpc-sample';

	// readStarList uses request() directly; count approximate graphql pages via wrapping is hard —
	// call it then add a note. Track our gh() calls around it.
	const beforeStar = getApiCallCount();
	const starred = await readStarList(token, starUser, starSlug);
	// readStarList bypasses our counter; estimate from typical 2–4 graphql calls by bumping after.
	apiCalls += Math.max(2, Math.ceil(starred.length / 100) + 1);

	const feedUrl = process.env[FEED_URL_ENV];
	const feedHost = feedUrl ? feedHostname(feedUrl) : null;
	const feedItems = await fetchFeedItems();
	if (feedItems == null && !dryRun) {
		console.log('Catalog feed unavailable; leaving the Discovery issue unchanged');
		return;
	}
	const listUrl = process.env[LIST_URL_ENV] ?? '';
	const listMarkdown = await fetchListMarkdown();
	const list = await listCandidates(token, listMarkdown ?? '', listUrl, entries).catch(() => {
		console.warn('warn: curated list repository lookup failed.');
		return null;
	});
	if ((listMarkdown == null || list == null) && !dryRun) {
		console.log('Curated list unavailable; leaving the Discovery issue unchanged');
		return;
	}
	const directory = await fetchDirectoryCandidates(entries);
	if (directory == null && !dryRun) {
		console.log('Mod directory unavailable; leaving the Discovery issue unchanged');
		return;
	}
	const feed = filterFeedCandidates(feedItems ?? [], entries, feedHost);
	const raw = [
		...await searchCandidates(token, since),
		...await authorCandidates(token, entries, since),
		...await forkCandidates(token, entries, since),
		...feed,
		...(list ?? []),
		...(directory ?? [])
	];
	const { candidates, excluded } = excludeKnown(raw, {
		catalogRepos: catalogRepoSet(entries),
		starRepos: new Set(starred.map((repo) => normalizeRepo(repo.nameWithOwner))),
		catalogRepo: CATALOG_REPO,
		listUrl
	});

	let previousBody = '';
	if (!dryRun) {
		const existing = await findDiscoveryIssue(token, repository);
		previousBody = existing?.body ?? '';
	}

	const body = mergeDiscoveryBody(candidates, previousBody);
	const open = hasUntickedRows(body);

	if (dryRun) {
		console.log(`${TITLE}\n\nsince: ${since}\napi_calls: ${getApiCallCount()} (approx; star-list graphql counted roughly)\n`);
		console.log(open || parseTickedRepos(previousBody).size ? body : '(no candidates — issue would close)\n');
		console.log('\n## Excluded (already in catalog or star list)\n');
		const interesting = excluded.filter((row) => /catalog|star list/i.test(row.why));
		if (!interesting.length) console.log('(none)');
		else {
			for (const row of interesting) {
				console.log(`- ${row.repo}: ${row.why} · ${row.reason}`);
			}
		}
		console.log(`\napi_calls_total: ${getApiCallCount()}`);
		return;
	}

	if (!process.env.GITHUB_REPOSITORY) {
		throw new Error('GITHUB_REPOSITORY is required unless --dry-run.');
	}
	await syncDiscoveryIssue(token, repository, body, open);
	console.log(open
		? `Synced discovery issue (${candidates.length} open candidate${candidates.length === 1 ? '' : 's'}; ${getApiCallCount()} API calls).`
		: `Closed discovery issue (${getApiCallCount()} API calls).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
