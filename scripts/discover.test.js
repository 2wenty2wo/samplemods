import assert from 'node:assert/strict';
import {
	TITLE,
	topicMatch,
	normalizeRepo,
	filterAuthorRepos,
	filterForks,
	excludeKnown,
	parseTickedRepos,
	mergeDiscoveryBody,
	formatDiscoveryBody,
	syncDiscoveryIssue,
	candidateFromSearchItem,
	sinceDateDaysAgo,
	FEED_URL_ENV,
	feedHostname,
	isFeedSelfUrl,
	candidateFromFeedItem,
	filterFeedCandidates,
	fetchFeedItems,
	pickFeedHref,
	LIST_URL_ENV,
	listSourceRepo,
	githubReposFromMarkdown,
	filterListRepos,
	candidateFromListRepo,
	fetchListMarkdown,
	DIRECTORY_URL_ENV,
	fetchDirectoryCandidates,
	main as runDiscovery
} from './discover.js';

assert.match(sinceDateDaysAgo(30, new Date('2026-12-10T00:00:00Z')), /^2026-11-10$/);

assert.equal(topicMatch({ name: 'mpselector', description: 'A microSD launcher for the Akai MPC Sample', topics: [] }), true);
assert.equal(topicMatch({ name: 'notes', description: 'todo app', topics: [] }), false);
assert.equal(topicMatch({ name: 'tools', description: null, topics: ['akai', 'synth'] }), true);

const authors = filterAuthorRepos(
	[
		{ full_name: 'fomoPhil/mpselector', name: 'mpselector', description: 'One card, many firmwares. A microSD launcher for the Akai MPC Sample: turn the dial to pick which app or mod runs.', topics: [], created_at: '2026-11-25T00:00:00Z', stargazers_count: 3, archived: false, html_url: 'https://github.com/fomoPhil/mpselector' },
		{ full_name: 'fomoPhil/notes', name: 'notes', description: 'grocery list', topics: [], created_at: '2026-11-20T00:00:00Z', stargazers_count: 0, archived: false, html_url: 'https://github.com/fomoPhil/notes' },
		{ full_name: 'fomoPhil/old-mpc', name: 'old-mpc', description: 'akai thing', topics: [], created_at: '2026-01-01T00:00:00Z', stargazers_count: 1, archived: false, html_url: 'https://github.com/fomoPhil/old-mpc' }
	],
	'2026-11-10',
	'fomoPhil',
	'mp-doom'
);
assert.deepEqual(authors.map((c) => c.repo), ['fomoPhil/mpselector']);
assert.match(authors[0].reason, /catalog author fomoPhil/);

const forks = filterForks(
	[
		{ full_name: 'user/fork-a', stargazers_count: 0, created_at: '2026-11-15T00:00:00Z', archived: false, html_url: 'https://github.com/user/fork-a', description: 'copy', has_releases: false },
		{ full_name: 'user/fork-b', stargazers_count: 2, created_at: '2026-11-15T00:00:00Z', archived: false, html_url: 'https://github.com/user/fork-b', description: 'kept', has_releases: false },
		{ full_name: 'user/fork-c', stargazers_count: 0, created_at: '2026-11-15T00:00:00Z', archived: false, html_url: 'https://github.com/user/fork-c', description: 'released', has_releases: true, release_count: 2 }
	],
	'2026-11-10',
	'keremimo/melodee-sample'
);
assert.deepEqual(forks.map((c) => c.repo).sort(), ['user/fork-b', 'user/fork-c']);
assert.match(forks.find((c) => c.repo === 'user/fork-c').reason, /2 releases/);

const searchHit = candidateFromSearchItem(
	{ full_name: 'Trinzik-Labs2/ImageBoot', description: 'Boot tool', stargazers_count: 1, created_at: '2026-11-12T00:00:00Z', html_url: 'https://github.com/Trinzik-Labs2/ImageBoot', archived: false },
	'"MPC Sample" in:name,description,readme'
);
assert.equal(searchHit.repo, 'Trinzik-Labs2/ImageBoot');
assert.match(searchHit.reason, /^search:/);

const kept = excludeKnown(
	[
		searchHit,
		...authors,
		{ repo: 'fomoPhil/mp-doom', description: 'DOOM', stars: 10, created: '2026-01-01', reason: 'search: x', html_url: 'https://github.com/fomoPhil/mp-doom' },
		{ repo: 'someone/starred', description: 'x', stars: 1, created: '2026-11-11', reason: 'search: x', html_url: 'https://github.com/someone/starred' },
		{ repo: '2wenty2wo/samplemods', description: 'catalog', stars: 0, created: '2026-11-11', reason: 'search: x', html_url: 'https://github.com/2wenty2wo/samplemods' },
			{ repo: '2wenty2wo/mpc-boot-thingy', description: 'test copy', stars: 0, created: '2026-11-13', reason: 'search: x', html_url: 'https://github.com/2wenty2wo/mpc-boot-thingy' }
	],
	{
		catalogRepos: new Set(['fomophil/mp-doom']),
		starRepos: new Set(['someone/starred']),
		catalogRepo: '2wenty2wo/samplemods'
	}
);
assert.deepEqual(kept.candidates.map((c) => c.repo).sort(), ['Trinzik-Labs2/ImageBoot', 'fomoPhil/mpselector']);
assert.ok(kept.excluded.some((e) => e.repo === 'fomoPhil/mp-doom' && /catalog/i.test(e.why)));
assert.ok(kept.excluded.some((e) => e.repo === 'someone/starred' && /star list/i.test(e.why)));
assert.ok(kept.excluded.some((e) => e.repo === '2wenty2wo/mpc-boot-thingy' && /maintainer/i.test(e.why)));

const previous = [
	'- [x] [old/done](https://github.com/old/done): gone · ★1 · created 2026-10-01 · search: x',
	'- [ ] [gone/window](https://github.com/gone/window): left · ★0 · created 2026-10-01 · search: x',
	'- [ ] [Trinzik-Labs2/ImageBoot](https://github.com/Trinzik-Labs2/ImageBoot): Boot tool · ★1 · created 2026-11-12 · search: q'
].join('\n');
assert.deepEqual([...parseTickedRepos(previous)], ['old/done']);

const body = mergeDiscoveryBody(kept.candidates, previous);
assert.match(body, /- \[x\] \[old\/done\]/);
assert.doesNotMatch(body, /gone\/window/);
assert.match(body, /- \[ \] \[Trinzik-Labs2\/ImageBoot\]/);
assert.doesNotMatch(body, /- \[ \] \[old\/done\]/, 'ticked must not be re-added unticked');
assert.match(body, /Star a repo into the \[mpc-sample list\]/);
assert.equal(TITLE, 'Discovery candidates');

const formatted = formatDiscoveryBody(kept.candidates, parseTickedRepos(previous), previous);
assert.equal(formatted, body);

const originalFetch = globalThis.fetch;
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
try {
	const writes = [];
	let issue = null;
	let label = false;
	globalThis.fetch = async (url, options) => {
		assert.equal(options.headers.Authorization, 'Bearer issue-token');
		const method = options.method ?? 'GET';
		const data = options.body && JSON.parse(options.body);
		if (method !== 'GET') writes.push([method, url, data]);
		if (url.includes('/labels/discovery')) return reply({}, label ? 200 : 404);
		if (url.endsWith('/labels')) { label = true; return reply({}); }
		if (method === 'GET' && url.includes('state=open')) return reply(issue?.state === 'open' ? [issue] : []);
		if (method === 'GET' && url.includes('state=closed')) return reply([]);
		if (method === 'POST' && url.endsWith('/issues')) {
			issue = { number: 9, state: 'open', ...data, labels: data.labels.map((name) => ({ name })) };
		} else if (method === 'PATCH') {
			Object.assign(issue, data);
			if (data.labels) issue.labels = data.labels.map((name) => ({ name }));
		}
		return reply({});
	};

	await syncDiscoveryIssue('issue-token', 'owner/catalog', body, true);
	assert.equal(writes.length, 2, 'create label + issue');
	assert.equal(issue.title, TITLE);

	await syncDiscoveryIssue('issue-token', 'owner/catalog', body, true);
	assert.equal(writes.length, 2, 'identical body must not update');

	await syncDiscoveryIssue('issue-token', 'owner/catalog', body + '\n', true);
	assert.equal(writes.at(-1)[0], 'PATCH');

	await syncDiscoveryIssue('issue-token', 'owner/catalog', '', false);
	assert.equal(issue.state, 'closed');
	assert.match(writes.at(-2)[2].body, /No open discovery candidates/);
} finally {
	globalThis.fetch = originalFetch;
}

assert.equal(normalizeRepo('FomoPhil/MPSelector'), 'fomophil/mpselector');

const FEED_FIXTURE_URL = 'https://feed.example.com/data/items.json';
const FEED_HOST = feedHostname(FEED_FIXTURE_URL);
assert.equal(FEED_HOST, 'feed.example.com');

const feedFixture = [
	{
		slug: 'noisewave-ha',
		name: 'NOISEWAVE HA',
		summary: 'Hardware-adjacent noise tool',
		devices: ['mpc-sample'],
		added: '2026-11-20',
		links: { home: 'https://noisewaveha.hansaldrete.work/' },
		authors: [{ name: 'Hans', url: 'https://noisewaveha.hansaldrete.work/' }]
	},
	{
		slug: 'mpc-sample-emulator',
		name: 'MPC Sample Emulator',
		summary: 'Desktop emulator',
		devices: ['mpc-sample'],
		added: '2026-10-01',
		links: { home: 'https://github.com/Phenix2417/mpc-sample-emulator' },
		authors: [{ name: 'Phenix', url: 'https://github.com/Phenix2417' }]
	},
	{
		slug: 'mpc-sxl',
		name: 'MPC SXL',
		summary: 'Alpha OS',
		devices: ['mpc-sample'],
		added: '2026-11-26',
		links: {
			home: 'https://www.youtube.com/@jsensurreal1026',
			download: 'https://feed.example.com/files/jsensurreal/mod/mpc-sxl/alpha-0.0/MPC-SXL-Alpha-v0.0.zip'
		},
		authors: [{ name: 'Jsen Surreal', url: 'https://www.youtube.com/@jsensurreal1026' }]
	},
	{
		slug: 'melodee-sample',
		name: 'Melodee',
		summary: 'Already cataloged by slug',
		devices: ['mpc-sample'],
		added: '2026-01-01',
		links: { home: 'https://github.com/keremimo/melodee-sample' },
		authors: []
	},
	{
		slug: 'other-device-only',
		name: 'Live Only',
		summary: 'Not for Sample',
		devices: ['mpc-live'],
		added: '2026-11-01',
		links: { home: 'https://example.com/live' },
		authors: []
	},
	{
		slug: 'dup-search-hit',
		name: 'ImageBoot',
		summary: 'Also found by GitHub search',
		devices: ['mpc-sample'],
		added: '2026-11-12',
		links: { home: 'https://github.com/Trinzik-Labs2/ImageBoot' },
		authors: []
	},
	{
		slug: 'self-host-only',
		name: 'Self Hosted Only',
		summary: 'Only points at the feed host',
		devices: ['mpc-sample'],
		added: '2026-11-15',
		links: { home: 'https://feed.example.com/items/self-hosted-only' },
		authors: [{ name: 'Self', url: 'https://cdn.feed.example.com/author' }]
	}
];

assert.equal(candidateFromFeedItem(feedFixture[4], FEED_HOST), null, 'non-mpc-sample devices drop out');
assert.equal(isFeedSelfUrl('https://feed.example.com/files/x', FEED_HOST), true);
assert.equal(isFeedSelfUrl('https://cdn.feed.example.com/x', FEED_HOST), true);
assert.equal(isFeedSelfUrl('https://noisewaveha.hansaldrete.work/', FEED_HOST), false);
assert.equal(isFeedSelfUrl('https://example.com/live', FEED_HOST), false);
assert.equal(pickFeedHref(feedFixture[2], FEED_HOST), 'https://www.youtube.com/@jsensurreal1026');
assert.doesNotMatch(pickFeedHref(feedFixture[2], FEED_HOST) ?? '', /feed\.example\.com/i);
assert.equal(pickFeedHref(feedFixture[6], FEED_HOST), null, 'self-host home/author links are rejected');
const selfOnly = candidateFromFeedItem(feedFixture[6], FEED_HOST);
assert.ok(selfOnly);
assert.equal(selfOnly.html_url, null);
const attributed = candidateFromFeedItem({
	...feedFixture[0],
	summary: 'Hardware-adjacent noise tool. Unconfirmed by FeedSite.'
}, 'www.feedsite.example');
assert.equal(attributed.description, 'Hardware-adjacent noise tool.');

const feedCatalog = [
	{ id: 'sxl', record: { name: 'MPC SXL', repo: null } },
	{ id: 'melodee-sample', record: { name: 'Melodee', repo: 'keremimo/melodee-sample' } }
];
const feedKept = filterFeedCandidates(feedFixture, feedCatalog, FEED_HOST);
assert.deepEqual(
	feedKept.map((c) => c.repo).sort(),
	['NOISEWAVE HA', 'Phenix2417/mpc-sample-emulator', 'Self Hosted Only', 'Trinzik-Labs2/ImageBoot'].sort(),
	'only uncataloged mpc-sample items remain (SXL excluded by name, Melodee by slug/repo)'
);
assert.equal(feedKept.find((c) => c.repo === 'NOISEWAVE HA').html_url, 'https://noisewaveha.hansaldrete.work/');
assert.match(feedKept.find((c) => c.repo === 'NOISEWAVE HA').reason, /listed in a community catalog \(added 2026-11-20\)/);
for (const row of feedKept) {
	assert.equal(isFeedSelfUrl(row.html_url, FEED_HOST), false, `no feed-host URL in candidate: ${row.repo}`);
	assert.doesNotMatch(JSON.stringify(row), /feed\.example\.com/i);
}

const deduped = excludeKnown(
	[searchHit, ...feedKept],
	{ catalogRepos: new Set(['keremimo/melodee-sample']), starRepos: new Set(), catalogRepo: '2wenty2wo/samplemods' }
);
assert.equal(
	deduped.candidates.filter((c) => normalizeRepo(c.repo) === 'trinzik-labs2/imageboot').length,
	1,
	'GitHub search + catalog feed same repo must appear once'
);

const plainPrevious = [
	'- [x] NOISEWAVE HA: Hardware-adjacent noise tool · ★0 · created 2026-11-20 · listed in a community catalog (added 2026-11-20)',
	'- [ ] Phenix2417/mpc-sample-emulator: old unticked · ★0 · created 2026-10-01 · listed in a community catalog (added 2026-10-01)'
].join('\n');
assert.deepEqual([...parseTickedRepos(plainPrevious)], ['noisewave ha']);
const plainBody = mergeDiscoveryBody(
	feedKept.filter((c) => c.repo === 'NOISEWAVE HA' || c.repo === 'Phenix2417/mpc-sample-emulator'),
	plainPrevious
);
assert.match(plainBody, /- \[x\] NOISEWAVE HA:/);
assert.doesNotMatch(plainBody, /- \[ \] NOISEWAVE HA:/, 'plain-text ticked rows must survive and not reappear unticked');
assert.match(plainBody, /- \[ \] \[Phenix2417\/mpc-sample-emulator\]\(https:\/\/github\.com\/Phenix2417\/mpc-sample-emulator\):/);
assert.doesNotMatch(plainBody, /feed\.example\.com/i);

{
	// Colon in plain-text name: backtick delimiter keeps the full ticked key.
	const colonCandidate = {
		repo: 'Synth: Sample',
		description: 'has a colon',
		stars: 0,
		created: '2026-11-20',
		reason: 'listed in a community catalog (added 2026-11-20)',
		html_url: null
	};
	const colonBody = mergeDiscoveryBody([colonCandidate], '');
	assert.match(colonBody, /- \[ \] `Synth: Sample`:/);
	const colonTicked = colonBody.replace('- [ ] `Synth: Sample`:', '- [x] `Synth: Sample`:');
	assert.deepEqual([...parseTickedRepos(colonTicked)], ['synth: sample']);
	const colonMerged = mergeDiscoveryBody([colonCandidate], colonTicked);
	assert.match(colonMerged, /- \[x\] `Synth: Sample`:/);
	assert.doesNotMatch(colonMerged, /- \[ \] `Synth: Sample`:/, 'ticked colon-name row must not reappear unchecked');
	assert.equal([...colonMerged.matchAll(/Synth: Sample/g)].length, 1);
}

{
	// Parentheses in link URLs: encode so LINK_ROW_RE still recognises the ticked row.
	const parenCandidate = {
		repo: 'example/synth-sample',
		description: 'parens in url',
		stars: 0,
		created: '2026-11-20',
		reason: 'search: x',
		html_url: 'https://example.com/Synth_(Sample)'
	};
	const parenBody = mergeDiscoveryBody([parenCandidate], '');
	assert.match(parenBody, /https:\/\/example\.com\/Synth_%28Sample%29/);
	assert.doesNotMatch(parenBody, /Synth_\(Sample\)/);
	const parenTicked = parenBody.replace('- [ ] [', '- [x] [');
	assert.deepEqual([...parseTickedRepos(parenTicked)], ['example/synth-sample']);
	const parenMerged = mergeDiscoveryBody([parenCandidate], parenTicked);
	assert.match(parenMerged, /- \[x\] \[example\/synth-sample\]\(https:\/\/example\.com\/Synth_%28Sample%29\):/);
	assert.doesNotMatch(parenMerged, /- \[ \] \[example\/synth-sample\]/, 'ticked paren-URL row must not reappear unchecked');
}

{
	// Legacy plain rows (no backticks) still parse as a fallback.
	const legacyPrevious = '- [x] NOISEWAVE HA: old style · ★0 · created 2026-11-20 · listed in a community catalog (added 2026-11-20)';
	assert.deepEqual([...parseTickedRepos(legacyPrevious)], ['noisewave ha']);
	const legacyMerged = mergeDiscoveryBody(
		[{
			repo: 'NOISEWAVE HA',
			description: 'x',
			stars: 0,
			created: '2026-11-20',
			reason: 'listed in a community catalog (added 2026-11-20)',
			html_url: null
		}],
		legacyPrevious
	);
	assert.match(legacyMerged, /- \[x\] NOISEWAVE HA:/);
	assert.doesNotMatch(legacyMerged, /- \[ \] `?NOISEWAVE HA`?:/, 'legacy ticked plain row must not reappear unchecked');
}

{
	const warnings = [];
	const logs = [];
	const warn = console.warn;
	const log = console.log;
	console.warn = (message) => warnings.push(message);
	console.log = (message) => logs.push(message);
	const originalFetch = globalThis.fetch;
	const previousFeedUrl = process.env[FEED_URL_ENV];
	try {
		process.env[FEED_URL_ENV] = FEED_FIXTURE_URL;
		globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => [] });
		assert.equal(await fetchFeedItems(), null);
		globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ not: 'array' }) });
		assert.equal(await fetchFeedItems(), null);
		globalThis.fetch = async () => { throw new Error('offline'); };
		assert.equal(await fetchFeedItems(), null);
	} finally {
		console.warn = warn;
		console.log = log;
		globalThis.fetch = originalFetch;
		if (previousFeedUrl === undefined) delete process.env[FEED_URL_ENV];
		else process.env[FEED_URL_ENV] = previousFeedUrl;
	}
	assert.equal(warnings.length, 3);
	assert.ok(warnings.every((message) => /catalog feed/i.test(message)));
}

{
	const logs = [];
	const log = console.log;
	console.log = (message) => logs.push(message);
	const previousFeedUrl = process.env[FEED_URL_ENV];
	try {
		delete process.env[FEED_URL_ENV];
		assert.deepEqual(await fetchFeedItems(), []);
		assert.match(logs.at(-1) ?? '', /Catalog feed URL unset; continuing without feed candidates/);
	} finally {
		console.log = log;
		if (previousFeedUrl === undefined) delete process.env[FEED_URL_ENV];
		else process.env[FEED_URL_ENV] = previousFeedUrl;
	}
}

const LIST_FIXTURE_URL = 'https://raw.githubusercontent.com/example/list/main/README.md';
assert.equal(listSourceRepo(LIST_FIXTURE_URL), 'example/list');
const listedSource = excludeKnown([candidateFromSearchItem({ full_name: 'Example/List' }, 'query')], {
	catalogRepos: new Set(),
	starRepos: new Set(['example/list']),
	listUrl: LIST_FIXTURE_URL
});
assert.deepEqual(listedSource, { candidates: [], excluded: [] });
assert.equal(listSourceRepo('https://example.com/not-raw'), null);

const listMarkdown = [
	'# Sample list',
	'',
	'- [Alpha](https://github.com/open-mpc/mpc-vst-plugins)',
	'- Dup again https://github.com/open-mpc/mpc-vst-plugins/releases/tag/v1',
	'- Subpath https://github.com/someone/tool/blob/main/README.md',
	'- Self https://github.com/example/list',
	'- Cataloged https://github.com/keremimo/melodee-sample',
	'- External https://example.com/not-github',
	'- Builder https://github.com/inmusic-software/mpc-plugin-builder-sdk'
].join('\n');

assert.deepEqual(
	githubReposFromMarkdown(listMarkdown).sort(),
	[
		'example/list',
		'inmusic-software/mpc-plugin-builder-sdk',
		'keremimo/melodee-sample',
		'open-mpc/mpc-vst-plugins',
		'someone/tool'
	].sort(),
	'extract unique owner/repo links; deeper paths reduce to owner/repo'
);

const listCatalog = [
	{ id: 'melodee-sample', record: { name: 'Melodee', repo: 'keremimo/melodee-sample' } }
];
const listRepos = filterListRepos(githubReposFromMarkdown(listMarkdown), LIST_FIXTURE_URL, listCatalog);
assert.deepEqual(
	listRepos.sort(),
	['inmusic-software/mpc-plugin-builder-sdk', 'open-mpc/mpc-vst-plugins', 'someone/tool'].sort(),
	'self-repo and catalog repos are dropped'
);

const listCandidate = candidateFromListRepo('open-mpc/mpc-vst-plugins', {
	full_name: 'open-mpc/mpc-vst-plugins',
	description: 'VST helpers',
	stargazers_count: 4,
	created_at: '2026-11-01T00:00:00Z',
	html_url: 'https://github.com/open-mpc/mpc-vst-plugins',
	archived: false
});
assert.equal(listCandidate.repo, 'open-mpc/mpc-vst-plugins');
assert.equal(listCandidate.reason, 'listed in a curated list');
assert.equal(listCandidate.stars, 4);
assert.equal(candidateFromListRepo('gone/archived', { full_name: 'gone/archived', archived: true }), null);

const listDeduped = excludeKnown(
	[searchHit, listCandidate],
	{ catalogRepos: new Set(), starRepos: new Set(), catalogRepo: '2wenty2wo/samplemods' }
);
assert.equal(
	listDeduped.candidates.filter((c) => normalizeRepo(c.repo) === 'trinzik-labs2/imageboot').length,
	1
);
assert.ok(listDeduped.candidates.some((c) => c.repo === 'open-mpc/mpc-vst-plugins'));

const sameRepoList = candidateFromListRepo('Trinzik-Labs2/ImageBoot', {
	full_name: 'Trinzik-Labs2/ImageBoot',
	description: 'Boot tool',
	stargazers_count: 1,
	created_at: '2026-11-12T00:00:00Z',
	html_url: 'https://github.com/Trinzik-Labs2/ImageBoot',
	archived: false
});
const crossSourceDeduped = excludeKnown(
	[searchHit, sameRepoList],
	{ catalogRepos: new Set(), starRepos: new Set(), catalogRepo: '2wenty2wo/samplemods' }
);
assert.equal(
	crossSourceDeduped.candidates.filter((c) => normalizeRepo(c.repo) === 'trinzik-labs2/imageboot').length,
	1,
	'GitHub search + curated list same repo must appear once'
);

{
	const warnings = [];
	const logs = [];
	const warn = console.warn;
	const log = console.log;
	console.warn = (message) => warnings.push(message);
	console.log = (message) => logs.push(message);
	const originalFetch = globalThis.fetch;
	const previousListUrl = process.env[LIST_URL_ENV];
	try {
		process.env[LIST_URL_ENV] = LIST_FIXTURE_URL;
		globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => '' });
		assert.equal(await fetchListMarkdown(), null);
		globalThis.fetch = async () => { throw new Error('offline'); };
		assert.equal(await fetchListMarkdown(), null);
	} finally {
		console.warn = warn;
		console.log = log;
		globalThis.fetch = originalFetch;
		if (previousListUrl === undefined) delete process.env[LIST_URL_ENV];
		else process.env[LIST_URL_ENV] = previousListUrl;
	}
	assert.equal(warnings.length, 2);
	assert.ok(warnings.every((message) => /curated list/i.test(message)));
}

{
	const logs = [];
	const log = console.log;
	console.log = (message) => logs.push(message);
	const previousListUrl = process.env[LIST_URL_ENV];
	try {
		delete process.env[LIST_URL_ENV];
		assert.equal(await fetchListMarkdown(), '');
		assert.match(logs.at(-1) ?? '', /Curated list URL unset; continuing without list candidates/);
	} finally {
		console.log = log;
		if (previousListUrl === undefined) delete process.env[LIST_URL_ENV];
		else process.env[LIST_URL_ENV] = previousListUrl;
	}
}

{
	const messages = [];
	const { warn, log } = console;
	const privateHost = 'directory.example.com';
	const privateUrl = `https://${privateHost}/private`;
	const failingFetch = async () => {
		throw new Error(`Could not fetch ${privateUrl}`, { cause: new Error(`DNS failed for ${privateHost}`) });
	};
	console.warn = console.log = (...args) => messages.push(args.join(' '));
	try {
		assert.equal(await fetchFeedItems(failingFetch, { [FEED_URL_ENV]: privateUrl }), null);
		assert.equal(await fetchListMarkdown(failingFetch, { [LIST_URL_ENV]: privateUrl }), null);
		assert.equal(await fetchDirectoryCandidates([], failingFetch, { [DIRECTORY_URL_ENV]: privateUrl }), null);
		const httpFailure = (status) => async () => new Response(privateUrl, { status });
		assert.equal(await fetchFeedItems(httpFailure(403), { [FEED_URL_ENV]: privateUrl }), null);
		assert.equal(await fetchListMarkdown(httpFailure(429), { [LIST_URL_ENV]: privateUrl }), null);
		assert.equal(await fetchDirectoryCandidates([], httpFailure(503), { [DIRECTORY_URL_ENV]: privateUrl }), null);
	} finally {
		Object.assign(console, { warn, log });
	}
	assert.match(messages.join('\n'), /catalog feed/i);
	assert.match(messages.join('\n'), /curated list/i);
	assert.match(messages.join('\n'), /mod directory/i);
	assert.ok(messages.every((message) => !message.includes(privateHost)), 'source logs must omit hostnames');
	assert.deepEqual(messages, [
		'warn: catalog feed network error.',
		'warn: curated list network error.',
		'warn: mod directory network error.',
		'warn: catalog feed returned HTTP 403.',
		'warn: curated list returned HTTP 429.',
		'warn: mod directory returned HTTP 503.'
	]);
}

const directoryUrl = 'https://directory.example.com/mods/sampler/';
const directoryEnv = { [DIRECTORY_URL_ENV]: directoryUrl };
const ldScript = (data) => `<script type='application/ld+json'>${JSON.stringify(data)}</script>`;
const directoryList = (items) => ldScript({
	'@type': 'CollectionPage',
	mainEntity: { '@type': 'ItemList', itemListElement: items.map(([name, url]) => ({ name, url })) }
});
const directoryResponse = (body, status = 200) => new Response(body, { status });
const directoryDetail = (sameAs) => ldScript({ '@graph': [{ '@type': 'SoftwareApplication', sameAs }] });

async function runDiscoveryFixture({ previousBody, feedStatus = 200, otherStatus = 200, searchStatus = 200, fresh = false }) {
	const env = {
		GITHUB_TOKEN: 'fixture-token', GITHUB_REPOSITORY: 'fixture/catalog', STAR_LIST_SLUG: 'mpc-sample',
		[FEED_URL_ENV]: FEED_FIXTURE_URL, [LIST_URL_ENV]: LIST_FIXTURE_URL, [DIRECTORY_URL_ENV]: directoryUrl
	};
	const originalEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
	const { fetch, setTimeout } = globalThis;
	const { log, warn } = console;
	const writes = [];
	const unexpected = [];
	const base = 'https://api.github.com/';
	const issue = { number: 21, title: TITLE, state: 'open', labels: [{ name: 'discovery' }], body: previousBody };
	Object.assign(process.env, env);
	console.log = console.warn = () => {};
	globalThis.setTimeout = (callback) => queueMicrotask(callback);
	globalThis.fetch = async (url, options) => {
		if (url === FEED_FIXTURE_URL) return reply([], feedStatus);
		if (url === LIST_FIXTURE_URL) return directoryResponse(fresh ? 'https://github.com/fixture/list-tool' : '', otherStatus);
		if (url === directoryUrl) return directoryResponse(directoryList(fresh ? [['Directory Tool', '/entries/tool']] : []), otherStatus);
		if (url === new URL('/entries/tool', directoryUrl).href) return directoryResponse('<html></html>');
		const endpoint = url.slice(base.length);
		if (endpoint === 'graphql') {
			const { variables } = JSON.parse(options.body);
			const pageInfo = { hasNextPage: false };
			return reply({ data: variables.user
				? { user: { lists: { nodes: [{ id: 'fixture', slug: 'mpc-sample' }], pageInfo } } }
				: { node: { items: { nodes: [{ nameWithOwner: 'Fixture/Starred' }], pageInfo } } } });
		}
		if (endpoint.startsWith('search/repositories?')) return reply({ items: [] }, searchStatus);
		if (endpoint.startsWith('users/Fixture/repos?') || endpoint.startsWith('repos/Fixture/Known/forks?')) return reply([]);
		if (endpoint === 'repos/fixture/list-tool') return reply({ full_name: 'fixture/list-tool', description: 'Fresh list result' });
		if (endpoint === 'repos/fixture/catalog/labels/discovery') return reply({});
		if (endpoint.startsWith('repos/fixture/catalog/issues?state=open')) return reply([issue]);
		if (/^repos\/fixture\/catalog\/issues\/21(?:\/comments)?$/.test(endpoint)) {
			writes.push({ method: options.method, ...JSON.parse(options.body) });
			return reply({});
		}
		unexpected.push(url);
		throw new Error('Unexpected fixture request');
	};
	try {
		await runDiscovery([{ id: 'maker-known', record: { name: 'Maker Known', repo: 'Fixture/Known' } }]);
	} finally {
		Object.assign(globalThis, { fetch, setTimeout });
		Object.assign(console, { log, warn });
		for (const [key, value] of Object.entries(originalEnv)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
	assert.deepEqual(unexpected, []);
	return writes;
}

{
	const oldFeed = '- [ ] [Feed Tool](https://maker.example.com/feed-tool): Old feed result';
	const known = '- [ ] [fixture/known](https://github.com/fixture/known): Now in the catalog';
	const knownName = '- [ ] `Maker Known`: Now in the catalog by name';
	const starred = '- [ ] [fixture/starred](https://github.com/fixture/starred): Now starred';
	const duplicate = '- [ ] [Fixture/List-Tool](https://github.com/fixture/list-tool): Stale list result';
	const ticked = '- [x] `Dismissed Tool`: Already reviewed';
	const previousBody = [oldFeed, known, knownName, starred, duplicate, ticked].join('\n');
	const writes = await runDiscoveryFixture({ previousBody, feedStatus: 403, fresh: true });
	assert.equal(writes.length, 1);
	assert.equal(writes[0].method, 'PATCH');
	assert.equal(writes[0].state, undefined);
	assert.ok(writes[0].body.includes(oldFeed));
	assert.ok(writes[0].body.includes(ticked));
	assert.match(writes[0].body, /Fresh list result/);
	assert.match(writes[0].body, /Directory Tool/);
	assert.doesNotMatch(writes[0].body, /Now in the catalog|Now starred|Stale list result/);

	const empty = await runDiscoveryFixture({ previousBody: known, feedStatus: 403 });
	assert.equal(empty.length, 1);
	assert.equal(empty[0].state, undefined);
	assert.doesNotMatch(empty[0].body, /- \[ \]/);

	const healthy = await runDiscoveryFixture({ previousBody });
	assert.equal(healthy.at(-1).state, 'closed');
	const replaced = await runDiscoveryFixture({ previousBody, fresh: true });
	assert.doesNotMatch(replaced[0].body, /Old feed result/);
	assert.match(replaced[0].body, /Fresh list result/);

	const searchUnavailable = await runDiscoveryFixture({ previousBody, fresh: true, searchStatus: 503 });
	assert.match(searchUnavailable[0].body, /Fresh list result/);
	assert.ok(searchUnavailable[0].body.includes(oldFeed));

	const unavailable = await runDiscoveryFixture({ previousBody, feedStatus: 403, otherStatus: 503, searchStatus: 503 });
	assert.deepEqual(unavailable, []);
}

{
	const makerUrl = 'https://maker.example.com/kit';
	const matches = [{ id: 'different-id', record: { name: 'Same [Name]' } }, { id: 'already-known', record: {} }];
	const pages = new Map([
		[directoryUrl, `<script type="application/ld+json">malformed</script>${directoryList([
			['  Same   [NAME] ', '/entries/name-match'], ['Different title', '/entries/already-known/'],
			['Offsite', 'https://elsewhere.example.com/item'], ['Wrong port', 'https://directory.example.com:444/item'],
			['Repo tool', '/entries/repo'], ['Maker kit', '/entries/kit'], ['Second kit', '/entries/kit2'],
			['Directory link only', '/entries/self'], ['No link', '/entries/plain'], ['Broken detail', '/entries/broken']
		])}`],
		['https://directory.example.com/entries/repo', directoryDetail('https://github.com/Owner/Repo/releases/latest')],
		['https://directory.example.com/entries/kit', `<header class='library-head mods-head'><a href='${makerUrl}' class='mods-go button'>Get it</a></header>`],
		['https://directory.example.com/entries/kit2', directoryDetail(['https://directory.example.com/entries/kit2', makerUrl])],
		['https://directory.example.com/entries/self', directoryDetail('https://sub.directory.example.com./entries/self')],
		['https://directory.example.com/entries/plain', '<html></html>']
	]);
	const requests = [];
	const directory = await fetchDirectoryCandidates(matches, async (url, options) => {
		requests.push(url);
		assert.equal(options.redirect, 'error');
		assert.ok(options.headers['User-Agent']);
		return pages.has(url) ? directoryResponse(pages.get(url)) : directoryResponse('private body', 502);
	}, directoryEnv);
	assert.deepEqual(requests, [...pages.keys(), 'https://directory.example.com/entries/broken']);
	assert.deepEqual(directory.map(({ repo, html_url: href, reason }) => [repo, href, reason]), [
		['owner/repo', 'https://github.com/owner/repo', 'listed in a mod directory'],
		['Maker kit', makerUrl, 'listed in a mod directory'],
		['Second kit', makerUrl, 'listed in a mod directory'],
		['Directory link only', null, 'listed in a mod directory'],
		['No link', null, 'listed in a mod directory']
	]);
	assert.doesNotMatch(formatDiscoveryBody(directory), /directory\.example\.com/i);
	const feed = candidateFromFeedItem({ devices: ['mpc-sample'], links: { repo: 'https://github.com/OWNER/Repo' } });
	const list = candidateFromListRepo('owner/repo', null);
	const exclusions = { catalogRepos: new Set(), starRepos: new Set() };
	for (const source of [feed, list]) {
		assert.equal(excludeKnown([source, ...directory], exclusions).candidates.length, directory.length);
	}
	const known = excludeKnown(directory, { ...exclusions, catalogRepos: new Set(['owner/repo']) });
	assert.equal(known.excluded[0].why, 'already in catalog');
}

{
	const items = Array.from({ length: 12 }, (_, i) => [`Item ${i}`, `/entries/${String(i).padStart(2, '0')}`]);
	const requests = [];
	const directory = await fetchDirectoryCandidates([], async (url) => {
		requests.push(url);
		if (url === directoryUrl) return directoryResponse(directoryList(items));
		if (url.endsWith('/00')) throw new Error('detail failed');
		return directoryResponse('<html></html>');
	}, directoryEnv, new Date(0));
	assert.equal(requests.length, 11);
	assert.deepEqual(directory.map(({ repo }) => repo), items.slice(1, 10).map(([name]) => name));
}

{
	const items = Array.from({ length: 25 }, (_, i) => [`Item ${i}`, `/entries/${i}`]);
	const inspected = new Set();
	for (let day = 1; day <= 3; day += 1) {
		const listing = day === 2 ? [...items].reverse() : items;
		const requests = [];
		await fetchDirectoryCandidates([], async (url) => {
			if (url === directoryUrl) return directoryResponse(directoryList(listing));
			requests.push(url);
			inspected.add(url);
			return directoryResponse('<html></html>');
		}, directoryEnv, new Date(Date.UTC(2026, 10, day)));
		assert.equal(requests.length, 10);
	}
	assert.deepEqual(inspected, new Set(items.map(([, url]) => new URL(url, directoryUrl).href)));
}

{
	const logs = [];
	const { warn, log } = console;
	console.warn = console.log = (...args) => logs.push(args.join(' '));
	try {
		let fetches = 0;
		assert.deepEqual(await fetchDirectoryCandidates([], async () => { fetches += 1; }, {}), []);
		assert.equal(fetches, 0);
		assert.equal(logs.length, 1);
		assert.match(logs[0], /mod directory.*unset/i);
		const privateBody = 'https://directory.example.com/private';
		for (const [body, status] of [[privateBody, 503], [directoryList([]), 201], [privateBody, 200]]) {
			assert.equal(await fetchDirectoryCandidates([], async () => directoryResponse(body, status), directoryEnv), null);
		}
		assert.deepEqual(await fetchDirectoryCandidates([], async () => directoryResponse(directoryList([])), directoryEnv), []);
		assert.ok(logs.every((message) => !message.includes(privateBody)));
	} finally {
		Object.assign(console, { warn, log });
	}
}

console.log('Discovery checks passed: search/author/fork filters, exclusions, ticked merge, issue lifecycle, external source filtering and fail-soft logging.');
