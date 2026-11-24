import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import yaml from 'js-yaml';
import { readEntries, SECTION_FILES } from './catalog.js';
import { runGh, request, optionalRequest, markdownText } from './check-star-list.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRANCH = 'auto/status-suggestions';
const TITLE = 'Review catalog status suggestions';
const marker = /<!-- status-suggestions: (.*?) -->/;

export function suggestStatus(record, metadata = {}, readme = '') {
	if (!record.repo || record.status === 'removed') return null;
	const repoUrl = `https://github.com/${record.repo}`;
	if (metadata.archived === true && record.status !== 'archived') {
		return { status: 'archived', evidence: [{ text: 'GitHub repository is archived', url: repoUrl }] };
	}
	if (Object.hasOwn(record, 'status')) return null;
	if (record.repo.split('/').at(-1).toLowerCase().includes('beta')) {
		return { status: 'beta', evidence: [{ text: `Repository name: ${record.repo.split('/').at(-1)}`, url: repoUrl }] };
	}
	let fence = '';
	const lines = readme.replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\n]/g, '')).split(/\r?\n/).map(line => {
		const delimiter = line.trim().match(/^(`{3,}|~{3,})/);
		if (delimiter) { fence = fence ? '' : delimiter[1][0]; return ''; }
		if (fence) return '';
		return line.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '');
	});
	const heading = lines.findIndex(line => /^#{1,6}\s+\S/.test(line));
	const lineIndex = lines.findIndex((line, index) => {
		const text = line.replace(/[*_`]/g, '');
		return (index < 40 || index === heading) && /\bbeta\b/i.test(text)
			&& (index === heading || /\b(?:public|first|open|closed|early)\s+beta\b|\b(?:is|in|status:?)\s+(?:an?\s+)?beta\b|^[\s>*#-]*beta\b/i.test(text))
			&& !/\b(?:not|no longer|out of)\s+(?:an?\s+)?beta\b|\bbeta\s+(?:is\s+)?(?:over|ended)\b/i.test(text);
	});
	if (lineIndex !== -1) {
		const branch = encodeURIComponent(metadata.default_branch ?? 'HEAD');
		const readmePath = (metadata.readme_path ?? 'README.md').split('/').map(encodeURIComponent).join('/');
		return { status: 'beta', evidence: [{ text: lines[lineIndex].trim(), url: `${repoUrl}/blob/${branch}/${readmePath}#L${lineIndex + 1}` }] };
	}
	const releases = metadata.releases ?? [];
	if (releases.length && releases.every(release => release.prerelease === true)) {
		return { status: 'beta', evidence: releases.map(release => ({ text: `Prerelease: ${release.tag ?? release.name ?? 'release'}`, url: release.html_url ?? `${repoUrl}/releases` })) };
	}
	return null;
}

export function statusSuggestions(entries, github, readmes) {
	return entries.flatMap(({ id, section, record }) => {
		const suggestion = suggestStatus(record, github[record.repo], readmes[id]);
		return suggestion ? [{ id, path: `data/${section}/${id}/${SECTION_FILES[section]}`, repo: record.repo, name: record.name ?? id, ...suggestion }] : [];
	}).sort((a, b) => a.id.localeCompare(b.id));
}

export function setStatus(text, status) {
	if (!['beta', 'archived'].includes(status)) throw new Error('Unsupported suggested status');
	if (/^status:/m.test(text)) {
		return text.replace(/^(status:[ \t]*)[^\r\n#]*?([ \t]*(?:#[^\r\n]*)?)(?=\r?$)/m, `$1${status}$2`);
	}
	const author = /^author:[^\r\n]*(?:\r?\n|$)/m;
	if (!author.test(text)) throw new Error('Cannot insert status without an author line');
	const newline = text.includes('\r\n') ? '\r\n' : '\n';
	return text.replace(author, line => `${line}${line.endsWith('\n') ? '' : newline}status: ${status}${newline}`);
}

function pairs(suggestions) {
	return suggestions.map(({ id, status }) => ({ id, status })).sort((a, b) => a.id.localeCompare(b.id));
}

function readMarker(body = '') {
	try {
		const result = JSON.parse(body.match(marker)?.[1] ?? '[]');
		return Array.isArray(result) ? result.filter(pair => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pair.id) && ['beta', 'archived'].includes(pair.status)) : [];
	} catch { return []; }
}

export function formatStatusBody(suggestions) {
	return [
		'Proposed status changes from the latest cached GitHub metadata and README. Review before merging; existing statuses are preserved except when GitHub archives a repository.', '',
		'| Entry | Suggested status | Evidence |', '| --- | --- | --- |',
		...suggestions.map(suggestion => `| ${markdownText(suggestion.name)} | ${suggestion.status} | ${suggestion.evidence.map(item => `“${markdownText(item.text)}” ([source](${item.url}))`).join('; ')} |`), '',
		...(suggestions.length ? [] : ['No current status suggestions.', '']),
		'Closing this PR without merging suppresses these entry/status pairs. To allow a rejected pair again, edit the closed PR’s hidden status-suggestions comment and remove that pair.', '',
		`<!-- status-suggestions: ${JSON.stringify(pairs(suggestions))} -->`
	].join('\n');
}

export async function syncStatusSuggestions(token, repository, suggestions, { api = request, gh = runGh } = {}) {
	for (const suggestion of suggestions) {
		const match = suggestion.path.match(/^data\/([^/]+)\/([^/]+)\/([^/]+)$/);
		if (!match || !Object.hasOwn(SECTION_FILES, match[1]) || match[2] !== suggestion.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(match[2]) || match[3] !== SECTION_FILES[match[1]]) {
			throw new Error(`Refusing unexpected status path: ${suggestion.path}`);
		}
	}
	const open = JSON.parse(gh(['pr', 'list', '--repo', repository, '--state', 'open', '--base', 'main', '--head', BRANCH, '--json', 'number,url,body', '--limit', '1'], token))[0];
	const base = `repos/${repository}`;
	const rejected = new Set();
	if (suggestions.length) {
		for (let page = 1; ; page++) {
			const closed = await api(`${base}/pulls?state=closed&base=main&per_page=100&page=${page}`, token);
			for (const pull of closed) {
				if (pull.head?.ref === BRANCH && !pull.merged_at) {
					for (const pair of readMarker(pull.body)) rejected.add(`${pair.id}:${pair.status}`);
				}
			}
			if (closed.length < 100) break;
		}
	}
	let candidates = suggestions.filter(item => !rejected.has(`${item.id}:${item.status}`));
	let main;
	const tree = [];
	if (candidates.length) {
		main = await api(`${base}/git/ref/heads/main`, token);
		const current = [];
		for (const candidate of candidates) {
			const file = await api(`${base}/contents/${candidate.path}?ref=${main.object.sha}`, token);
			if (file.encoding !== 'base64') throw new Error(`Expected base64 YAML: ${candidate.path}`);
			const text = Buffer.from(file.content, 'base64').toString('utf8');
			const record = yaml.load(text);
			if (record.repo !== candidate.repo || record.status === 'removed' || record.status === candidate.status || (candidate.status !== 'archived' && Object.hasOwn(record, 'status'))) continue;
			const content = setStatus(text, candidate.status);
			if (!isDeepStrictEqual(yaml.load(content), { ...record, status: candidate.status })) throw new Error(`Status edit would change other YAML fields: ${candidate.path}`);
			tree.push({ path: candidate.path, mode: '100644', type: 'blob', content });
			current.push({ ...candidate, name: record.name ?? candidate.name });
		}
		candidates = current;
	}
	const body = formatStatusBody(candidates);
	const bodyFile = path.join(os.tmpdir(), `mpc-status-${randomUUID()}.md`);
	const withBody = callback => {
		fs.writeFileSync(bodyFile, body, { flag: 'wx' });
		try { return callback(); } finally { fs.unlinkSync(bodyFile); }
	};
	if (!candidates.length) {
		if (open) {
			// Clear active pairs before automatic closure so it does not count as a user rejection.
			withBody(() => gh(['pr', 'edit', String(open.number), '--repo', repository, '--body-file', bodyFile], token));
			gh(['pr', 'close', String(open.number), '--repo', repository], token);
		}
		return 'No status suggestions.';
	}
	if (open && JSON.stringify(pairs(readMarker(open.body))) === JSON.stringify(pairs(candidates))) return `Unchanged: ${open.url}`;
	const commit = await api(`${base}/git/commits/${main.object.sha}`, token);
	const nextTree = await api(`${base}/git/trees`, token, 'POST', { base_tree: commit.tree.sha, tree });
	const nextCommit = await api(`${base}/git/commits`, token, 'POST', { message: 'chore: suggest catalog statuses', tree: nextTree.sha, parents: [main.object.sha] });
	const branch = await optionalRequest(`${base}/git/ref/heads/${BRANCH}`, token, api);
	if (branch) await api(`${base}/git/refs/heads/${BRANCH}`, token, 'PATCH', { sha: nextCommit.sha, force: true });
	else await api(`${base}/git/refs`, token, 'POST', { ref: `refs/heads/${BRANCH}`, sha: nextCommit.sha });
	return withBody(() => open
		? (gh(['pr', 'edit', String(open.number), '--repo', repository, '--body-file', bodyFile], token), `Updated: ${open.url}`)
		: gh(['pr', 'create', '--repo', repository, '--base', 'main', '--head', BRANCH, '--title', TITLE, '--body-file', bodyFile], token).trim());
}

async function main() {
	const github = JSON.parse(fs.readFileSync(path.join(root, 'data/github.json'), 'utf8'));
	const entries = readEntries();
	const readmes = Object.fromEntries(entries.map(({ id }) => {
		const file = path.join(root, 'data/readme', `${id}.md`);
		return [id, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''];
	}));
	const suggestions = statusSuggestions(entries, github, readmes);
	if (process.argv.includes('--dry-run')) {
		console.log(`Dry run (cached data only; closed-PR history is not consulted): ${suggestions.length} status suggestion(s).`);
		for (const item of suggestions) console.log(`${item.id}: ${item.status} — ${item.evidence.map(evidence => `${evidence.text} (${evidence.url})`).join('; ')}`);
		return;
	}
	if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) throw new Error('Status PR updates require GITHUB_TOKEN and GITHUB_REPOSITORY; use --dry-run locally.');
	console.log(await syncStatusSuggestions(process.env.GITHUB_TOKEN, process.env.GITHUB_REPOSITORY, suggestions));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
