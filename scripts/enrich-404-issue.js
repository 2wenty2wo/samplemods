import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTION_FILES } from './catalog.js';
import { optionalRequest, request } from './check-star-list.js';

export const TITLE = 'Metadata sync: repos returning 404';
export const LABEL = 'enrich-404';

const CLOSE_COMMENT = 'No retained 404 repositories remain.';
const GUIDANCE =
	'If the repo is gone for good, set `status: removed` in the entry YAML; if it was renamed, update `repo`.';

/** Active catalog entries whose repos 404'd during enrich (excludes status: removed). */
export function open404Entries(entries, retainedRepos) {
	return entries
		.filter(({ record }) => record.repo && retainedRepos.has(record.repo) && record.status !== 'removed')
		.map(({ id, section, record }) => ({ id, section, repo: record.repo }))
		.sort((a, b) => a.id.localeCompare(b.id) || a.section.localeCompare(b.section));
}

export function format404IssueBody(rows, repository) {
	const lines = [
		'Entry repositories that returned HTTP 404 during metadata sync:',
		''
	];
	for (const { id, section, repo } of rows) {
		const yaml = `https://github.com/${repository}/blob/main/data/${section}/${id}/${SECTION_FILES[section]}`;
		lines.push(
			`- [ ] \`${id}\` (${section}) — [${repo}](https://github.com/${repo}) · [entry YAML](${yaml})`
		);
	}
	lines.push('', GUIDANCE);
	return lines.join('\n');
}

async function ensureLabel(token, repository) {
	if (!await optionalRequest(`repos/${repository}/labels/${LABEL}`, token)) {
		await request(`repos/${repository}/labels`, token, 'POST', {
			name: LABEL,
			color: 'd93f0b',
			description: 'Catalog entry repos that 404 during metadata sync'
		});
	}
}

/** Find by exact title among open issues; create/update one issue or close when empty. */
export async function sync404Issue(token, repository, rows, body) {
	const base = `repos/${repository}`;
	let page = 1;
	let issues;
	let issue;
	do {
		issues = await request(`${base}/issues?state=open&per_page=100&page=${page++}`, token);
		issue = issues.find((entry) => !entry.pull_request && entry.title === TITLE);
	} while (!issue && issues.length === 100);

	if (!rows.length) {
		if (issue) {
			await request(`${base}/issues/${issue.number}/comments`, token, 'POST', { body: CLOSE_COMMENT });
			await request(`${base}/issues/${issue.number}`, token, 'PATCH', { state: 'closed' });
		}
		return;
	}

	await ensureLabel(token, repository);
	if (!issue) {
		await request(`${base}/issues`, token, 'POST', { title: TITLE, body, labels: [LABEL] });
		return;
	}
	const labels = issue.labels.map((label) => label.name);
	if (issue.body !== body || !labels.includes(LABEL)) {
		await request(`${base}/issues/${issue.number}`, token, 'PATCH', {
			body,
			labels: [...new Set([...labels, LABEL])]
		});
	}
}

async function main() {
	const token = process.env.GITHUB_TOKEN;
	const repository = process.env.GITHUB_REPOSITORY;
	const reportPath = process.env.ENRICH_404_PATH;
	if (!token || !repository) {
		throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required to sync the 404 issue.');
	}
	if (!reportPath || !fs.existsSync(reportPath)) {
		console.log('No enrich 404 report; skipping issue sync.');
		return;
	}
	const rows = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
	if (!Array.isArray(rows)) throw new Error(`${reportPath}: expected a JSON array`);
	const body = rows.length ? format404IssueBody(rows, repository) : '';
	await sync404Issue(token, repository, rows, body);
	console.log(rows.length
		? `Synced 404 tracking issue (${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}).`
		: 'Closed 404 tracking issue (none remaining).');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
