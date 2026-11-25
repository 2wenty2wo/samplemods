import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries, SECTION_FILES } from './catalog.js';
import { optionalRequest, request } from './check-star-list.js';

export const TITLE = 'Firmware mentions to review';
export const LABEL = 'firmware-watch';

const CLOSE_COMMENT = 'No firmware mentions to review.';
const GUIDANCE =
	'Confirm the maker states support (not a \'does not work\' warning), then add the build to `firmware` as `1.x.x.x (vX+)`. False alarm? Add it to `firmware_ignore`.';
const BUILD_RE = () => /\b(1\.[3-9]\.\d+\.\d+)\b/g;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Builds already declared on the entry's firmware string. */
export function parseListedBuilds(firmware) {
	if (!firmware) return [];
	return [...String(firmware).matchAll(BUILD_RE())].map((match) => match[1]);
}

function trimQuote(line) {
	const text = line.trim().replace(/\s+/g, ' ');
	return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

function buildsOnFirmwareLines(text) {
	const hits = [];
	if (!text) return hits;
	for (const raw of String(text).split(/\r?\n/)) {
		if (!/firmware/i.test(raw)) continue;
		for (const match of raw.matchAll(BUILD_RE())) {
			hits.push({ build: match[1], quote: trimQuote(raw) });
		}
	}
	return hits;
}

function earliestReleaseForBuild(releases, build) {
	const matches = [];
	for (const release of releases ?? []) {
		const hits = buildsOnFirmwareLines(release.body ?? '');
		if (hits.some((hit) => hit.build === build)) {
			matches.push(release);
		}
	}
	if (!matches.length) return null;
	return matches.sort((a, b) => String(a.published_at ?? '').localeCompare(String(b.published_at ?? '')))[0];
}

/** Scan one entry's cached README + release bodies for missing firmware builds. */
export function scanEntry(entry, { readme = '', releases = [] } = {}) {
	const { id, section, record } = entry;
	if (!record.firmware) return [];
	const listed = new Set(parseListedBuilds(record.firmware));
	const ignored = new Set(record.firmware_ignore ?? []);
	const byBuild = new Map();

	for (const hit of buildsOnFirmwareLines(readme)) {
		if (listed.has(hit.build) || ignored.has(hit.build)) continue;
		if (!byBuild.has(hit.build)) {
			byBuild.set(hit.build, {
				id,
				section,
				build: hit.build,
				quote: hit.quote,
				source: { type: 'readme' },
				earliestRelease: null
			});
		}
	}

	for (const release of releases) {
		for (const hit of buildsOnFirmwareLines(release.body ?? '')) {
			if (listed.has(hit.build) || ignored.has(hit.build)) continue;
			if (!byBuild.has(hit.build)) {
				byBuild.set(hit.build, {
					id,
					section,
					build: hit.build,
					quote: hit.quote,
					source: { type: 'release', tag: release.tag, html_url: release.html_url },
					earliestRelease: null
				});
			}
		}
	}

	for (const flag of byBuild.values()) {
		const earliest = earliestReleaseForBuild(releases, flag.build);
		if (earliest) {
			flag.earliestRelease = {
				tag: earliest.tag,
				html_url: earliest.html_url,
				published_at: earliest.published_at ?? null
			};
		}
	}

	return [...byBuild.values()].sort((a, b) => a.build.localeCompare(b.build));
}

/** Scan all catalog entries using a sources map keyed by entry id. */
export function scanFlags(entries, sourcesById) {
	const flags = [];
	for (const entry of entries) {
		flags.push(...scanEntry(entry, sourcesById[entry.id] ?? {}));
	}
	return flags.sort((a, b) => a.id.localeCompare(b.id) || a.build.localeCompare(b.build));
}

export function formatIssueBody(flags, repository) {
	const lines = ['Firmware builds mentioned upstream that are not yet listed on the catalog entry:', ''];
	for (const flag of flags) {
		const yaml = `https://github.com/${repository}/blob/main/data/${flag.section}/${flag.id}/${SECTION_FILES[flag.section]}`;
		const source = flag.source.type === 'readme'
			? 'README cache'
			: `release [${flag.source.tag}](${flag.source.html_url})`;
		const earliest = flag.earliestRelease
			? ` · earliest release: [${flag.earliestRelease.tag}](${flag.earliestRelease.html_url})`
			: '';
		lines.push(`- [ ] \`${flag.id}\` (${flag.section}) — \`${flag.build}\` · [entry YAML](${yaml})`);
		lines.push(`  > ${flag.quote}`);
		lines.push(`  Source: ${source}${earliest}`);
		lines.push('');
	}
	lines.push(GUIDANCE);
	return lines.join('\n');
}

async function ensureLabel(token, repository) {
	if (!await optionalRequest(`repos/${repository}/labels/${LABEL}`, token)) {
		await request(`repos/${repository}/labels`, token, 'POST', {
			name: LABEL,
			color: 'fbca04',
			description: 'Upstream firmware builds to review for catalog entries'
		});
	}
}

/** Find by exact title among open issues; create/update one issue or close when empty. */
export async function syncFirmwareIssue(token, repository, flags, body) {
	const base = `repos/${repository}`;
	let page = 1;
	let issues;
	let issue;
	do {
		issues = await request(`${base}/issues?state=open&per_page=100&page=${page++}`, token);
		issue = issues.find((entry) => !entry.pull_request && entry.title === TITLE);
	} while (!issue && issues.length === 100);

	if (!flags.length) {
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

function loadSources(entries, dataDir) {
	const githubPath = path.join(dataDir, 'github.json');
	const github = fs.existsSync(githubPath) ? JSON.parse(fs.readFileSync(githubPath, 'utf8')) : {};
	const readmeDir = path.join(dataDir, 'readme');
	const sources = {};
	for (const { id, record } of entries) {
		if (!record.firmware) continue;
		const readmePath = path.join(readmeDir, `${id}.md`);
		const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '';
		const releases = record.repo ? (github[record.repo]?.releases ?? []) : [];
		sources[id] = { readme, releases };
	}
	return sources;
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const dataDir = path.join(root, 'data');
	const entries = readEntries(dataDir);
	const flags = scanFlags(entries, loadSources(entries, dataDir));
	const repository = process.env.GITHUB_REPOSITORY || '2wenty2wo/samplemods';
	const body = flags.length ? formatIssueBody(flags, repository) : '';

	if (dryRun) {
		if (!flags.length) {
			console.log('Dry run: no firmware mentions to review.');
			return;
		}
		console.log(`${TITLE}\n\n${body}`);
		return;
	}

	const token = process.env.GITHUB_TOKEN;
	if (!token || !process.env.GITHUB_REPOSITORY) {
		throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required; use --dry-run for local previews.');
	}
	await syncFirmwareIssue(token, process.env.GITHUB_REPOSITORY, flags, body);
	console.log(flags.length
		? `Synced firmware watch issue (${flags.length} flag${flags.length === 1 ? '' : 's'}).`
		: 'Closed firmware watch issue (none remaining).');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
