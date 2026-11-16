import assert from 'node:assert/strict';
import { decideWatchUpdate, fingerprint } from './watch.js';

const rssA = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
<lastBuildDate>Mon, 01 Jan 2026 00:00:00 GMT</lastBuildDate>
<item>
<title>MPC-Simple-1.0-Beta-1.zip</title>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const rssSameItemNewChannelDate = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<pubDate>Tue, 02 Jan 2026 00:00:00 GMT</pubDate>
<lastBuildDate>Wed, 03 Jan 2026 12:34:56 GMT</lastBuildDate>
<item>
<title>MPC-Simple-1.0-Beta-1.zip</title>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const rssNewFirstItem = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Files</title>
<item>
<title>MPC-Simple-1.0-Beta-2.zip</title>
<pubDate>Sun, 16 Nov 2026 09:00:00 GMT</pubDate>
</item>
<item>
<title>MPC-Simple-1.0-Beta-1.zip</title>
<pubDate>Sat, 15 Nov 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const fpA = fingerprint(rssA, 'application/rss+xml');
const fpB = fingerprint(rssSameItemNewChannelDate, 'application/rss+xml');
const fpC = fingerprint(rssNewFirstItem, 'application/rss+xml');
assert.equal(fpA, 'MPC-Simple-1.0-Beta-1.zip | Sat, 15 Nov 2026 12:00:00 GMT');
assert.equal(fpA, fpB, 'channel pubDate must not affect fingerprint');
assert.notEqual(fpA, fpC, 'new first item must change fingerprint');

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

console.log('Watch checks passed: RSS channel dates ignored, first-item change, JSON, decideWatchUpdate, HTML hash.');
