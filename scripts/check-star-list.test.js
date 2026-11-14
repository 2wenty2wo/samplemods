import assert from 'node:assert/strict';
import { readEntries } from './catalog.js';
import { compareRepositories, formatIssueBody, readStarList, syncIssue } from './check-star-list.js';

const liveEntries = readEntries();
assert.equal(new Set(liveEntries.map((entry) => entry.id)).size, liveEntries.length);
assert.deepEqual(compareRepositories(liveEntries.map(({ record }) => ({ nameWithOwner: record.repo })), liveEntries.map(({ record }) => record)), { missing: [], extra: [] });

const starred = [
	{ nameWithOwner: 'Owner/Present', description: 'Present', stargazerCount: 1 },
	{ nameWithOwner: 'Owner/New', description: 'New\n**tool**', stargazerCount: 12 }
];
const catalog = [{ repo: 'owner/present' }, { repo: 'Owner/Removed' }];
const result = compareRepositories(starred, catalog);
assert.deepEqual(result.missing, [starred[1]]);
assert.deepEqual(result.extra, [catalog[1]]);
assert.deepEqual(compareRepositories([], []), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([{ nameWithOwner: '2wenty2wo/SampleMods' }], []), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([{ nameWithOwner: 'Owner/Catalog' }], [], 'owner/catalog'), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([starred[0], starred[0]], [catalog[0]]), { missing: [], extra: [] });
const body = formatIssueBody(result, 'https://github.com/stars/owner/lists/mods');
assert.match(body, /- \[ \] \[Owner\/New\]\(https:\/\/github.com\/Owner\/New\): New \\\*\\\*tool\\\*\\\* · ★12/);
assert.match(body, /In catalog but not in star list/);
assert.match(body, /Owner\/Removed/);

const originalFetch = globalThis.fetch;
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
try {
	let queries = 0;
	const firstPage = Array.from({ length: 100 }, (_, i) => ({ nameWithOwner: `owner/repo-${i}` }));
	globalThis.fetch = async (url, options) => {
		assert.equal(options.headers.Authorization, 'Bearer list-token');
		const { variables } = JSON.parse(options.body);
		queries++;
		const second = Boolean(variables.after);
		const pageInfo = { hasNextPage: !second, endCursor: second ? null : 'next' };
		if (variables.user) return reply({ data: { user: { lists: {
				nodes: second ? [{ id: 'list-id', slug: 'mods' }] : Array.from({ length: 100 }, (_, i) => ({ id: `other-${i}`, slug: `other-${i}` })), pageInfo
		} } } });
		assert.equal(variables.id, 'list-id');
		return reply({ data: { node: { items: { nodes: second ? [starred[1]] : firstPage, pageInfo } } } });
	};
	assert.deepEqual(await readStarList('list-token', 'owner', 'mods'), [...firstPage, starred[1]]);
	assert.equal(queries, 4, 'both lists and items must paginate');
	globalThis.fetch = async () => reply({ errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by integration' }] });
	await assert.rejects(readStarList('bad', 'owner', 'mods'), /STAR_LIST_TOKEN.*classic.*fine-grained/);

	const writes = [];
	let issue = null;
	let label = false;
	globalThis.fetch = async (url, options) => {
		assert.equal(options.headers.Authorization, 'Bearer issue-token');
		const method = options.method;
		const data = options.body && JSON.parse(options.body);
		if (method !== 'GET') writes.push([method, url, data]);
		if (url.includes('/labels/star-list')) return reply({}, label ? 200 : 404);
		if (url.endsWith('/labels')) { label = true; return reply({}); }
		if (method === 'GET') return reply(issue?.state === 'open' ? [issue] : []);
		if (method === 'POST' && url.endsWith('/issues')) {
			issue = { number: 7, state: 'open', ...data, labels: data.labels.map((name) => ({ name })) };
		} else if (method === 'PATCH') {
			Object.assign(issue, data);
			if (data.labels) issue.labels = data.labels.map((name) => ({ name }));
		}
		return reply({});
	};
	await syncIssue('issue-token', 'owner/catalog', result, body);
	assert.equal(writes.length, 2, 'create one label and one issue');
	await syncIssue('issue-token', 'owner/catalog', result, body);
	assert.equal(writes.length, 2, 'identical results must not create or update issues');
	await syncIssue('issue-token', 'owner/catalog', result, body + '\nUpdated');
	assert.equal(writes.at(-1)[0], 'PATCH');
	const updatedCount = writes.length;
	await syncIssue('issue-token', 'owner/catalog', result, body + '\nUpdated');
	assert.equal(writes.length, updatedCount);
	await syncIssue('issue-token', 'owner/catalog', { missing: [], extra: [] }, '');
	assert.equal(issue.state, 'closed');
	assert.equal(writes.at(-2)[2].body, 'All starred repos are in the catalog.');
	const count = writes.length;
	await syncIssue('issue-token', 'owner/catalog', { missing: [], extra: [] }, '');
	assert.equal(writes.length, count, 'no repeated comments when no open issue remains');
} finally {
	globalThis.fetch = originalFetch;
}
console.log('Star-list checks passed: comparison, pagination, auth guidance, issue create/update/close.');
