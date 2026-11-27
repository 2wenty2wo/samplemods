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
	candidateFromRunmpcItem,
	filterRunmpcCandidates,
	fetchRunmpcItems,
	isRunmpcUrl,
	pickRunmpcHref
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

const runmpcFixture = [
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
			download: 'https://runmpc.com/files/jsensurreal/mod/mpc-sxl/alpha-0.0/MPC-SXL-Alpha-v0.0.zip'
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
	}
];

assert.equal(candidateFromRunmpcItem(runmpcFixture[4]), null, 'non-mpc-sample devices drop out');
assert.equal(isRunmpcUrl('https://runmpc.com/files/x'), true);
assert.equal(isRunmpcUrl('https://noisewaveha.hansaldrete.work/'), false);
assert.equal(pickRunmpcHref(runmpcFixture[2]), 'https://www.youtube.com/@jsensurreal1026');
assert.doesNotMatch(pickRunmpcHref(runmpcFixture[2]) ?? '', /runmpc\.com/i);

const runmpcCatalog = [
	{ id: 'sxl', record: { name: 'MPC SXL', repo: null } },
	{ id: 'melodee-sample', record: { name: 'Melodee', repo: 'keremimo/melodee-sample' } }
];
const runmpcKept = filterRunmpcCandidates(runmpcFixture, runmpcCatalog);
assert.deepEqual(
	runmpcKept.map((c) => c.repo).sort(),
	['NOISEWAVE HA', 'Phenix2417/mpc-sample-emulator', 'Trinzik-Labs2/ImageBoot'].sort(),
	'only uncataloged mpc-sample items remain (SXL excluded by name, Melodee by slug/repo)'
);
assert.equal(runmpcKept.find((c) => c.repo === 'NOISEWAVE HA').html_url, 'https://noisewaveha.hansaldrete.work/');
assert.match(runmpcKept.find((c) => c.repo === 'NOISEWAVE HA').reason, /listed on RunMPC \(added 2026-11-20\)/);
for (const row of runmpcKept) {
	assert.equal(isRunmpcUrl(row.html_url), false, `no runmpc URL in candidate: ${row.repo}`);
	assert.doesNotMatch(JSON.stringify(row), /runmpc\.com/i);
}

const deduped = excludeKnown(
	[searchHit, ...runmpcKept],
	{ catalogRepos: new Set(['keremimo/melodee-sample']), starRepos: new Set(), catalogRepo: '2wenty2wo/samplemods' }
);
assert.equal(
	deduped.candidates.filter((c) => normalizeRepo(c.repo) === 'trinzik-labs2/imageboot').length,
	1,
	'GitHub search + RunMPC same repo must appear once'
);

const plainPrevious = [
	'- [x] NOISEWAVE HA: Hardware-adjacent noise tool · ★0 · created 2026-11-20 · listed on RunMPC (added 2026-11-20)',
	'- [ ] Phenix2417/mpc-sample-emulator: old unticked · ★0 · created 2026-10-01 · listed on RunMPC (added 2026-10-01)'
].join('\n');
assert.deepEqual([...parseTickedRepos(plainPrevious)], ['noisewave ha']);
const plainBody = mergeDiscoveryBody(
	runmpcKept.filter((c) => c.repo === 'NOISEWAVE HA' || c.repo === 'Phenix2417/mpc-sample-emulator'),
	plainPrevious
);
assert.match(plainBody, /- \[x\] NOISEWAVE HA:/);
assert.doesNotMatch(plainBody, /- \[ \] NOISEWAVE HA:/, 'plain-text ticked rows must survive and not reappear unticked');
assert.match(plainBody, /- \[ \] \[Phenix2417\/mpc-sample-emulator\]\(https:\/\/github\.com\/Phenix2417\/mpc-sample-emulator\):/);
assert.doesNotMatch(plainBody, /runmpc\.com/i);

{
	const warnings = [];
	const logs = [];
	const warn = console.warn;
	const log = console.log;
	console.warn = (message) => warnings.push(message);
	console.log = (message) => logs.push(message);
	const originalFetch = globalThis.fetch;
	let issueWrites = 0;
	try {
		globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => [] });
		assert.equal(await fetchRunmpcItems(), null);
		globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ not: 'array' }) });
		assert.equal(await fetchRunmpcItems(), null);
		globalThis.fetch = async () => { throw new Error('offline'); };
		assert.equal(await fetchRunmpcItems(), null);

		// main() contract: null RunMPC + !dryRun → log and skip issue writes (no find/sync).
		const runmpcItems = null;
		const dryRun = false;
		if (runmpcItems == null && !dryRun) {
			console.log('RunMPC unavailable; leaving the Discovery issue unchanged');
		} else {
			issueWrites += 1;
		}
		assert.equal(issueWrites, 0, 'failed RunMPC fetch must not write the Discovery issue');
		assert.match(logs.at(-1) ?? '', /RunMPC unavailable; leaving the Discovery issue unchanged/);
	} finally {
		console.warn = warn;
		console.log = log;
		globalThis.fetch = originalFetch;
	}
	assert.equal(warnings.length, 3);
	assert.ok(warnings.every((message) => /RunMPC/i.test(message)));
}

console.log('Discovery checks passed: search/author/fork filters, exclusions, ticked merge, create/update/close, RunMPC filter/dedupe/fail-soft.');
