import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
	buildReleasesRss,
	escapeXml,
	cdata,
	RSS_ITEM_LIMIT,
	RSS_ENTRY_RELEASES_HASH
} = await import(pathToFileURL(path.join(root, 'src/lib/rss.js')).href);

assert.equal(escapeXml('A & B <C> "q"'), 'A &amp; B &lt;C&gt; &quot;q&quot;');
assert.equal(cdata('hello ]]> world'), '<![CDATA[hello ]]]]><![CDATA[> world]]>');

/** @type {Array<any>} */
const fixture = [
	{
		entryId: 'amp-mod',
		entryName: 'Amp & Bass <Kit>',
		entryPath: '/mod/amp-mod/',
		section: 'mods',
		tag: 'v2.0',
		published_at: '2026-11-19T12:00:00Z',
		excerpt: 'Notes with HTML & symbols'
	},
	{
		entryId: 'amp-mod',
		entryName: 'Amp & Bass <Kit>',
		entryPath: '/mod/amp-mod/',
		section: 'mods',
		tag: 'v1.0',
		published_at: '2026-01-01T00:00:00Z',
		excerpt: ''
	},
	...Array.from({ length: 55 }, (_, i) => ({
		entryId: 'plain-app',
		entryName: 'Plain App',
		entryPath: '/app/plain-app/',
		section: 'apps',
		tag: `v0.${i}`,
		published_at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
		excerpt: i === 0 ? 'Watched notes' : ''
	}))
];

const xml = buildReleasesRss(fixture);
assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(xml, /<rss version="2\.0" xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom">/);
assert.match(xml, /<title>Sample Mods: latest releases<\/title>/);
assert.match(xml, /<link>https:\/\/samplemods\.com\/releases\/<\/link>/);
assert.match(
	xml,
	/<atom:link href="https:\/\/samplemods\.com\/releases\.xml" rel="self" type="application\/rss\+xml"\/>/
);
assert.match(xml, /<language>en<\/language>/);
assert.match(xml, /Amp &amp; Bass &lt;Kit&gt; v2\.0/);
assert.match(xml, /<!\[CDATA\[/);
assert.match(xml, /<a href="https:\/\/samplemods\.com\/[^"]+#releases">Read the full notes on Sample Mods →<\/a>/);

const itemCount = (xml.match(/<item>/g) ?? []).length;
assert.equal(itemCount, RSS_ITEM_LIMIT, 'feed must cap at 50 items');

const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((match) => match[1]);
assert.equal(links.length, RSS_ITEM_LIMIT);
for (const link of links) {
	assert.ok(link.startsWith('https://samplemods.com/'), link);
	assert.ok(link.endsWith(RSS_ENTRY_RELEASES_HASH), link);
	assert.doesNotMatch(link, /github\.com/i);
}

const guids = [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map((match) => match[1]);
assert.equal(guids.length, RSS_ITEM_LIMIT);
assert.equal(new Set(guids).size, guids.length, 'guids must be unique');
assert.ok(guids.includes('amp-mod@v2.0'));

const builtFeed = path.join(root, 'build', 'releases.xml');
if (fs.existsSync(builtFeed)) {
	const built = fs.readFileSync(builtFeed, 'utf8');
	assert.match(built, /<rss version="2\.0"/);
	assert.ok((built.match(/<item>/g) ?? []).length <= RSS_ITEM_LIMIT);
	for (const match of built.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)) {
		assert.ok(match[1].startsWith('https://samplemods.com/'), match[1]);
		assert.doesNotMatch(match[1], /github\.com/i);
	}
}

console.log('RSS checks passed: escape, CDATA, samplemods links, unique guids, 50-item cap.');
