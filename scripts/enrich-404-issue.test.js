import assert from 'node:assert/strict';
import {
	TITLE,
	open404Entries,
	format404IssueBody,
	sync404Issue
} from './enrich-404-issue.js';

const entries = [
	{ id: 'gone-mod', section: 'mods', record: { repo: 'owner/gone', status: 'beta' } },
	{ id: 'boot-thingy', section: 'tools', record: { repo: 'owner/boot', status: 'removed' } },
	{ id: 'alive', section: 'apps', record: { repo: 'owner/alive' } },
	{ id: 'shared-active', section: 'mods', record: { repo: 'owner/shared', status: 'stable' } },
	{ id: 'shared-removed', section: 'tools', record: { repo: 'owner/shared', status: 'removed' } }
];

assert.deepEqual(
	open404Entries(entries, new Set(['owner/gone', 'owner/boot', 'owner/shared'])),
	[
		{ id: 'gone-mod', section: 'mods', repo: 'owner/gone' },
		{ id: 'shared-active', section: 'mods', repo: 'owner/shared' }
	],
	'404 list must drop status:removed and keep active entries (including shared repos)'
);
assert.deepEqual(open404Entries(entries, new Set()), [], 'no retained 404s → empty list');

const body = format404IssueBody(
	[{ id: 'gone-mod', section: 'mods', repo: 'owner/gone' }],
	'2wenty2wo/samplemods'
);
assert.match(body, /Entry repositories that returned HTTP 404/);
assert.match(body, /- \[ \] `gone-mod` \(mods\)/);
assert.match(body, /\[owner\/gone\]\(https:\/\/github\.com\/owner\/gone\)/);
assert.match(body, /\[entry YAML\]\(https:\/\/github\.com\/2wenty2wo\/samplemods\/blob\/main\/data\/mods\/gone-mod\/mod\.yaml\)/);
assert.match(body, /If the repo is gone for good, set `status: removed`/);
assert.match(body, /if it was renamed, update `repo`/);
assert.equal(TITLE, 'Metadata sync: repos returning 404');

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
		if (url.includes('/labels/enrich-404')) return reply({}, label ? 200 : 404);
		if (url.endsWith('/labels')) { label = true; return reply({}); }
		if (method === 'GET') return reply(issue?.state === 'open' ? [issue] : []);
		if (method === 'POST' && url.endsWith('/issues')) {
			issue = { number: 42, state: 'open', ...data, labels: data.labels.map((name) => ({ name })) };
		} else if (method === 'PATCH') {
			Object.assign(issue, data);
			if (data.labels) issue.labels = data.labels.map((name) => ({ name }));
		}
		return reply({});
	};

	const rows = [{ id: 'gone-mod', section: 'mods', repo: 'owner/gone' }];
	await sync404Issue('issue-token', 'owner/catalog', rows, body);
	assert.equal(writes.length, 2, 'create one label and one issue');
	assert.equal(issue.title, TITLE);
	assert.equal(issue.labels[0].name, 'enrich-404');

	await sync404Issue('issue-token', 'owner/catalog', rows, body);
	assert.equal(writes.length, 2, 'identical body must not create or update issues');

	await sync404Issue('issue-token', 'owner/catalog', rows, body + '\nUpdated');
	assert.equal(writes.at(-1)[0], 'PATCH');
	const updatedCount = writes.length;
	await sync404Issue('issue-token', 'owner/catalog', rows, body + '\nUpdated');
	assert.equal(writes.length, updatedCount);

	await sync404Issue('issue-token', 'owner/catalog', [], '');
	assert.equal(issue.state, 'closed');
	assert.match(writes.at(-2)[2].body, /No retained 404/);
	const count = writes.length;
	await sync404Issue('issue-token', 'owner/catalog', [], '');
	assert.equal(writes.length, count, 'no repeated comments when no open issue remains');
} finally {
	globalThis.fetch = originalFetch;
}

console.log('Enrich 404 issue checks passed: filter removed, format body, create/update/close without duplicates.');
