import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const modsDir = path.join(root, 'data', 'mods');
const staticModsDir = path.join(root, 'static', 'mods');
const githubPath = path.join(root, 'data', 'github.json');
const outPath = path.join(root, 'src', 'lib', 'data.json');
const publicCatalogPath = path.join(root, 'static', 'catalog.json');

const LOGO_EXTS = ['.svg', '.png', '.webp', '.jpg', '.jpeg'];
const SHOT_EXTS = ['.png', '.webp', '.jpg', '.jpeg', '.gif'];

/**
 * @param {string} id
 * @returns {{ logo: string | null, screenshots: string[] }}
 */
function scanModMedia(id) {
	const dir = path.join(staticModsDir, id);
	/** @type {string | null} */
	let logo = null;
	/** @type {string[]} */
	const screenshots = [];

	if (!fs.existsSync(dir)) {
		return { logo, screenshots };
	}

	for (const ext of LOGO_EXTS) {
		const candidate = path.join(dir, `logo${ext}`);
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
			logo = `mods/${id}/logo${ext}`;
			break;
		}
	}

	const shotsDir = path.join(dir, 'screenshots');
	if (fs.existsSync(shotsDir) && fs.statSync(shotsDir).isDirectory()) {
		const files = fs
			.readdirSync(shotsDir)
			.filter((f) => SHOT_EXTS.includes(path.extname(f).toLowerCase()))
			.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		for (const file of files) {
			screenshots.push(`mods/${id}/screenshots/${file}`);
		}
	}

	return { logo, screenshots };
}

const files = fs
	.readdirSync(modsDir)
	.filter((f) => f.endsWith('.yaml'))
	.sort();

let github = {};
if (fs.existsSync(githubPath)) {
	github = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
}

/** @type {Array<Record<string, unknown>>} */
const mods = files.map((file) => {
	const id = path.basename(file, '.yaml');
	const raw = yaml.load(fs.readFileSync(path.join(modsDir, file), 'utf8'));
	const gh = github[raw.repo] ?? {};
	const media = scanModMedia(id);
	return {
		id,
		...raw,
		stars: gh.stars ?? null,
		forks: gh.forks ?? null,
		pushed_at: gh.pushed_at ?? null,
		license: gh.license ?? null,
		latest_release: gh.latest_release ?? null,
		archived: gh.archived ?? null,
		github_description: gh.description ?? null,
		logo: media.logo,
		screenshots: media.screenshots
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
	`Wrote ${mods.length} mod(s) to ${path.relative(root, outPath)} and ${path.relative(root, publicCatalogPath)}`
);
