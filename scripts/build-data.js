import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseDisplayLabel } from '../src/lib/release-label.js';
import { readEntries } from './catalog.js';
import { renderMarkdown } from './render-markdown.js';
import { deriveVersionFromTitle } from './watch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mediaDir = path.join(root, 'static', 'media');
const githubPath = path.join(root, 'data', 'github.json');
const watchPath = path.join(root, 'data', 'watch.json');
const contributorsPath = path.join(root, 'data', 'contributors.json');
const outPath = path.join(root, 'src', 'lib', 'data.json');
const publicCatalogPath = path.join(root, 'static', 'catalog.json');
const detailsPath = path.join(root, 'src', 'lib', 'server', 'details.json');
const catalogMetaPath = path.join(root, 'src', 'lib', 'catalog-meta.json');
const details = {};

/** Always first in each entry's "Works with" list when compatible. */
const PRIMARY_LAUNCHER = 'sampleboot';

const entries = readEntries();
// Only this generated directory is cleared; original media stays with each entry.
fs.rmSync(mediaDir, { recursive: true, force: true });

let github = {};
if (fs.existsSync(githubPath)) {
	github = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
}
let watchState = {};
if (fs.existsSync(watchPath)) {
	try { watchState = JSON.parse(fs.readFileSync(watchPath, 'utf8')) ?? {}; }
	catch { watchState = {}; }
}
let catalogStars = null;
if (fs.existsSync(contributorsPath)) {
	try {
		const payload = JSON.parse(fs.readFileSync(contributorsPath, 'utf8'));
		if (typeof payload?.stars === 'number' && Number.isFinite(payload.stars) && payload.stars > 0) {
			catalogStars = payload.stars;
		}
	} catch {
		catalogStars = null;
	}
}

/** @type {Array<Record<string, unknown>>} */
const mods = entries.map(({ id, section, dir, record: raw, media }) => {
	const gh = raw.repo ? github[raw.repo] ?? {} : {};
	const watchItems = !raw.repo && Array.isArray(watchState[id]?.items) ? watchState[id].items : [];
	const watchReleases = watchItems.map((item) => {
		const rawName = String(item.title ?? '').trim().replace(/^\/+/, '');
		const tag = deriveVersionFromTitle(item.title ?? '');
		const name = rawName || tag;
		return {
			tag,
			name,
			label: releaseDisplayLabel(tag, name),
			published_at: item.published_at ?? null,
			html_url: item.html_url ?? raw.website ?? null,
			body_html: ''
		};
	}).filter((item) => item.tag);
	const markdownOptions = { repo: raw.repo, website: raw.website, branch: gh.default_branch ?? 'main', readmePath: gh.readme_path ?? 'README.md', name: raw.name };
	const aboutPath = path.join(dir, 'about.md');
	const mirroredReadmePath = path.join(root, 'data', 'readme', `${id}.md`);
	const readmePath = fs.existsSync(aboutPath)
		? aboutPath
		: raw.repo
			? mirroredReadmePath
			: aboutPath;
	const ghReleases = gh.releases ?? [];
	const matchingReleases = raw.release_prefix
		? ghReleases.filter((release) => String(release.tag ?? '').startsWith(raw.release_prefix))
		: ghReleases;
	const shownReleases = matchingReleases.slice(0, 3);
	const newestMatching = matchingReleases[0] ?? null;
	details[id] = {
		readme_html: fs.existsSync(readmePath) ? renderMarkdown(fs.readFileSync(readmePath, 'utf8'), markdownOptions) : '',
		readme_from_repo: readmePath === mirroredReadmePath,
		releases: raw.repo
			? shownReleases.map(({ body, ...release }) => ({
				...release,
				label: releaseDisplayLabel(release.tag, release.name),
				body_html: renderMarkdown(body, { ...markdownOptions, readmePath: 'README.md', name: '' })
			}))
			: watchReleases
	};
	for (const file of media) {
		const destination = path.join(mediaDir, id, file);
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.copyFileSync(path.join(dir, file), destination);
	}
	const logo = media.find((file) => file.startsWith('logo.'));
	const newestWatch = watchReleases[0] ?? null;
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
		latest_release: (() => {
			/** @param {{ tag?: string, published_at?: string | null, html_url?: string | null, name?: string | null, label?: string } | null} base */
			const withLabel = (base) => {
				if (!base?.tag) return null;
				const match = matchingReleases.find((r) => r.tag === base.tag)
					?? (newestWatch && newestWatch.tag === base.tag ? newestWatch : null);
				const name = match?.name ?? base.name ?? null;
				return {
					...base,
					label: match?.label ?? releaseDisplayLabel(base.tag, name)
				};
			};
			if (raw.repo) {
				if (raw.release_prefix) {
					return newestMatching
						? withLabel({ tag: newestMatching.tag, published_at: newestMatching.published_at, name: newestMatching.name })
						: null;
				}
				return withLabel(gh.latest_release ?? null);
			}
			if (newestWatch) {
				return withLabel({
					tag: newestWatch.tag,
					published_at: newestWatch.published_at,
					html_url: newestWatch.html_url,
					name: newestWatch.name,
					label: newestWatch.label
				});
			}
			if (raw.version) {
				return withLabel({ tag: raw.version, published_at: raw.released ?? null, html_url: raw.website });
			}
			return null;
		})(),
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
		.sort((a, b) => {
			if (a.id === PRIMARY_LAUNCHER) return -1;
			if (b.id === PRIMARY_LAUNCHER) return 1;
			return (a.status === 'archived') - (b.status === 'archived'); // active launchers first
		})
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
fs.mkdirSync(path.dirname(catalogMetaPath), { recursive: true });
fs.writeFileSync(catalogMetaPath, JSON.stringify({ stars: catalogStars }, null, 2) + '\n');
console.log(
	`Wrote ${mods.length} catalog entries to ${path.relative(root, outPath)} and ${path.relative(root, publicCatalogPath)}`
);
