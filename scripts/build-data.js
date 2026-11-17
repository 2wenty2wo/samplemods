import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';
import { renderMarkdown } from './render-markdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'static', 'media');
const githubPath = path.join(root, 'data', 'github.json');
const outPath = path.join(root, 'src', 'lib', 'data.json');
const publicCatalogPath = path.join(root, 'static', 'catalog.json');
const detailsPath = path.join(root, 'src', 'lib', 'server', 'details.json');
const details = {};

const entries = readEntries();
// Only this generated directory is cleared; original media stays with each entry.
fs.rmSync(mediaDir, { recursive: true, force: true });

let github = {};
if (fs.existsSync(githubPath)) {
	github = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
}

/** @type {Array<Record<string, unknown>>} */
const mods = entries.map(({ id, section, dir, record: raw, media }) => {
	const gh = raw.repo ? github[raw.repo] ?? {} : {};
	const markdownOptions = { repo: raw.repo, website: raw.website, branch: gh.default_branch ?? 'main', readmePath: gh.readme_path ?? 'README.md', name: raw.name };
	const readmePath = raw.repo ? path.join(root, 'data', 'readme', `${id}.md`) : path.join(dir, 'about.md');
	details[id] = {
		readme_html: fs.existsSync(readmePath) ? renderMarkdown(fs.readFileSync(readmePath, 'utf8'), markdownOptions) : '',
		releases: (gh.releases ?? []).map(({ body, ...release }) => ({
			...release, body_html: renderMarkdown(body, { ...markdownOptions, readmePath: 'README.md', name: '' })
		}))
	};
	for (const file of media) {
		const destination = path.join(mediaDir, id, file);
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.copyFileSync(path.join(dir, file), destination);
	}
	const logo = media.find((file) => file.startsWith('logo.'));
	return {
		id,
		section,
		...raw,
		price: raw.price ?? 'free',
		source: raw.source ?? (raw.repo ? 'open' : 'closed'),
		stars: gh.stars ?? null,
		forks: gh.forks ?? null,
		pushed_at: gh.pushed_at ?? null,
		last_commit_at: gh.last_commit_at ?? null,
		contributors: gh.contributors ?? null,
		open_issues: gh.open_issues ?? null,
		license: gh.license ?? null,
		latest_release: raw.repo ? gh.latest_release ?? null : raw.version ? {
			tag: raw.version, published_at: raw.released ?? null, html_url: raw.website
		} : null,
		archived: gh.archived ?? null,
		github_description: gh.description ?? null,
		logo: logo ? `media/${id}/${logo}` : null,
		screenshots: media.filter((file) => file.startsWith('screenshots/')).map((file) => `media/${id}/${file}`)
	};
});

for (const mod of mods) {
	mod.required_by = mods
		.filter((m) => (m.requires ?? []).includes(mod.id))
		.map((m) => m.id);
	mod.launchers = mods
		.filter((m) => (m.compatible ?? []).includes(mod.id))
		.sort((a, b) => (a.status === 'archived') - (b.status === 'archived')) // active launchers first
		.map((m) => m.id);
}

mods.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const json = JSON.stringify(mods, null, 2) + '\n';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, json);
fs.mkdirSync(path.dirname(publicCatalogPath), { recursive: true });
fs.writeFileSync(publicCatalogPath, json);
fs.mkdirSync(path.dirname(detailsPath), { recursive: true });
fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2) + '\n');
console.log(
	`Wrote ${mods.length} catalog entries to ${path.relative(root, outPath)} and ${path.relative(root, publicCatalogPath)}`
);
