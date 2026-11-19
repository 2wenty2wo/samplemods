import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireBuild = process.argv.includes('--require-build');

const { absoluteUrl, defaultShareImage, entryShareImage } = await import(
	pathToFileURL(path.join(root, 'src/lib/seo.js')).href
);
const { buildSitemapEntries, renderSitemapXml } = await import(
	pathToFileURL(path.join(root, 'src/lib/sitemap.js')).href
);
const { entryPath } = await import(pathToFileURL(path.join(root, 'src/lib/categories.js')).href);

assert.equal(absoluteUrl('/'), 'https://samplemods.com/');
assert.equal(absoluteUrl('/about/'), 'https://samplemods.com/about/');
assert.equal(absoluteUrl('/og-default.png'), 'https://samplemods.com/og-default.png');
assert.equal(absoluteUrl('https://cdn.example/x.png'), 'https://cdn.example/x.png');

const def = defaultShareImage('');
assert.equal(def.url, 'https://samplemods.com/og-default.png');
assert.equal(def.width, 1200);
assert.equal(def.height, 630);

const withShot = entryShareImage(
	{ name: 'Demo', screenshots: ['media/demo/screenshots/01.png'], logo: 'media/demo/logo.png' },
	''
);
assert.equal(withShot.url, 'https://samplemods.com/media/demo/screenshots/01.png');

const withLogo = entryShareImage({ name: 'Demo', screenshots: [], logo: 'media/demo/logo.png' }, '');
assert.equal(withLogo.url, 'https://samplemods.com/media/demo/logo.png');

const fallback = entryShareImage({ name: 'Demo', screenshots: [] }, '');
assert.equal(fallback.url, 'https://samplemods.com/og-default.png');

// The catalog file is generated; build it if this is a fresh checkout (CI, refresh job).
const dataFile = path.join(root, 'src/lib/data.json');
if (!fs.existsSync(dataFile)) {
	const { execFileSync } = await import('node:child_process');
	execFileSync(process.execPath, [path.join(root, 'scripts/build-data.js')], { stdio: 'ignore' });
}
const mods = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
assert.ok(mods.length > 0);
const pages = buildSitemapEntries(mods, '');
assert.equal(pages.length, mods.length + 4, 'homepage + releases + about + submit + one URL per entry');
assert.equal(pages[0].loc, 'https://samplemods.com/');
assert.ok(pages.every((p) => p.loc.startsWith('https://samplemods.com/')));

const locs = new Set(pages.map((p) => p.loc));
assert.ok(locs.has('https://samplemods.com/releases/'));
for (const entry of mods) {
	assert.ok(locs.has(`https://samplemods.com${entryPath(entry)}`), entry.id);
	if (entry.section !== 'mods') {
		assert.ok(!locs.has(`https://samplemods.com/mod/${entry.id}/`), entry.id);
	}
}

const xml = renderSitemapXml(pages);
assert.match(xml, /<urlset /);
assert.equal((xml.match(/<url>/g) ?? []).length, mods.length + 4);

const og = path.join(root, 'static', 'og-default.png');
assert.ok(fs.existsSync(og), 'static/og-default.png must exist');
assert.ok(fs.statSync(og).size < 200 * 1024, 'og-default.png must stay under 200 KB');
assert.ok(fs.existsSync(path.join(root, 'static', 'robots.txt')));
assert.match(
	fs.readFileSync(path.join(root, 'static', 'robots.txt'), 'utf8'),
	/Sitemap:\s*https:\/\/samplemods\.com\/sitemap\.xml/
);

const homeHtml = path.join(root, 'build', 'index.html');
const hasFreshBuild =
	fs.existsSync(homeHtml) &&
	fs.readFileSync(homeHtml, 'utf8').includes('property="og:site_name"');

if (requireBuild || hasFreshBuild) {
	assert.ok(fs.existsSync(homeHtml), 'build/index.html missing — run npm run build first');
	const home = fs.readFileSync(homeHtml, 'utf8');
	assert.match(home, /property="og:image"\s+content="https:\/\/samplemods\.com\/og-default\.png"/);
	const detail = fs.readFileSync(path.join(root, 'build', 'mod', 'sampqol-os', 'index.html'), 'utf8');
	assert.match(detail, /property="og:image"\s+content="https:\/\/samplemods\.com\/[^"]+"/);
	assert.match(detail, /property="og:title"\s+content="SampQOL OS · Sample Mods"/);
	const sitemap = fs.readFileSync(path.join(root, 'build', 'sitemap.xml'), 'utf8');
	assert.equal((sitemap.match(/<url>/g) ?? []).length, mods.length + 4);
	console.log('SEO checks passed (including build/ HTML assertions).');
} else {
	console.log('SEO checks passed (build/ stale or absent — HTML assertions deferred to postbuild).');
}
