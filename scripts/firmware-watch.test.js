import assert from 'node:assert/strict';
import {
	TITLE,
	parseListedBuilds,
	scanEntry,
	scanFlags,
	formatIssueBody,
	syncFirmwareIssue
} from './firmware-watch.js';

assert.deepEqual(
	parseListedBuilds('1.3.0.12, 1.4.0.7 (v0.6.6+), 1.4.0.8 (v0.8.0+)'),
	['1.3.0.12', '1.4.0.7', '1.4.0.8']
);

const base = {
	id: 'demo',
	section: 'apps',
	record: { firmware: '1.3.0.12', repo: 'owner/demo' }
};

const noFirmware = { ...base, record: { repo: base.record.repo } };
assert.deepEqual(
	scanEntry(noFirmware, { readme: 'Requires firmware 1.4.0.8.' }).map((f) => f.build),
	['1.4.0.8'],
	'entry without a firmware field gets scanned'
);

assert.deepEqual(
	scanEntry(base, {
		readme: 'Works on 1.4.0.8\nTested on MPC Sample 1.4.0.7\nRequires stock OS 1.5.0.1 and 1.5.0.2'
	}).map((f) => f.build),
	['1.4.0.7', '1.4.0.8', '1.5.0.1', '1.5.0.2'],
	'compatibility context identifies builds without the word firmware'
);

assert.deepEqual(
	scanEntry(base, {
		releases: [{ tag: 'v1.4.0', body: 'MPC Sample plug-in v1.4.0 works on MPC Sample.' }]
	}),
	[],
	'plug-in release tag is not a four-part firmware build'
);

assert.deepEqual(
	scanEntry(base, {
		readme: 'Requires firmware 1.4.0.8 for Developer Mode.\nAlso see 1.5.0.1 elsewhere.',
		releases: []
	}).map((f) => f.build),
	['1.4.0.8'],
	'line with firmware 1.4.0.8 missing from entry gets flagged'
);

assert.deepEqual(
	scanEntry(
		{ ...base, record: { ...base.record, firmware: '1.3.0.12, 1.4.0.8 (v1+)' } },
		{ readme: 'Requires firmware 1.4.0.8.', releases: [] }
	),
	[],
	'build already listed is not flagged'
);

assert.deepEqual(
	scanEntry(base, {
		readme: 'MPC Sample app version 1.4.0.8 released today.',
		releases: []
	}),
	[],
	'a product name alone does not make an app version a firmware build'
);

assert.deepEqual(
	scanEntry(
		{ ...noFirmware, record: { ...noFirmware.record, firmware_ignore: ['1.4.0.8'] } },
		{ readme: 'Works on 1.4.0.8.', releases: [] }
	),
	[],
	'firmware_ignore works without a firmware field'
);

const releaseFlag = scanEntry(base, {
	readme: '',
	releases: [
		{
			tag: 'v2',
			published_at: '2026-02-01T00:00:00Z',
			html_url: 'https://github.com/owner/demo/releases/tag/v2',
			body: 'Works on firmware 1.4.0.8'
		},
		{
			tag: 'v1',
			published_at: '2026-01-01T00:00:00Z',
			html_url: 'https://github.com/owner/demo/releases/tag/v1',
			body: 'Mentions firmware 1.4.0.8 first'
		}
	]
});
assert.equal(releaseFlag.length, 1);
assert.equal(releaseFlag[0].build, '1.4.0.8');
assert.equal(releaseFlag[0].earliestRelease.tag, 'v1');
assert.match(releaseFlag[0].quote, /firmware 1\.4\.0\.8/);

const flags = scanFlags(
	[
		base,
		{ id: 'skip', section: 'guides', record: { website: 'https://example.com' } }
	],
	{
		demo: { readme: 'Needs firmware 1.4.0.8\n', releases: [] },
		skip: { readme: 'Another mod works on firmware 1.9.0.1', releases: [] }
	}
);
assert.deepEqual(flags.map((f) => f.id), ['demo']);

const body = formatIssueBody(flags, '2wenty2wo/samplemods');
assert.match(body, /Firmware builds mentioned upstream/);
assert.match(body, /- \[ \] `demo` \(apps\) — `1\.4\.0\.8`/);
assert.match(body, /> Needs firmware 1\.4\.0\.8/);
assert.match(body, /Confirm the maker states support/);
assert.match(body, /firmware_ignore/);
const incompatibility = scanEntry(base, { readme: 'Does not work on 1.4.0.8.' });
assert.match(formatIssueBody(incompatibility, '2wenty2wo/samplemods'), /Possible incompatibility/);
assert.equal(TITLE, 'Firmware mentions to review');

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
		if (url.includes('/labels/firmware-watch')) return reply({}, label ? 200 : 404);
		if (url.endsWith('/labels')) { label = true; return reply({}); }
		if (method === 'GET') return reply(issue?.state === 'open' ? [issue] : []);
		if (method === 'POST' && url.endsWith('/issues')) {
			issue = { number: 11, state: 'open', ...data, labels: data.labels.map((name) => ({ name })) };
		} else if (method === 'PATCH') {
			Object.assign(issue, data);
			if (data.labels) issue.labels = data.labels.map((name) => ({ name }));
		}
		return reply({});
	};

	await syncFirmwareIssue('issue-token', 'owner/catalog', flags, body);
	assert.equal(writes.length, 2, 'create one label and one issue');
	assert.equal(issue.title, TITLE);
	assert.equal(issue.labels[0].name, 'firmware-watch');

	await syncFirmwareIssue('issue-token', 'owner/catalog', flags, body);
	assert.equal(writes.length, 2, 'identical body must not create or update');

	await syncFirmwareIssue('issue-token', 'owner/catalog', flags, body + '\nUpdated');
	assert.equal(writes.at(-1)[0], 'PATCH');
	const updatedCount = writes.length;
	await syncFirmwareIssue('issue-token', 'owner/catalog', flags, body + '\nUpdated');
	assert.equal(writes.length, updatedCount);

	await syncFirmwareIssue('issue-token', 'owner/catalog', [], '');
	assert.equal(issue.state, 'closed');
	assert.match(writes.at(-2)[2].body, /No firmware mentions/);
	const count = writes.length;
	await syncFirmwareIssue('issue-token', 'owner/catalog', [], '');
	assert.equal(writes.length, count, 'no repeated comments when no open issue remains');
} finally {
	globalThis.fetch = originalFetch;
}

console.log('Firmware-watch checks passed: scan rules, ignore, skip, create/update/close.');
