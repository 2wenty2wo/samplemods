import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	decideWatchUpdate,
	diffPageWatchLines,
	extractPageWatchText,
	fingerprint,
	pageWatchFingerprint,
	pageWatchChangedIssueTitle,
	pageWatchIssueBody,
	pageWatchMissingIssueTitle,
	pageWatchStateKey,
	parseFeedItems,
	runWatch,
	serializeState
} from './watch.js';

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

// Page watch: extract visible text, fragment scope, ignore markup-only churn, line diff.
const pageHtml = `<html><body>
<aside id="nav"><a href="/">Home</a></aside>
<section id="works-with">
  <h2>Works with</h2>
  <table><tr><td class="name">MPC Simple</td><td>1.0 Beta 2</td></tr></table>
</section>
<footer>ignore me</footer>
</body></html>`;
const pageHtmlMarkupOnly = `<html><body>
<aside id="nav" class="new"><a href="/">Home</a></aside>
<section id="works-with" data-x="1">
  <h2 class="title">Works with</h2>
  <table><tr><td class="name renamed">MPC Simple</td><td>1.0 Beta 2</td></tr></table>
</section>
<footer class="f">ignore me</footer>
</body></html>`;
const pageHtmlContentChange = `<html><body>
<aside id="nav"><a href="/">Home</a></aside>
<section id="works-with">
  <h2>Works with</h2>
  <table>
    <tr><td>MPC Simple</td><td>1.0 Beta 3</td></tr>
    <tr><td>MPCTRACKER</td><td>0.1.0</td></tr>
  </table>
</section>
<footer>ignore me</footer>
</body></html>`;

const scopedA = extractPageWatchText(pageHtml, 'https://sampleboot.com/#works-with');
const scopedMarkup = extractPageWatchText(pageHtmlMarkupOnly, 'https://sampleboot.com/#works-with');
const scopedB = extractPageWatchText(pageHtmlContentChange, 'https://sampleboot.com/#works-with');
const whole = extractPageWatchText(pageHtml, 'https://sampleboot.com/');
assert.match(scopedA, /Works with/);
assert.match(scopedA, /MPC Simple/);
assert.doesNotMatch(scopedA, /Home|ignore me/);
assert.equal(pageWatchFingerprint(scopedA), pageWatchFingerprint(scopedMarkup), 'markup-only change must not alter page fingerprint');
assert.notEqual(pageWatchFingerprint(scopedA), pageWatchFingerprint(scopedB), 'content change must alter page fingerprint');
assert.match(whole, /Home/);
assert.match(whole, /ignore me/);
assert.throws(
	() => extractPageWatchText('<html></html>', 'https://sampleboot.com/#works-with'),
	/No element with id/
);

const { added, removed } = diffPageWatchLines(scopedA, scopedB);
assert.ok(added.some((line) => /MPCTRACKER/.test(line)), 'diff should list added MPCTRACKER line');
assert.ok(
	added.some((line) => /Beta 3/.test(line)) || removed.some((line) => /Beta 2/.test(line)),
	'diff should reflect version line change'
);
assert.equal(pageWatchStateKey('sampleboot', 'https://sampleboot.com/#works-with'), 'page:sampleboot:https://sampleboot.com/#works-with');

const pageEntry = {
	id: 'sampleboot',
	section: 'tools',
	record: {
		name: 'SampleBoot',
		compatible: ['mpc-simple'],
		watch_pages: ['https://sampleboot.com/#works-with']
	}
};
const sampleBody = pageWatchIssueBody(pageEntry, 'https://sampleboot.com/#works-with', scopedA, scopedB);
assert.match(sampleBody, /Likely catalog field: `compatible`/);
assert.match(sampleBody, /MPCTRACKER/);

const pageTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'page-watch-test-'));
const pageStatePath = path.join(pageTmp, 'watch.json');
const pageQuiet = { log: console.log, warn: console.warn };
console.log = console.warn = () => {};
try {
	const htmlFetch = (body) => async () => new Response(body, { headers: { 'content-type': 'text/html' } });
	await runWatch({
		entries: [pageEntry],
		statePath: pageStatePath,
		fetchImpl: htmlFetch(pageHtml),
		token: null,
		repository: null,
		now: () => 'P1'
	});
	const key = pageWatchStateKey('sampleboot', 'https://sampleboot.com/#works-with');
	const baselineState = JSON.parse(fs.readFileSync(pageStatePath, 'utf8'));
	assert.equal(baselineState[key].fingerprint, pageWatchFingerprint(scopedA));
	assert.ok(baselineState[key].text.includes('MPC Simple'));

	const baselineFile = fs.readFileSync(pageStatePath, 'utf8');
	await runWatch({
		entries: [pageEntry],
		statePath: pageStatePath,
		fetchImpl: htmlFetch(pageHtmlMarkupOnly),
		token: null,
		repository: null,
		now: () => 'P2'
	});
	assert.equal(
		JSON.parse(fs.readFileSync(pageStatePath, 'utf8'))[key].fingerprint,
		baselineState[key].fingerprint,
		'markup-only page change must leave fingerprint unchanged'
	);
	assert.equal(fs.readFileSync(pageStatePath, 'utf8'), baselineFile, 'markup-only must not rewrite state');
	assert.equal(baselineFile, serializeState(baselineState));

	// Missing #fragment after a successful fetch: alert once, keep previous state.
	const missingHtml = '<html><body><section id="other">Nope</section></body></html>';
	const githubCalls = [];
	const realFetchMissing = globalThis.fetch;
	globalThis.fetch = async (url, opts = {}) => {
		const href = String(url);
		const method = opts.method ?? 'GET';
		githubCalls.push({ href, method, body: opts.body ?? null });
		if (href.includes('/labels/')) {
			return new Response(JSON.stringify({ name: 'release-watch', description: 'ok', color: 'fbca04' }), {
				headers: { 'content-type': 'application/json' }
			});
		}
		if (href.includes('search/issues')) {
			return new Response(JSON.stringify({ items: [] }), { headers: { 'content-type': 'application/json' } });
		}
		if (method === 'POST' && /\/repos\/[^/]+\/[^/]+\/issues$/.test(href)) {
			return new Response(JSON.stringify({ number: 7 }), { status: 201, headers: { 'content-type': 'application/json' } });
		}
		return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 });
	};
	try {
		const beforeMissing = fs.readFileSync(pageStatePath, 'utf8');
		const missingResult = await runWatch({
			entries: [pageEntry],
			statePath: pageStatePath,
			fetchImpl: htmlFetch(missingHtml),
			token: 't',
			repository: 'o/r',
			now: () => 'P3'
		});
		assert.equal(fs.readFileSync(pageStatePath, 'utf8'), beforeMissing, 'missing fragment must keep previous state');
		assert.equal(missingResult.results.at(-1)?.missingFragment, true);
		const opened = githubCalls.find((call) => call.method === 'POST' && /\/issues$/.test(call.href));
		assert.ok(opened, 'missing fragment must open a GitHub issue');
		assert.match(opened.body, /not found/);
		assert.match(opened.body, /works-with/);
	} finally {
		globalThis.fetch = realFetchMissing;
	}

	// Second content change with an existing issue: comment, do not PATCH the issue body.
	fs.writeFileSync(pageStatePath, serializeState({
		[key]: {
			url: 'https://sampleboot.com/#works-with',
			fingerprint: pageWatchFingerprint(scopedA),
			text: scopedA,
			checked_at: 'P1'
		}
	}));
	const commentCalls = [];
	const changedTitle = pageWatchChangedIssueTitle(pageEntry, 'https://sampleboot.com/#works-with');
	const realFetchComment = globalThis.fetch;
	globalThis.fetch = async (url, opts = {}) => {
		const href = String(url);
		const method = opts.method ?? 'GET';
		commentCalls.push({ href, method, body: opts.body ?? null });
		if (href.includes('/labels/')) {
			return new Response(JSON.stringify({ name: 'release-watch', description: 'ok', color: 'fbca04' }), {
				headers: { 'content-type': 'application/json' }
			});
		}
		if (href.includes('search/issues')) {
			return new Response(JSON.stringify({
				items: [{ number: 99, title: changedTitle }]
			}), { headers: { 'content-type': 'application/json' } });
		}
		if (method === 'POST' && href.endsWith('/issues/99/comments')) {
			return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { 'content-type': 'application/json' } });
		}
		if (method === 'PATCH' && href.endsWith('/issues/99')) {
			return new Response(JSON.stringify({ number: 99 }), { headers: { 'content-type': 'application/json' } });
		}
		return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 });
	};
	try {
		await runWatch({
			entries: [pageEntry],
			statePath: pageStatePath,
			fetchImpl: htmlFetch(pageHtmlContentChange),
			token: 't',
			repository: 'o/r',
			now: () => 'P4'
		});
		assert.ok(
			commentCalls.some((call) => call.method === 'POST' && call.href.endsWith('/issues/99/comments')),
			'existing page-watch issue must receive a comment'
		);
		assert.ok(
			!commentCalls.some((call) => call.method === 'PATCH' && call.href.endsWith('/issues/99')),
			'existing page-watch issue body must not be patched'
		);
		assert.match(
			commentCalls.find((call) => call.method === 'POST' && call.href.endsWith('/issues/99/comments')).body,
			/MPCTRACKER/
		);
	} finally {
		globalThis.fetch = realFetchComment;
	}
} finally {
	Object.assign(console, pageQuiet);
	fs.rmSync(pageTmp, { recursive: true, force: true });
}

assert.match(pageWatchMissingIssueTitle(pageEntry, 'https://sampleboot.com/#works-with'), /not found$/);

console.log('Watch checks passed: RSS channel dates ignored, first-item change, JSON, decideWatchUpdate, HTML hash, no-op runs, alert retry, page watch extract/diff.');
