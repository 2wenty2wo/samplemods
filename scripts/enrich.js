import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';
import {
	CATALOG_REPO,
	normalizeCatalogContributors
} from './catalog-contributors.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'data', 'github.json');
const contributorsOutput = path.join(root, 'data', 'contributors.json');
const readmeDir = path.join(root, 'data', 'readme');
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function request(endpoint, optional = false) {
	const response = await fetch(`https://api.github.com/repos/${endpoint}`, { headers });
	if (optional && [404, 409].includes(response.status)) return null;
	if (!response.ok) {
		const reset = response.headers.get('x-ratelimit-reset');
		const retry = response.headers.get('retry-after');
		const limit = response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' || retry;
		throw new Error(`GitHub ${endpoint}: HTTP ${response.status}${limit ? `; rate limited, retry ${retry ? `after ${retry} seconds` : reset ? `after ${new Date(Number(reset) * 1000).toISOString()}` : 'later'}. Use GITHUB_TOKEN for authenticated limits.` : ''}`);
	}
	return { data: response.status === 204 ? [] : await response.json(), headers: response.headers };
}

function writeIfChanged(file, text) {
	if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return;
	const temporary = `${file}.tmp`;
	fs.writeFileSync(temporary, text);
	fs.renameSync(temporary, file);
}

/** Paginate GitHub contributors for the catalog repository itself. */
async function fetchCatalogContributors() {
	const users = [];
	for (let page = 1; ; page += 1) {
		const result = await request(`${CATALOG_REPO}/contributors?per_page=100&page=${page}`);
		const batch = Array.isArray(result.data) ? result.data : [];
		users.push(...batch);
		const link = result.headers.get('link') ?? '';
		if (!link.includes('rel="next"') || batch.length === 0) break;
	}
	return normalizeCatalogContributors(users);
}

const entries = readEntries();
const repos = [...new Set(entries.map(({ record }) => record.repo).filter(Boolean))].sort();
const prefixRepos = new Set(
	entries.filter(({ record }) => record.repo && record.release_prefix).map(({ record }) => record.repo)
);
const github = {};
const readmes = new Map();
for (const repo of repos) {
	if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`Invalid GitHub repository: ${repo}`);
	const releaseLimit = prefixRepos.has(repo) ? 10 : 3;
	const { data: metadata } = await request(repo);
	const latest = await request(`${repo}/releases/latest`, true);
	const releases = await request(`${repo}/releases?per_page=${releaseLimit}`, true);
	const readme = await request(`${repo}/readme`, true);
	const contributors = await request(`${repo}/contributors?anon=true&per_page=1`, true);
	const commits = await request(`${repo}/commits?per_page=1`, true);
	const lastPage = contributors?.headers.get('link')?.match(/[?&]page=(\d+)[^>]*>; rel="last"/);
	const release = latest?.data;
	if (readme) {
		if (readme.data.encoding !== 'base64') throw new Error(`GitHub ${repo}/readme: expected base64 content`);
		readmes.set(repo, Buffer.from(readme.data.content, 'base64').toString('utf8').replace(/\r\n/g, '\n'));
	}
	github[repo] = {
		stars: metadata.stargazers_count,
		forks: metadata.forks_count,
		pushed_at: metadata.pushed_at,
		last_commit_at: commits?.data[0]?.commit.committer?.date ?? commits?.data[0]?.commit.author?.date ?? null,
		contributors: contributors ? lastPage ? Number(lastPage[1]) : contributors.data.length : 0,
		// GitHub's repository counter includes open pull requests.
		open_issues: metadata.open_issues_count,
		license: metadata.license?.spdx_id === 'NOASSERTION' ? null : metadata.license?.spdx_id ?? null,
		description: metadata.description,
		default_branch: metadata.default_branch,
		readme_path: readme?.data.path ?? null,
		latest_release: release ? { tag: release.tag_name, published_at: release.published_at } : null,
		releases: (releases?.data ?? []).filter((item) => !item.draft).slice(0, releaseLimit).map((item) => {
			const body = item.body ?? '';
			const limit = 12000;
			const end = body.length > limit ? body.lastIndexOf('\n\n', limit) : body.length;
			return { tag: item.tag_name, name: item.name, prerelease: item.prerelease, published_at: item.published_at, html_url: item.html_url,
				body: body.slice(0, end > limit / 2 ? end : limit), truncated: body.length > limit };
		}),
		archived: metadata.archived
	};
	console.log(`Fetched ${repo}.`);
}

const { data: catalogRepo } = await request(CATALOG_REPO);
const catalogContributors = await fetchCatalogContributors();
console.log(`Fetched ${catalogContributors.length} catalog contributor(s); ★${catalogRepo.stargazers_count}.`);

// Fetch everything before changing either cache, so API failures preserve the previous snapshot.
fs.mkdirSync(readmeDir, { recursive: true });
const keep = new Set();
for (const { id, dir, record } of entries) {
	if (!record.repo || !readmes.has(record.repo)) continue;
	if (fs.existsSync(path.join(dir, 'about.md'))) continue;
	const file = `${id}.md`;
	keep.add(file);
	writeIfChanged(path.join(readmeDir, file), readmes.get(record.repo));
}
for (const file of fs.readdirSync(readmeDir)) {
	if (file.endsWith('.md') && !keep.has(file)) fs.unlinkSync(path.join(readmeDir, file));
}
writeIfChanged(output, JSON.stringify(github, null, 2) + '\n');
writeIfChanged(contributorsOutput, JSON.stringify({
	stars: catalogRepo.stargazers_count,
	contributors: catalogContributors
}, null, 2) + '\n');
console.log(`Enriched ${repos.length} GitHub repositories and ${keep.size} READMEs.`);
