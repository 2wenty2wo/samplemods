import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decideWatchUpdate, fingerprint, parseFeedItems, runWatch } from './watch.js';

const rssA = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
<lastBuildDate>Mon, 01 Jan 2026 00:00:00 GMT</lastBuildDate>
<item>
<title><![CDATA[/MPC-Simple-1.0-Beta-1.zip]]></title>
<link>https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-1.zip/download</link>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const rssSameItemNewChannelDate = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<pubDate>Tue, 02 Jan 2026 00:00:00 GMT</pubDate>
<lastBuildDate>Wed, 03 Jan 2026 12:34:56 GMT</lastBuildDate>
<item>
<title><![CDATA[/MPC-Simple-1.0-Beta-1.zip]]></title>
<link>https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-1.zip/download</link>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const rssNewFirstItem = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<item>
<title><![CDATA[/MPC-Simple-1.0-Beta-2.zip]]></title>
<link>https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-2.zip/download</link>
<pubDate>Sun, 16 Nov 2026 09:00:00 UT</pubDate>
</item>
<item>
<title><![CDATA[/MPC-Simple-1.0-Beta-1.zip]]></title>
<link>https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-1.zip/download</link>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const fpA = fingerprint(rssA, 'application/rss+xml');
const fpB = fingerprint(rssSameItemNewChannelDate, 'application/rss+xml');
const fpC = fingerprint(rssNewFirstItem, 'application/rss+xml');
assert.equal(fpA, '/MPC-Simple-1.0-Beta-1.zip | Sat, 15 Nov 2026 12:00:00 GMT');
assert.equal(fpA, fpB, 'channel pubDate must not affect fingerprint');
assert.notEqual(fpA, fpC, 'new first item must change fingerprint');

assert.deepEqual(parseFeedItems(rssNewFirstItem, 'application/rss+xml'), [
	{
		title: '/MPC-Simple-1.0-Beta-2.zip',
		published_at: '2026-11-16T09:00:00.000Z',
		html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-2.zip/download'
	},
	{
		title: '/MPC-Simple-1.0-Beta-1.zip',
		published_at: '2026-11-15T12:00:00.000Z',
		html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-1.zip/download'
	}
]);
assert.equal(parseFeedItems('[{"modified_gmt":"2026-11-07T20:08:26"}]', 'application/json'), null);

const jsonBody = '[{"modified_gmt":"2026-11-07T20:08:26"}]';
assert.equal(
	fingerprint(jsonBody, 'application/json'),
	JSON.stringify(JSON.parse(jsonBody))
);

assert.equal(decideWatchUpdate({ previous: null, url: 'https://a.example/', fingerprint: 'x' }).action, 'baseline');
assert.equal(
	decideWatchUpdate({
		previous: { url: 'https://a.example/', fingerprint: 'x' },
		url: 'https://b.example/',
		fingerprint: 'x'
	}).action,
	'rebaseline'
);
assert.deepEqual(
	decideWatchUpdate({
		previous: { url: 'https://a.example/', fingerprint: 'old' },
		url: 'https://a.example/',
		fingerprint: 'new'
	}),
	{ action: 'changed', oldFingerprint: 'old' }
);
assert.equal(
	decideWatchUpdate({
		previous: { url: 'https://a.example/', fingerprint: 'same' },
		url: 'https://a.example/',
		fingerprint: 'same'
	}).action,
	'unchanged'
);

const htmlFp = fingerprint('<html><script>x</script><style>y</style><p>Hello   world</p></html>', 'text/html');
assert.match(htmlFp, /^[a-f0-9]{64}$/);

// runWatch state handling (no network: stubbed upstream fetch and GitHub API).
const entry = { id: 'demo', section: 'apps', record: { name: 'Demo', watch: 'https://a.example/feed' } };
const upstream = (body) => async () => new Response(body, { headers: { 'content-type': 'application/rss+xml' } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-test-'));
const statePath = path.join(tmp, 'watch.json');
const quiet = { log: console.log, warn: console.warn };
console.log = console.warn = () => {};
try {
	await runWatch({ entries: [entry], statePath, fetchImpl: upstream(rssA), token: null, repository: null, now: () => 'T1' });
	const baseline = fs.readFileSync(statePath, 'utf8');
	assert.deepEqual(JSON.parse(baseline).demo.items, [
		{
			title: '/MPC-Simple-1.0-Beta-1.zip',
			published_at: '2026-11-15T12:00:00.000Z',
			html_url: 'https://sourceforge.net/projects/mpcsimple/files/MPC-Simple-1.0-Beta-1.zip/download'
		}
	]);

	// Unchanged upstream must leave the file byte-identical (no commit / redeploy every 6 h).
	await runWatch({ entries: [entry], statePath, fetchImpl: upstream(rssSameItemNewChannelDate), token: null, repository: null, now: () => 'T2' });
	assert.equal(fs.readFileSync(statePath, 'utf8'), baseline, 'unchanged run must not rewrite state');

	// A change whose issue can't be opened must keep the old fingerprint so the next run retries.
	const realFetch = globalThis.fetch;
	globalThis.fetch = async () => new Response('{"message":"forbidden"}', { status: 403 });
	try {
		await runWatch({ entries: [entry], statePath, fetchImpl: upstream(rssNewFirstItem), token: 't', repository: 'o/r', now: () => 'T3' });
	} finally {
		globalThis.fetch = realFetch;
	}
	assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).demo.fingerprint, fpA, 'failed issue must not advance state');
} finally {
	Object.assign(console, quiet);
	fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('Watch checks passed: RSS channel dates ignored, first-item change, JSON, decideWatchUpdate, HTML hash, no-op runs, alert retry.');
