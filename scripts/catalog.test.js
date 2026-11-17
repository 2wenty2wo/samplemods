import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readEntries } from './catalog.js';
import { deriveVersionFromTitle } from './watch.js';

assert.equal(deriveVersionFromTitle('/MPC-Simple-1.0-Beta-3.zip'), '1.0 Beta 3');
assert.equal(deriveVersionFromTitle('MPC-Simple-1.0-Beta-3.zip'), '1.0 Beta 3');
assert.equal(deriveVersionFromTitle('/releases/CustomBuild.zip'), 'CustomBuild');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(root, '.catalog-test-'));
const dataDir = path.join(fixture, 'data');
function write(file, text) {
	fs.mkdirSync(path.dirname(path.join(dataDir, file)), { recursive: true });
	fs.writeFileSync(path.join(dataDir, file), text);
}
function bad(file, text, pattern) {
	write(file, text);
	assert.throws(() => readEntries(dataDir), pattern);
	fs.unlinkSync(path.join(dataDir, file));
}
try {
	write('mods/host/mod.yaml', 'name: Host\ndescription: Host mod\nrepo: owner/host\nauthor: owner\n');
	const playerRecord = 'name: Player\ndescription: Player app\nrepo: owner/player\nauthor: owner\nrequires: [host]\n';
	write('apps/player/app.yaml', playerRecord);
	write('apps/player/screenshots/02-screen.png', 'second image');
	write('apps/player/screenshots/01-screen.png', 'first image');
	const entries = readEntries(dataDir);
	assert.deepEqual(entries.map(({ id, section }) => ({ id, section })), [{ id: 'host', section: 'mods' }, { id: 'player', section: 'apps' }]);
	assert.deepEqual(entries[1].media, ['screenshots/01-screen.png', 'screenshots/02-screen.png']);
	bad('apps/player/wrong.yaml', 'name: Wrong', /unexpected filename/);
	bad('apps/player/loose.png', 'orphan', /orphan media/);
	write('tools/orphan/logo.png', 'orphan');
	assert.throws(() => readEntries(dataDir), /missing tool.yaml/);
	fs.rmSync(path.join(dataDir, 'tools'), { recursive: true });
	write('games/host/game.yaml', 'name: Duplicate');
	assert.throws(() => readEntries(dataDir), /Duplicate id/);
	fs.rmSync(path.join(dataDir, 'games'), { recursive: true });
	write('unknown/item/item.yaml', 'name: Unknown');
	assert.throws(() => readEntries(dataDir), /Unknown data section/);
	fs.rmSync(path.join(dataDir, 'unknown'), { recursive: true });
	fs.renameSync(path.join(dataDir, 'mods/host/mod.yaml'), path.join(dataDir, 'mods/host/app.yaml'));
	assert.throws(() => readEntries(dataDir), /missing mod.yaml/);
	fs.renameSync(path.join(dataDir, 'mods/host/app.yaml'), path.join(dataDir, 'mods/host/mod.yaml'));
	fs.mkdirSync(path.join(fixture, 'scripts'));
	for (const file of ['catalog.js', 'build-data.js', 'validate.js', 'render-markdown.js', 'watch.js']) fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
	fs.mkdirSync(path.join(fixture, 'schema'));
	fs.copyFileSync(path.join(root, 'schema/mod.yaml'), path.join(fixture, 'schema/mod.yaml'));
	const validate = () => spawnSync(process.execPath, [path.join(fixture, 'scripts/validate.js')], { encoding: 'utf8' });
	assert.equal(validate().status, 0, 'requires must resolve across sections');
	const externalRecord = 'name: External\ndescription: Independent project\nauthor: Maker\nwebsite: https://example.com/project\n';
	write('mods/external/mod.yaml', externalRecord.replace('website: https://example.com/project\n', ''));
	assert.match(validate().stderr, /website is required when repo is absent/);
	write('mods/external/mod.yaml', externalRecord);
	assert.equal(validate().status, 0, 'repo-less entry with a website must validate');
	assert.ok(readEntries(dataDir).some((entry) => entry.id === 'external' && !entry.record.repo));
	write('mods/external/mod.yaml', externalRecord + 'price: subscription\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('mods/external/mod.yaml', externalRecord + 'source: proprietary\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('mods/external/mod.yaml', externalRecord + 'version: 1.2\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('mods/external/mod.yaml', externalRecord + 'released: "2026-2-3"\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('mods/external/mod.yaml', externalRecord + 'released: "2026-02-30"\n');
	assert.match(validate().stderr, /valid calendar date/);
	write('mods/external/mod.yaml', externalRecord + 'version: "0.15.2"\nreleased: "2026-11-07"\n');
	assert.equal(validate().status, 0, 'manual release metadata must validate');
	write('apps/player/app.yaml', playerRecord.replace('[host]', '[missing]'));
	assert.match(validate().stderr, /requires unknown entry/);
	write('apps/player/app.yaml', playerRecord.replace('[host]', '[player]'));
	assert.match(validate().stderr, /cannot require itself/);
	write('apps/player/app.yaml', playerRecord + 'compatible: [missing-compat]\n');
	assert.match(validate().stderr, /compatible unknown entry/);
	write('apps/player/app.yaml', playerRecord);
	write('apps/player/app.yaml', playerRecord + 'category: app\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('apps/player/app.yaml', playerRecord);
	write('apps/player/app.yaml', playerRecord + 'runs_on: [device]\naudience: [musician]\ninstall: boot-thingy\n');
	assert.equal(validate().status, 0, 'curated quick facts must validate');
	write('apps/player/app.yaml', playerRecord + 'runs_on: [phone]\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('apps/player/app.yaml', playerRecord + 'audience: [musician, musician]\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('apps/player/app.yaml', playerRecord);
	write('media-sources.json', JSON.stringify({ player: [{ file: 'screenshots/missing.png' }] }));
	assert.match(validate().stderr, /orphan media/);
	fs.unlinkSync(path.join(dataDir, 'media-sources.json'));
	write('readme/player.md', '# Player\n\n[Guide](guide.md)\n\n<script>unsafe()</script>');
	write('readme/external.md', '# Stale GitHub README must not appear');
	write('mods/external/about.md', '## Local About\n[Maker guide](guide.pdf)\n<script>unsafe()</script><iframe>unsafe</iframe>');
	write('mods/external/screenshots/01-screen.png', 'external image');
	write('apps/player/about.md', '# Ignored local override');
	write('mods/host/about.md', '# Also ignored without a cached README');
	write('media-sources.json', JSON.stringify({ external: [{ file: 'screenshots/01-screen.png', source: 'https://maker.example/screen.png' }] }));
	assert.equal(validate().status, 0, 'local about files and repo-less media sources must validate');
	write('apps/player/app.yaml', playerRecord + 'price: paid\nsource: closed\nauthor_url: https://example.com/author\nversion: "99.0"\nreleased: "2026-02-02"\n');
	write('github.json', JSON.stringify({ undefined: { stars: 999, contributors: 999, releases: [{ body: 'Stale release' }] }, 'owner/player': { default_branch: 'develop', readme_path: 'docs/README.md',
		contributors: 4, open_issues: 2, last_commit_at: '2026-01-01', latest_release: { tag: 'v1', published_at: '2026-01-01' }, releases: [{ tag: 'v1', body: '**New**<iframe>unsafe</iframe>', html_url: 'https://github.com/owner/player/releases/tag/v1' }] } }));
	let result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-data.js')], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	let output = JSON.parse(fs.readFileSync(path.join(fixture, 'src/lib/data.json')));
	assert.deepEqual(output.find((entry) => entry.id === 'host').required_by, ['player']);
	assert.equal(output.find((entry) => entry.id === 'player').screenshots[0], 'media/player/screenshots/01-screen.png');
	assert.equal(fs.readFileSync(path.join(fixture, 'static/media/player/screenshots/01-screen.png'), 'utf8'), 'first image');
	const player = output.find((entry) => entry.id === 'player');
	assert.equal(player.contributors, 4);
	assert.equal(player.open_issues, 2);
	assert.equal(player.last_commit_at, '2026-01-01');
	assert.equal(player.price, 'paid');
	assert.equal(player.source, 'closed', 'explicit source overrides the repository default');
	assert.deepEqual(player.latest_release, { tag: 'v1', published_at: '2026-01-01' }, 'GitHub data overrides manual version/date fields');
	assert.equal(output.find((entry) => entry.id === 'host').source, 'open');
	const external = output.find((entry) => entry.id === 'external');
	assert.equal(external.price, 'free');
	assert.equal(external.source, 'closed');
	assert.equal(external.stars, null);
	assert.equal(external.contributors, null);
	assert.deepEqual(external.latest_release, { tag: '0.15.2', published_at: '2026-11-07', html_url: 'https://example.com/project' });
	const details = JSON.parse(fs.readFileSync(path.join(fixture, 'src/lib/server/details.json')));
	assert.match(details.external.readme_html, /<h2>Local About<\/h2>/);
	assert.match(details.external.readme_html, /https:\/\/example.com\/guide.pdf/);
	assert.doesNotMatch(details.external.readme_html, /script|iframe|unsafe|Stale GitHub/);
	assert.deepEqual(details.external.releases, []);
	assert.equal(details.host.readme_html, '', 'GitHub entries must ignore about.md even without a cached README');
	assert.match(details.player.readme_html, /blob\/develop\/docs\/guide.md/);
	assert.doesNotMatch(details.player.readme_html, /Ignored local override/);
	assert.doesNotMatch(details.player.readme_html, /<script|<h1/);
	assert.match(details.player.releases[0].body_html, /<strong>New<\/strong>/);
	assert.doesNotMatch(details.player.releases[0].body_html, /iframe|unsafe/);
	for (const catalogPath of ['src/lib/data.json', 'static/catalog.json']) {
		const text = fs.readFileSync(path.join(fixture, catalogPath), 'utf8');
		assert.doesNotMatch(text, /readme_html|body_html|"releases"/, 'detail content must stay out of the public catalog and homepage import');
	}
	fs.copyFileSync(path.join(root, 'src/lib/categories.js'), path.join(fixture, 'src/lib/categories.js'));
	const route = fs.readFileSync(path.join(root, 'src/routes/[section]/[id]/+page.server.js'), 'utf8')
		.replace("'$lib/data.json'", "'../src/lib/data.json' with { type: 'json' }")
		.replace("'$lib/server/details.json'", "'../src/lib/server/details.json' with { type: 'json' }")
		.replace("'$lib/categories.js'", "'../src/lib/categories.js'");
	fs.writeFileSync(path.join(fixture, 'scripts/detail-route.js'), route);
	const { load } = await import(pathToFileURL(path.join(fixture, 'scripts/detail-route.js')).href);
	const externalPage = load({ params: { section: 'mod', id: 'external' } });
	assert.equal(externalPage.mod.source, 'closed');
	assert.equal(externalPage.mod.stars, null);
	assert.equal(externalPage.mod.contributors, null);
	assert.equal(details.external.readme_html, externalPage.mod.readme_html);
	assert.deepEqual(externalPage.mod.releases, []);
	write('watch.json', JSON.stringify({
		external: {
			url: 'https://sourceforge.net/projects/mpcsimple/rss?path=/',
			fingerprint: '/MPC-Simple-1.0-Beta-3.zip | Tue, 17 Nov 2026 02:52:46 UT',
			checked_at: '2026-11-17T03:00:00Z',
			items: [
				{
					title: '/MPC-Simple-1.0-Beta-3.zip',
					published_at: '2026-11-17T02:52:46.000Z',
					html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-3.zip/download'
				},
				{
					title: '/MPC-Simple-1.0-Beta-2.zip',
					published_at: '2026-11-16T03:53:42.000Z',
					html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-2.zip/download'
				}
			]
		}
	}));
	result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-data.js')], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	output = JSON.parse(fs.readFileSync(path.join(fixture, 'src/lib/data.json'), 'utf8'));
	assert.deepEqual(
		output.find((entry) => entry.id === 'external').latest_release,
		{
			tag: '1.0 Beta 3',
			published_at: '2026-11-17T02:52:46.000Z',
			html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-3.zip/download'
		},
		'watch items must auto-derive latest_release and override fallback YAML version/released'
	);
	const watchedDetails = JSON.parse(fs.readFileSync(path.join(fixture, 'src/lib/server/details.json'), 'utf8'));
	assert.equal(watchedDetails.external.releases.length, 2);
	assert.equal(watchedDetails.external.releases[0].tag, '1.0 Beta 3');
	assert.equal(watchedDetails.external.releases[0].name, 'MPC-Simple-1.0-Beta-3.zip');
	const page = load({ params: { section: 'app', id: 'player' } });
	assert.equal(page.mod.readme_html, details.player.readme_html);
	assert.deepEqual(page.mods.map((entry) => entry.id), ['host']);
	assert.deepEqual(Object.keys(page.mods[0]).sort(), ['id', 'logo', 'name', 'screenshots', 'section', 'status']);
	assert.deepEqual(load({ params: { section: 'mod', id: 'player' } }), { id: 'player', redirectTo: '/app/player/' });
	assert.throws(() => load({ params: { section: 'game', id: 'player' } }), (error) => error.status === 404);
	fs.unlinkSync(path.join(dataDir, 'apps/player/screenshots/02-screen.png'));
	result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-data.js')], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.ok(!fs.existsSync(path.join(fixture, 'static/media/player/screenshots/02-screen.png')), 'stale generated media must disappear');
	console.log('Catalog checks passed: section discovery, invalid layouts, cross-section references, media copying and stale cleanup.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
