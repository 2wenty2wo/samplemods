import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	decideWatchUpdate,
	diffPageWatchLines,
	extractPageWatchText,
	fingerprint,
	manualReleases,
	pageWatchFingerprint,
	pageWatchChangedIssueTitle,
	pageWatchIssueBody,
	pageWatchMissingIssueTitle,
	pageWatchStateKey,
	parseFeedItems,
	runWatch,
	serializeState,
	watchVersionPattern
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
assert.equal(watchVersionPattern(String.raw`(?:Download )?v(?<version>[\d.]+)\(zip\)`).exec('v1.2.3(zip)')[1], '1.2.3');
assert.throws(() => watchVersionPattern('['), SyntaxError);
assert.throws(() => watchVersionPattern('(?:v1)'), /exactly one capture group/);
assert.throws(() => watchVersionPattern('(v)(1)'), /exactly one capture group/);

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

	const versionedEntry = {
		...entry,
		record: { ...entry.record, version: '1.0 Beta 1', watch_version: String.raw`MPC-Simple-(.+?)\.zip` }
	};
	const entryYaml = [
		'name: Demo',
		'# Release info from the upstream feed',
		'version: "1.0 Beta 1" # Keep "version" note',
		'released: "2026-11-15" # SourceForge file date for MPC-Simple-1.0-Beta-1.zip.',
		'description: "Contains # and : characters"',
		''
	].join('\n');
	const releaseYaml = entryYaml.replace('1.0 Beta 1', '1.0 Beta 2')
		.replace('2026-11-15', '2026-11-16').replace('Beta-1.zip', 'Beta-2.zip');
	const branch = 'auto/watch-demo-1-0-beta-2';
	const pulls = [];
	const commits = [];
	const issues = [];
	const newRefs = [];
	const updatedPulls = [];
	let branchYaml = null;
	let existingPull = null;
	const watchChange = async (target, feed = rssNewFirstItem) => {
		fs.writeFileSync(statePath, baseline);
		await runWatch({
			entries: [target], statePath, fetchImpl: upstream(feed), token: 't', repository: 'o/r',
			gh(args) {
				assert.deepEqual(args.slice(0, 2), ['pr', 'create']);
				const arg = (name) => args[args.indexOf(name) + 1];
				pulls.push({ branch: arg('--head'), title: arg('--title'), body: fs.readFileSync(arg('--body-file'), 'utf8') });
				return 'https://github.com/o/r/pull/1\n';
			}
		});
	};

	globalThis.fetch = async (input, { method, body }) => {
		const url = new URL(input);
		const endpoint = url.pathname;
		const data = body && JSON.parse(body);
		const json = (value, status = 200) => Response.json(value, { status });
		if (endpoint === '/repos/o/r/pulls') {
			assert.equal(url.searchParams.get('head'), `o:${branch}`);
			return json(existingPull ? [existingPull] : []);
		}
		if (endpoint === '/repos/o/r/pulls/1' && method === 'PATCH') {
			updatedPulls.push(data);
			return json({});
		}
		if (endpoint === `/repos/o/r/git/ref/heads/${branch}`) return json({}, branchYaml ? 200 : 404);
		if (endpoint === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'main-tip' } });
		if (endpoint === '/repos/o/r/git/refs' && method === 'POST') {
			newRefs.push(data);
			return json({});
		}
		if (endpoint === '/repos/o/r/contents/data/apps/demo/app.yaml') {
			if (method === 'GET') {
				const onBranch = url.searchParams.get('ref') === branch;
				return json({ content: Buffer.from(onBranch ? branchYaml : entryYaml).toString('base64'), sha: onBranch ? 'branch-file' : 'main-file' });
			}
			assert.equal(method, 'PUT');
			assert.equal(data.branch, branch);
			assert.equal(data.sha, branchYaml ? 'branch-file' : 'main-file');
			branchYaml = Buffer.from(data.content, 'base64').toString('utf8');
			commits.push(branchYaml);
			return json({});
		}
		if (endpoint.endsWith('/labels/release-watch')) return json({ description: 'Upstream release or page change detected for a catalog entry' });
		if (endpoint === '/search/issues') return json({ items: [] });
		if (endpoint === '/repos/o/r/issues' && method === 'POST') {
			issues.push(data);
			return json({});
		}
		throw new Error(`Unexpected API call: ${method} ${url}`);
	};
	try {
		await watchChange(versionedEntry);
		assert.equal(issues.length, 0, 'matching release must use a PR');
		assert.deepEqual(newRefs, [{ ref: `refs/heads/${branch}`, sha: 'main-tip' }]);
		assert.deepEqual(commits, [releaseYaml], 'only version, date and file source note should change');
		assert.equal(pulls.length, 1);
		assert.equal(pulls[0].branch, branch);
		assert.equal(pulls[0].title, 'Update Demo to 1.0 Beta 2');
		assert.match(pulls[0].body, /MPC-Simple-1\.0-Beta-2\.zip\/download/);
		assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).demo.fingerprint, fpC);

		existingPull = { number: 1, title: pulls[0].title, body: pulls[0].body };
		branchYaml += '# Maintainer note\n';
		const linkOnlyVersion = rssNewFirstItem.replace('<![CDATA[/MPC-Simple-1.0-Beta-2.zip]]>', 'Download the latest beta')
			.replace('Sun, 16 Nov 2026', 'Mon, 17 Nov 2026');
		await watchChange(versionedEntry, linkOnlyVersion);
		assert.equal(commits[1], releaseYaml.replace('2026-11-16', '2026-11-17') + '# Maintainer note\n');
		assert.equal(pulls.length, 1, 'open PR must not be duplicated');
		assert.equal(newRefs.length, 1);
		assert.equal(updatedPulls.length, 1);
		assert.match(updatedPulls[0].body, /Download the latest beta/);

		await watchChange({ ...versionedEntry, record: { ...versionedEntry.record, version: '1.0 Beta 2' } });
		await watchChange(entry);
		await watchChange(versionedEntry, rssNewFirstItem.replace(/<pubDate>(.*?)<\/pubDate>/g, '<updated>$1</updated>'));
		await watchChange({ ...versionedEntry, record: { ...versionedEntry.record, watch_version: 'Release (.+)' } });
		assert.equal(pulls.length, 1);
		assert.equal(commits.length, 2);
		assert.deepEqual(issues.map(({ title }) => title), Array(4).fill('Release watch: Demo changed upstream'));
	} finally {
		globalThis.fetch = realFetch;
	}
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

// Entries without a repo: feed items win; otherwise one row from version/released. Betas are pre-releases.
const feedRows = manualReleases({ website: 'https://x.test' }, [{ title: '/MPC-Simple-1.0-Beta-10.zip', published_at: '2026-11-24T04:06:03Z', html_url: 'https://dl.test/b10' }]);
assert.equal(feedRows.length, 1);
assert.equal(feedRows[0].tag, '1.0 Beta 10');
assert.equal(feedRows[0].prerelease, true);
const manualRows = manualReleases({ version: '0.1.93 Beta', released: '2026-11-25', website: 'https://getdfos.com/' }, []);
assert.deepEqual(manualRows.map(({ tag, published_at, html_url, prerelease }) => ({ tag, published_at, html_url, prerelease })), [{ tag: '0.1.93 Beta', published_at: '2026-11-25', html_url: 'https://getdfos.com/', prerelease: true }]);
assert.equal(manualReleases({ version: '1.01', website: 'https://p.test' }, [])[0].prerelease, false);
assert.equal(manualReleases({ version: 'r30d-beta3' }, [])[0].prerelease, true);
assert.deepEqual(manualReleases({ website: 'https://none.test' }, []), []);

console.log('Watch checks passed: RSS channel dates ignored, first-item change, JSON, decideWatchUpdate, HTML hash, no-op runs, alert retry, page watch extract/diff.');
