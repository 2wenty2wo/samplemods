import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { readEntries, SECTION_FILES } from './catalog.js';

const TITLE = 'Star list: repos missing from the catalog';
const LABEL = 'star-list';
const TOKEN_HELP = 'Add a STAR_LIST_TOKEN repository secret containing a classic or fine-grained PAT with public read access to the user star list.';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function repoId(name) {
	return name.split('/').at(-1).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const matches = (text, pattern) => [...new Set((text.match(pattern) ?? []).map((word) => word.toLowerCase()))];

function runtimeSignals(description, topics, readme, homepage) {
	const text = `${description ?? ''} ${topics.join(' ')}\n${readme}`;
	const browser = /^https?:\/\//.test(homepage ?? '') ? matches(text, /\b(?:web(?:[- ]midi)?|browser|react|vite)\b/gi) : [];
	const desktop = matches(text, /\b(?:electron|desktop|windows|macos|pyside\d*|qt\d*|tauri)\b/gi);
	const device = matches(text, /\b(?:autorun|aarch64|on[- ]device|boot[- ]thingy)\b/gi);
	const sd = matches(text, /\bsd[- ]cards?\b/gi);
	// Exporting files to an SD card does not make a desktop/browser companion a device app.
	if (sd.length && (device.length || (!browser.length && !desktop.length) || /\b(?:runs?|boots?)\b[^.\n]{0,60}\bsd[- ]card\b/i.test(text))) device.push(...sd);
	return { browser, desktop, device };
}

export function guessSection(description = '', topics = [], readme = '', homepage = '') {
	const primary = `${description ?? ''} ${topics.join(' ')}`;
	const signals = runtimeSignals(description, topics, readme, homepage);
	const library = matches(primary, /\b(?:sdk|library|framework)\b/gi);
	if (library.length) return { section: 'dev', reason: `description/topics: ${library.join(', ')}` };
	const game = matches(primary, /\b(?:games?|doom|emulator)\b/gi);
	if (game.length) return { section: 'games', reason: `description/topics: ${game.join(', ')}` };
	const guide = matches(primary, /\b(?:guide|handbook|manual[- ]only)\b/gi);
	if (guide.length && (!signals.device.length || /\b(?:guide (?:to|for)|handbook|manual[- ]only)\b/i.test(primary))) return { section: 'guides', reason: `description/topics: ${guide.join(', ')}` };
	const plugin = matches(primary, /\b(?:clap|vst[23]?|lv2)\s+plug-?ins?\b|\bplug-?in\s+(?:for|that|instrument|effect)\b/gi);
	const hostApp = matches(primary, /\b(?:replaces|own interface|groovebox|tracker|daw)\b/gi);
	if (plugin.length && !hostApp.length) return { section: 'plugins', reason: `description/topics: ${plugin.join(', ')}` };
	if (signals.device.length) {
		const app = hostApp.length ? hostApp : matches(primary, /\b(?:replaces|own interface|groovebox|tracker|daw)\b/gi);
		return { section: app.length ? 'apps' : 'mods', reason: `device keywords: ${[...signals.device, ...app].join(', ')}` };
	}
	if (signals.desktop.length || signals.browser.length) return { section: 'tools', reason: `desktop/browser keywords: ${[...signals.desktop, ...signals.browser].join(', ')}` };
	const rules = [
		['games', /\b(?:games?|doom|emulator)\b/gi],
		['guides', /\b(?:guide|manual|handbook)\b/gi],
		['plugins', /\b(?:clap|vst[23]?|lv2)\s+plug-?ins?\b|\bplug-?in\s+(?:for|that|instrument|effect)\b/gi],
		['dev', /\b(?:sdk|library|toolkit|framework)\b/gi],
		['tools', /\b(?:desktop|windows|web[- ]midi|browser)\b/gi],
		['apps', /\b(?:replaces|own interface|groovebox|tracker|daw)\b/gi]
	];
	for (const [source, text] of [['description/topics', `${description ?? ''} ${topics.join(' ')}`], ['README', readme]]) {
		for (const [section, pattern] of rules) {
			const found = matches(text, pattern);
			if (found.length) return { section, reason: `${source}: ${found.join(', ')}` };
		}
	}
	return { section: 'mods', reason: 'No matching keywords; default to mods.' };
}

export function guessName(metadata, readme = '') {
	const prefix = metadata.description?.replace(/\s+/g, ' ').match(/^(.{1,80}?)(?:\s[—–-]\s|:\s)/)?.[1];
	if (prefix && !/^(?:a|an|the|this)\b/i.test(prefix)) return { name: prefix.trim(), reason: 'product prefix in repository description' };
	const heading = readme.match(/^#\s+(.+?)(?:\s+#+)?\s*$/m)?.[1]
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>|[*`]/g, '').trim();
	if (heading) return { name: heading, reason: 'first README H1' };
	return { name: metadata.full_name.split('/').at(-1).replace(/[._-]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase()), reason: 'repository name fallback' };
}

export function guessFields(metadata, readme, section) {
	const topics = metadata.topics ?? [];
	const text = `${metadata.description ?? ''} ${topics.join(' ')}\n${readme}`;
	const signals = runtimeSignals(metadata.description, topics, readme, metadata.homepage);
	const fields = {};
	const evidence = {};
	const runs = section === 'guides' ? ['docs'] : Object.entries(signals).filter(([, words]) => words.length).map(([platform]) => platform);
	if (section === 'guides') signals.docs = ['guide/manual/handbook section'];
	if (runs.length) fields.runs_on = runs;
	evidence.runs_on = runs.length ? runs.map((platform) => `${platform}: ${signals[platform].join(', ')}`).join('; ') : 'no runtime keywords found';
	const webInstaller = matches(text, /\bweb[- ]installer\b/gi);
	const boot = matches(text, /\bboot[- ]thingy\b/gi);
	const sd = matches(text, /\b(?:sd[- ]cards?|autorun)\b/gi);
	if (section === 'guides') { fields.install = 'none'; evidence.install = 'docs-only runtime'; }
	else if (webInstaller.length) { fields.install = 'web-installer'; evidence.install = webInstaller.join(', '); }
	else if (boot.length) { fields.install = 'boot-thingy'; evidence.install = boot.join(', '); }
	else if (runs.includes('device') && sd.length) { fields.install = 'sd-card'; evidence.install = sd.join(', '); }
	else if (runs.includes('desktop') && section !== 'dev') { fields.install = 'desktop'; evidence.install = signals.desktop.join(', '); }
	else if (runs.length === 1 && runs[0] === 'browser') { fields.install = 'none'; evidence.install = 'browser-only runtime'; }
	else evidence.install = 'installation route unclear; omitted';
	fields.audience = section === 'dev' ? ['developer'] : section === 'games' ? ['player', 'musician'] : section === 'guides' ? ['curious'] : ['musician'];
	evidence.audience = `${section} section default`;
	const generic = new Set(['akai', 'akai-mpc', 'mpc', 'mpc-sample', 'music', 'audio', 'opensource', 'open-source', 'music-production']);
	const tags = [...new Set(topics.map((topic) => topic.toLowerCase()))].filter((topic) => !generic.has(topic)).slice(0, 4);
	if (tags.length) fields.tags = tags;
	evidence.tags = tags.length ? `repository topics: ${tags.join(', ')}` : 'no non-generic repository topics; omitted';
	return { fields, evidence };
}

export function draftEntry(metadata, readme = '', existingIds = new Set()) {
	const [author, repositoryName] = metadata.full_name.split('/');
	const id = repoId(repositoryName);
	if (!id || existingIds.has(id)) return null;
	const guess = guessSection(metadata.description, metadata.topics, readme, metadata.homepage);
	const { name, reason: nameReason } = guessName(metadata, readme);
	const text = metadata.description?.replace(/\s+/g, ' ').trim();
	const record = { name, description: text ? text[0].toUpperCase() + text.slice(1).replace(/[.!?]+$/, '') + '.' : 'TODO: describe',
		repo: metadata.full_name, author };
	if (metadata.homepage) record.website = metadata.homepage;
	const facts = guessFields(metadata, readme, guess.section);
	Object.assign(record, facts.fields);
	const evidence = { section: guess.reason, name: nameReason, description: text ? 'repository description, normalized punctuation' : 'description absent; TODO fallback', ...facts.evidence };
	return { id, ...guess, record, evidence, branch: `auto/add-${id}`, path: `data/${guess.section}/${id}/${SECTION_FILES[guess.section]}`,
		yaml: yaml.dump(record, { lineWidth: 100, noRefs: true }) };
}

export function formatPullRequestBody(draft, listUrl, validation = null) {
	const lines = [`Draft catalog entry for [${draft.record.repo}](https://github.com/${draft.record.repo}), found in the [star list](${listUrl}).`, '',
		'Each inferred field below is a **GUESS** to check.', '',
		...['section', 'name', 'description', 'install', 'runs_on', 'audience', 'tags'].map((field) => {
			const value = field === 'section' ? draft.section : draft.record[field];
			return `- **${field}**: ${markdownText(Array.isArray(value) ? value.join(', ') : value ?? 'omitted')} — ${markdownText(draft.evidence[field])}`;
		}), '',
		'- [ ] Section correct', '- [ ] Name correct', '- [ ] Description reads well', '- [ ] Install & runs on correct', '- [ ] Audience correct', '- [ ] Add a splash image to `screenshots/01-*.png` if available', '',
		validation ? `Validation: npm test ${validation.passed ? 'passed.' : 'failed; this PR is a draft.'}` : 'Validation: npm test will run before PR creation.'];
	if (validation && !validation.passed) {
		const error = validation.output.slice(-6000).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
		lines.push('', '<details><summary>Validation error</summary>', '', `<pre>${error}</pre>`, '', '</details>');
	}
	return lines.join('\n');
}

export function validateDraft(draft, workspace = root) {
	const file = path.join(workspace, draft.path);
	const dir = path.dirname(file);
	if (fs.existsSync(dir)) throw new Error(`Entry directory already exists: ${dir}`);
	fs.mkdirSync(dir, { recursive: true });
	try {
		fs.writeFileSync(file, draft.yaml, { flag: 'wx' });
		const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/d', '/s', '/c', 'npm test'] : ['test'], {
			cwd: workspace, encoding: 'utf8', maxBuffer: 1024 * 1024
		});
		return { passed: result.status === 0, output: [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n') };
	} finally {
		if (fs.existsSync(file)) fs.unlinkSync(file);
		fs.rmdirSync(dir);
	}
}

export function runGh(args, token) {
	return execFileSync('gh', args, { encoding: 'utf8', env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token }, maxBuffer: 1024 * 1024 });
}

export async function syncPullRequest(token, repository, draft, listUrl, { gh = runGh, validate = validateDraft } = {}) {
	if (draft.branch !== `auto/add-${draft.id}` || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) throw new Error('Refusing to write outside auto/add-<id>.');
	const existing = JSON.parse(gh(['pr', 'list', '--repo', repository, '--state', 'open', '--head', draft.branch, '--json', 'url', '--limit', '1'], token));
	if (existing.length) return existing[0].url;
	const base = `repos/${repository}`;
	const branch = await optionalRequest(`${base}/git/ref/heads/${draft.branch}`, token);
	let candidate = draft;
	const previous = branch && await optionalRequest(`${base}/contents/${draft.path}?ref=${encodeURIComponent(draft.branch)}`, token);
	if (previous) candidate = { ...draft, yaml: Buffer.from(previous.content, 'base64').toString('utf8') };
	let validation;
	try { validation = validate(candidate); }
	catch (error) { validation = { passed: false, output: error.message }; }
	if (!branch) {
		const main = await request(`${base}/git/ref/heads/main`, token);
		await request(`${base}/git/refs`, token, 'POST', { ref: `refs/heads/${draft.branch}`, sha: main.object.sha });
	}
	if (!previous) await request(`${base}/contents/${draft.path}`, token, 'PUT', {
		message: `Add draft entry for ${draft.record.repo}`, branch: draft.branch, content: Buffer.from(draft.yaml).toString('base64')
	});
	await ensureLabel(token, repository);
	return createCatalogPullRequest(token, repository, {
		branch: draft.branch,
		title: `Add ${draft.record.name} (${draft.section})`,
		body: formatPullRequestBody(draft, listUrl, validation),
		label: LABEL,
		isDraft: !validation.passed
	}, gh);
}

export function createCatalogPullRequest(token, repository, { branch, title, body, label, isDraft }, gh = runGh) {
	const bodyFile = path.join(os.tmpdir(), `catalog-pr-${randomUUID()}.md`);
	fs.writeFileSync(bodyFile, body, { flag: 'wx' });
	try {
		return gh(['pr', 'create', '--repo', repository, '--base', 'main', '--head', branch, '--title', title,
			...(label ? ['--label', label] : []), '--body-file', bodyFile, ...(isDraft ? ['--draft'] : [])], token).trim();
	} catch (error) {
		const detail = `${error.message}\n${error.stderr ?? ''}`;
		if (/403|not permitted.*(?:create|approve).*pull requests/i.test(detail)) {
			throw new Error(`${detail}\nEnable "Allow GitHub Actions to create and approve pull requests" in repository Settings > Actions > General > Workflow permissions. The workflow also needs contents, pull-requests and issues write permissions.`);
		}
		throw error;
	} finally { fs.unlinkSync(bodyFile); }
}

export function compareRepositories(starred, catalog, catalogRepo = '2wenty2wo/samplemods') {
	const list = new Map(starred.filter((repo) => repo.nameWithOwner).map((repo) => [repo.nameWithOwner.toLowerCase(), repo]));
	const entries = new Map(catalog.filter((mod) => mod.repo).map((mod) => [mod.repo.toLowerCase(), mod]));
	list.delete(catalogRepo.toLowerCase());
	entries.delete(catalogRepo.toLowerCase());
	return {
		missing: [...list].filter(([key]) => !entries.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([, repo]) => repo),
		extra: [...entries].filter(([key]) => !list.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([, mod]) => mod)
	};
}

export async function request(endpoint, token, method = 'GET', body) {
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

export async function optionalRequest(endpoint, token, api = request) {
	try { return await api(endpoint, token); }
	catch (error) { if (error.status === 404) return null; throw error; }
}

async function ensureLabel(token, repository) {
	if (!await optionalRequest(`repos/${repository}/labels/${LABEL}`, token)) {
		await request(`repos/${repository}/labels`, token, 'POST', { name: LABEL, color: '1d76db', description: 'Starred repositories missing from the catalog' });
	}
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

export function markdownText(text) {
	return String(text ?? 'No description provided.').replace(/\s+/g, ' ')
		.replace(/[\\`*_{}\[\]<>#|~]/g, '\\$&').replaceAll('@', '&#64;');
}

export function formatIssueBody({ missing, extra }, listUrl, pulls = {}) {
	const lines = [`Repositories in the [star list](${listUrl}) that need catalog entries:`, ''];
	for (const repo of missing) {
		const pull = pulls[repo.nameWithOwner.toLowerCase()];
		lines.push(`- [ ] [${repo.nameWithOwner}](https://github.com/${repo.nameWithOwner}): ${markdownText(repo.description)} · ★${repo.stargazerCount}${pull ? ` · [Review PR](${pull})` : ''}`);
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
	await ensureLabel(token, repository);
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
		throw new Error('PR and issue updates require GITHUB_TOKEN and GITHUB_REPOSITORY; use --dry-run for local previews.');
	}
	const repository = process.env.GITHUB_REPOSITORY || '2wenty2wo/samplemods';
	const entries = readEntries();
	const ids = new Set(entries.map((entry) => entry.id));
	const result = compareRepositories(await readStarList(token, user, slug), entries.map(({ record }) => record), repository);
	console.log(`missing: ${result.missing.length}\nextra: ${result.extra.length}`);
	for (const mod of result.extra) console.log(`Extra (info only): ${mod.repo}`);
	const listUrl = `https://github.com/stars/${encodeURIComponent(user)}/lists/${encodeURIComponent(slug)}`;
	const pulls = {};
	let failed = false;
	for (const repo of result.missing) {
		const id = repoId(repo.nameWithOwner);
		if (!id || ids.has(id)) { console.log(`Skipped ${repo.nameWithOwner}: id "${id}" is unavailable or already in the catalog.`); continue; }
		try {
			if (!/^[\w.-]+\/[\w.-]+$/.test(repo.nameWithOwner)) throw new Error(`Invalid GitHub repository: ${repo.nameWithOwner}`);
			const metadata = await request(`repos/${repo.nameWithOwner}`, token);
			const readme = await optionalRequest(`repos/${repo.nameWithOwner}/readme`, token);
			const draft = draftEntry(metadata, readme ? Buffer.from(readme.content, 'base64').toString('utf8') : '', ids);
			if (!draft) { console.log(`Skipped ${metadata.full_name}: id already exists or cannot be generated.`); continue; }
			ids.add(draft.id);
			if (dryRun) {
				console.log(`\nWould open PR: Add ${draft.record.name} (${draft.section})\nBranch: ${draft.branch}\nFile: ${draft.path}\n\n${draft.yaml}\n${formatPullRequestBody(draft, listUrl)}`);
			} else {
				const url = await syncPullRequest(process.env.GITHUB_TOKEN, repository, draft, listUrl);
				pulls[repo.nameWithOwner.toLowerCase()] = url;
				console.log(`${repo.nameWithOwner}: ${url}`);
			}
		} catch (error) { failed = true; console.error(`${repo.nameWithOwner}: ${error.message}`); }
	}
	const body = formatIssueBody(result, listUrl, pulls);
	if (dryRun) {
		if (result.missing.length) console.log(`\n${TITLE}\n\n${body}`);
		console.log('Dry run: no branch, PR or issue changes.');
	} else {
		await syncIssue(process.env.GITHUB_TOKEN, repository, result, body);
	}
	if (failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
