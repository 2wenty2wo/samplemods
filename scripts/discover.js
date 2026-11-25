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

export function excludeKnown(candidates, { catalogRepos, starRepos, catalogRepo = CATALOG_REPO }) {
	const catalog = catalogRepos instanceof Set ? catalogRepos : new Set([...catalogRepos].map(normalizeRepo));
	const stars = starRepos instanceof Set ? starRepos : new Set([...starRepos].map(normalizeRepo));
	const self = normalizeRepo(catalogRepo);
	const kept = [];
	const excluded = [];
	const seen = new Set();
	for (const candidate of candidates) {
		if (candidate.archived) {
			excluded.push({ ...candidate, why: 'archived' });
			continue;
		}
		const key = normalizeRepo(candidate.repo);
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

const ROW_RE = /^- \[(x| )\] \[([^\]]+)\]\(([^)]+)\):(.*)$/i;

export function parseTickedRepos(body) {
	const ticked = new Set();
	if (!body) return ticked;
	for (const line of String(body).split(/\r?\n/)) {
		const match = line.match(ROW_RE);
		if (match && match[1].toLowerCase() === 'x') ticked.add(normalizeRepo(match[2]));
	}
	return ticked;
}

function parseTickedLines(body) {
	const lines = [];
	if (!body) return lines;
	for (const line of String(body).split(/\r?\n/)) {
		const match = line.match(ROW_RE);
		if (match && match[1].toLowerCase() === 'x') lines.push(line.trim());
	}
	return lines;
}

function candidateRow(candidate) {
	const desc = markdownText(candidate.description || 'No description provided.');
	return `- [ ] [${candidate.repo}](${candidate.html_url}): ${desc} · ★${candidate.stars} · created ${candidate.created} · ${candidate.reason}`;
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
	return String(body ?? '').split(/\r?\n/).some((line) => /^- \[ \] \[/.test(line));
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

	const raw = [
		...await searchCandidates(token, since),
		...await authorCandidates(token, entries, since),
		...await forkCandidates(token, entries, since)
	];
	const { candidates, excluded } = excludeKnown(raw, {
		catalogRepos: catalogRepoSet(entries),
		starRepos: new Set(starred.map((repo) => normalizeRepo(repo.nameWithOwner))),
		catalogRepo: CATALOG_REPO
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
