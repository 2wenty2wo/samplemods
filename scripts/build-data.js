import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEntries } from './catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'static', 'media');
const githubPath = path.join(root, 'data', 'github.json');
const outPath = path.join(root, 'src', 'lib', 'data.json');
const publicCatalogPath = path.join(root, 'static', 'catalog.json');

const entries = readEntries();
// Only this generated directory is cleared; original media stays with each entry.
fs.rmSync(mediaDir, { recursive: true, force: true });

let github = {};
if (fs.existsSync(githubPath)) {
	github = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
}

/** @type {Array<Record<string, unknown>>} */
const mods = entries.map(({ id, section, dir, record: raw, media }) => {
	const gh = github[raw.repo] ?? {};
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
		stars: gh.stars ?? null,
		forks: gh.forks ?? null,
		pushed_at: gh.pushed_at ?? null,
		license: gh.license ?? null,
		latest_release: gh.latest_release ?? null,
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
}

mods.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const json = JSON.stringify(mods, null, 2) + '\n';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, json);
fs.mkdirSync(path.dirname(publicCatalogPath), { recursive: true });
fs.writeFileSync(publicCatalogPath, json);
console.log(
	`Wrote ${mods.length} catalog entries to ${path.relative(root, outPath)} and ${path.relative(root, publicCatalogPath)}`
);
