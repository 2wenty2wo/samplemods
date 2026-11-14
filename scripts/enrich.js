import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modsDir = path.join(root, 'data', 'mods');
const output = path.join(root, 'data', 'github.json');
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function request(endpoint, optional = false) {
	const response = await fetch(`https://api.github.com/repos/${endpoint}`, { headers });
	if (optional && response.status === 404) return null;
	if (!response.ok) throw new Error(`GitHub ${endpoint}: HTTP ${response.status}`);
	return response.json();
}

const repos = [...new Set(fs.readdirSync(modsDir)
	.filter((file) => file.endsWith('.yaml'))
	.map((file) => yaml.load(fs.readFileSync(path.join(modsDir, file), 'utf8')).repo))].sort();
const github = {};
for (const repo of repos) {
	if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`Invalid GitHub repository: ${repo}`);
	const metadata = await request(repo);
	const release = await request(`${repo}/releases/latest`, true);
	github[repo] = {
		stars: metadata.stargazers_count,
		forks: metadata.forks_count,
		pushed_at: metadata.pushed_at,
		license: metadata.license?.spdx_id === 'NOASSERTION' ? null : metadata.license?.spdx_id ?? null,
		description: metadata.description,
		latest_release: release ? { tag: release.tag_name, published_at: release.published_at } : null,
		archived: metadata.archived
	};
}

const json = JSON.stringify(github, null, 2) + '\n';
if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== json) {
	const temporary = `${output}.tmp`;
	fs.writeFileSync(temporary, json);
	fs.renameSync(temporary, output);
}
console.log(`Enriched ${repos.length} GitHub repositories.`);
