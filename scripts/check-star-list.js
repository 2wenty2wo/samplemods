import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';

const TITLE = 'Star list: repos missing from the catalog';
const LABEL = 'star-list';
const TOKEN_HELP = 'Add a STAR_LIST_TOKEN repository secret containing a classic or fine-grained PAT with public read access to the user star list.';

export function compareRepositories(starred, catalog, catalogRepo = '2wenty2wo/samplemods') {
	const list = new Map(starred.map((repo) => [repo.nameWithOwner.toLowerCase(), repo]));
	const entries = new Map(catalog.map((mod) => [mod.repo.toLowerCase(), mod]));
	list.delete(catalogRepo.toLowerCase());
	entries.delete(catalogRepo.toLowerCase());
	return {
		missing: [...list].filter(([key]) => !entries.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([, repo]) => repo),
		extra: [...entries].filter(([key]) => !list.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([, mod]) => mod)
	};
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
	const data = await response.json();
	if (!response.ok || data.errors?.length) {
		const detail = data.errors?.map((error) => `${error.type ?? ''} ${error.message}`).join('; ') ?? data.message;
		const error = new Error(`GitHub ${endpoint}: HTTP ${response.status}: ${detail}`);
		error.status = response.status;
		throw error;
	}
	return data;
}

export async function readStarList(token, user, slug) {
	async function query(query, variables) {
		try {
			return (await request('graphql', token, 'POST', { query, variables })).data;
		} catch (error) {
			if (/HTTP (401|403)|FORBIDDEN|UNAUTHORIZED|permission|scope|credentials|not accessible|authentication/i.test(error.message)) {
				throw new Error(`${error.message}\n${TOKEN_HELP}`);
			}
			throw error;
		}
	}
	let after = null;
	let list;
	do {
		const data = await query(`query($user: String!, $after: String) {
			user(login: $user) { lists(first: 100, after: $after) {
				nodes { id slug } pageInfo { hasNextPage endCursor }
			} }
		}`, { user, after });
		if (!data.user) throw new Error(`GitHub user not found: ${user}`);
		list = data.user.lists.nodes.find((entry) => entry?.slug === slug);
		after = data.user.lists.pageInfo.hasNextPage ? data.user.lists.pageInfo.endCursor : null;
	} while (!list && after);
	if (!list) throw new Error(`Star list '${slug}' not found for '${user}'. Check the name and token access. ${TOKEN_HELP}`);
	const repos = [];
	after = null;
	do {
		const data = await query(`query($id: ID!, $after: String) {
			node(id: $id) { ... on UserList { items(first: 100, after: $after) {
				nodes { ... on Repository { nameWithOwner description stargazerCount } }
				pageInfo { hasNextPage endCursor }
			} } }
		}`, { id: list.id, after });
		if (!data.node?.items) throw new Error(`Star list unavailable. ${TOKEN_HELP}`);
		repos.push(...data.node.items.nodes.filter((repo) => repo?.nameWithOwner));
		after = data.node.items.pageInfo.hasNextPage ? data.node.items.pageInfo.endCursor : null;
	} while (after);
	return repos;
}

function markdownText(text) {
	return String(text ?? 'No description provided.').replace(/\s+/g, ' ')
		.replace(/[\\`*_{}\[\]<>#|~]/g, '\\$&').replaceAll('@', '&#64;');
}

export function formatIssueBody({ missing, extra }, listUrl) {
	const lines = [`Repositories in the [star list](${listUrl}) that need catalog entries:`, ''];
	for (const repo of missing) {
		lines.push(`- [ ] [${repo.nameWithOwner}](https://github.com/${repo.nameWithOwner}): ${markdownText(repo.description)} · ★${repo.stargazerCount}`);
	}
	if (extra.length) {
		lines.push('', '## In catalog but not in star list', '', 'For information only; catalog entries are not removed automatically.', '');
		for (const mod of extra) lines.push(`- [${mod.repo}](https://github.com/${mod.repo})`);
	}
	return lines.join('\n');
}

export async function syncIssue(token, repository, { missing }, body) {
	const base = `repos/${repository}`;
	let page = 1;
	let issues;
	let issue;
	do {
		issues = await request(`${base}/issues?state=open&per_page=100&page=${page++}`, token);
		issue = issues.find((entry) => !entry.pull_request && entry.title === TITLE);
	} while (!issue && issues.length === 100);
	if (!missing.length) {
		if (issue) {
			await request(`${base}/issues/${issue.number}/comments`, token, 'POST', { body: 'All starred repos are in the catalog.' });
			await request(`${base}/issues/${issue.number}`, token, 'PATCH', { state: 'closed' });
		}
		return;
	}
	try {
		await request(`${base}/labels/${LABEL}`, token);
	} catch (error) {
		if (error.status !== 404) throw error;
		await request(`${base}/labels`, token, 'POST', { name: LABEL, color: '1d76db', description: 'Starred repositories missing from the catalog' });
	}
	if (!issue) {
		await request(`${base}/issues`, token, 'POST', { title: TITLE, body, labels: [LABEL] });
	} else {
		const labels = issue.labels.map((label) => label.name);
		if (issue.body !== body || !labels.includes(LABEL)) {
			await request(`${base}/issues/${issue.number}`, token, 'PATCH', { body, labels: [...new Set([...labels, LABEL])] });
		}
	}
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const user = process.env.STAR_LIST_USER || '2wenty2wo';
	const slug = process.env.STAR_LIST_SLUG || 'mpc-sample';
	let token = process.env.STAR_LIST_TOKEN || process.env.GITHUB_TOKEN;
	if (!token && dryRun) token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
	if (!token) throw new Error(`A GitHub token is required. ${TOKEN_HELP}`);
	if (!dryRun && (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY)) {
		throw new Error('Issue updates require GITHUB_TOKEN and GITHUB_REPOSITORY; use --dry-run for local previews.');
	}
	const catalog = readEntries().map(({ record }) => record);
	const result = compareRepositories(await readStarList(token, user, slug), catalog, process.env.GITHUB_REPOSITORY || '2wenty2wo/samplemods');
	console.log(`missing: ${result.missing.length}\nextra: ${result.extra.length}`);
	for (const mod of result.extra) console.log(`Extra (info only): ${mod.repo}`);
	const body = formatIssueBody(result, `https://github.com/stars/${encodeURIComponent(user)}/lists/${encodeURIComponent(slug)}`);
	if (dryRun) {
		if (result.missing.length) console.log(`\n${TITLE}\n\n${body}`);
		console.log('Dry run: no issue changes.');
	} else {
		await syncIssue(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY, result, body);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
