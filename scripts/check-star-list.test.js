import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import { readEntries } from './catalog.js';
import { compareRepositories, formatIssueBody, readStarList, syncIssue, repoId, guessSection, guessName, guessFields, draftEntry, formatPullRequestBody, syncPullRequest, validateDraft } from './check-star-list.js';

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
assert.deepEqual(compareRepositories(starred, [...catalog, { name: 'External', website: 'https://example.com' }]), result);
assert.deepEqual(compareRepositories([], [{ website: 'https://example.com' }]), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([], []), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([{ nameWithOwner: '2wenty2wo/SampleMods' }], []), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([{ nameWithOwner: 'Owner/Catalog' }], [], 'owner/catalog'), { missing: [], extra: [] });
assert.deepEqual(compareRepositories([starred[0], starred[0]], [catalog[0]]), { missing: [], extra: [] });
const body = formatIssueBody(result, 'https://github.com/stars/owner/lists/mods');
assert.match(body, /- \[ \] \[Owner\/New\]\(https:\/\/github.com\/Owner\/New\): New \\\*\\\*tool\\\*\\\* · ★12/);
assert.match(body, /In catalog but not in star list/);
assert.match(body, /Owner\/Removed/);
assert.match(formatIssueBody(result, 'https://example.com/list', { 'owner/new': 'https://github.com/owner/catalog/pull/1' }), /Review PR.*\/pull\/1/);

assert.equal(repoId('Owner/MPC_Example.Toolkit'), 'mpc-example-toolkit');
assert.equal(repoId('Café__Test!!'), 'cafe-test');
assert.equal(repoId('___'), '');
for (const [text, section] of [['DOOM emulator', 'games'], ['a handbook', 'guides'], ['Rust SDK', 'dev'], ['Windows desktop companion', 'tools'], ['own interface groovebox', 'apps'], ['firmware enhancement', 'mods'], ['CLAP plug-in for Melodee', 'plugins']]) {
	assert.equal(guessSection(text).section, section);
}
assert.equal(guessSection('small project', ['toolkit']).section, 'dev');
assert.equal(guessSection('small project', [], 'User manual').section, 'guides');
assert.equal(guessSection('desktop tool', [], 'Includes game documentation').section, 'tools', 'metadata beats incidental README keywords');
const metadata = { full_name: 'Owner/space-game', description: 'a rhythm game\nfor the MPC Sample!', homepage: 'https://example.com', topics: [] };
const draft = draftEntry(metadata, 'Runs from an SD card.');
assert.equal(draft.section, 'games');
assert.equal(draft.branch, 'auto/add-space-game');
assert.equal(draft.path, 'data/games/space-game/game.yaml');
assert.deepEqual(yaml.load(draft.yaml), { name: 'Space Game', description: 'A rhythm game for the MPC Sample.', repo: 'Owner/space-game', author: 'Owner', website: 'https://example.com', runs_on: ['device'], install: 'sd-card', audience: ['player', 'musician'] });
assert.equal(draftEntry(metadata, '', new Set(['space-game'])), null, 'IDs collide across all sections');
const fallback = draftEntry({ full_name: 'owner/unknown', description: null });
assert.equal(yaml.load(fallback.yaml).description, 'TODO: describe');
assert.ok(!Object.hasOwn(yaml.load(fallback.yaml), 'install'));
const pullBody = formatPullRequestBody(draft, 'https://example.com/list', { passed: false, output: 'schema <bad> & invalid' });
assert.match(pullBody, /\*\*GUESS\*\*/);
assert.match(pullBody, /description\/topics: game/);
assert.match(pullBody, /- \[ \] Section correct/);
assert.match(pullBody, /screenshots\/01-\*\.png/);
assert.match(pullBody, /failed; this PR is a draft/);
assert.match(pullBody, /schema &lt;bad&gt; &amp; invalid/);
for (const field of ['section', 'name', 'description', 'install', 'runs_on', 'audience', 'tags']) assert.ok(pullBody.includes(`**${field}**:`), field);
for (const item of ['Name correct', 'Install & runs on correct', 'Audience correct']) assert.ok(pullBody.includes(`- [ ] ${item}`), item);

const toolkit = draftEntry({ full_name: 'tarikcampos/MPC-Sample-Toolkit',
	description: 'An open-source toolkit for editing, generating and managing Akai MPC Sample (.xpj) projects.',
	topics: ['akai', 'akai-mpc', 'audio', 'midi', 'mpc', 'mpc-sample', 'music-production', 'opensource', 'python', 'reverse-engineering', 'sample-editor', 'sampler']
}, '# MPC Sample Toolkit (MPCTK)\nPySide6 desktop application for macOS.');
assert.equal(toolkit.section, 'tools');
assert.deepEqual(toolkit.record.runs_on, ['desktop']);
assert.equal(toolkit.record.install, 'desktop');
assert.deepEqual(toolkit.record.audience, ['musician']);
assert.deepEqual(toolkit.record.tags, ['midi', 'python', 'reverse-engineering', 'sample-editor']);
assert.match(toolkit.evidence.runs_on, /pyside6/);

const kitMaker = draftEntry({ full_name: 'WorldLinkStudio/mpcsample', homepage: 'https://mpcsample.app',
	description: 'MPC Sample Kit Maker — web and desktop Akai MPC sample pad player.',
	topics: ['akai', 'drum-kit', 'drum-machine', 'drums', 'electron', 'mpc', 'mpc-sample', 'react', 'vite', 'web-audio']
}, '# MPC Sample\nElectron React Vite. Direct SD card workflow support.');
assert.equal(kitMaker.record.name, 'MPC Sample Kit Maker');
assert.equal(kitMaker.section, 'tools');
assert.deepEqual(kitMaker.record.runs_on, ['browser', 'desktop']);
assert.equal(kitMaker.record.install, 'desktop');
assert.deepEqual(kitMaker.record.audience, ['musician']);
assert.match(kitMaker.evidence.name, /description/);

const gridzilla = draftEntry({ full_name: 'ZootedandRebooted/GRIDZILLA',
	description: 'GRIDZILLA 1.2 for MPC Sample — installation package, user guide and video.', topics: []
}, 'Runs from an SD card. Copy autorun.');
assert.equal(gridzilla.section, 'mods', 'a bundled user guide does not make a device mod a guide');
assert.equal(gridzilla.record.install, 'sd-card');
assert.deepEqual(gridzilla.record.runs_on, ['device']);

assert.equal(guessSection('A Rust SDK library', [], 'Build using Windows and Qt').section, 'dev');
assert.equal(guessName({ full_name: 'owner/slug' }, '# **Friendly Name**').name, 'Friendly Name');
assert.equal(guessName({ full_name: 'owner/slug', description: 'Beat Lab: MIDI controls' }, '# Different').name, 'Beat Lab');
assert.equal(guessName({ full_name: 'owner/slug', description: 'Beat Lab - MIDI controls' }).name, 'Beat Lab');
assert.equal(guessName({ full_name: 'owner/slug', description: 'A tool for MIDI: controls' }, '# Better Name').name, 'Better Name');
assert.ok(!guessFields({ topics: ['react', 'vite'] }, '', 'tools').fields.runs_on, 'browser build dependencies need a live homepage');
const browser = guessFields({ homepage: 'https://example.com', description: 'Browser web MIDI app', topics: ['akai', 'akai-mpc', 'music', 'open-source', 'midi', 'midi'] }, '', 'tools');
assert.deepEqual(browser.fields.runs_on, ['browser']);
assert.equal(browser.fields.install, 'none');
assert.deepEqual(browser.fields.tags, ['midi']);
assert.equal(guessFields({}, 'Requires Boot Thingy', 'apps').fields.install, 'boot-thingy');
assert.equal(guessFields({}, 'SD card autorun with a web installer', 'mods').fields.install, 'web-installer');
const handbook = draftEntry({ full_name: 'owner/handbook', description: 'A handbook for the MPC Sample' }, 'SD card autorun documentation for Windows.');
assert.equal(handbook.section, 'guides');
assert.deepEqual(handbook.record.runs_on, ['docs']);
assert.equal(handbook.record.install, 'none');
assert.deepEqual(handbook.record.audience, ['curious']);

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

try {
	let branch = false;
	let content = null;
	let pull = null;
	let validationCount = 0;
	let passed = true;
	let forbidden = false;
	const mutations = [];
	const ghCalls = [];
	let lastBodyFile;
	globalThis.fetch = async (url, options) => {
		assert.equal(options.headers.Authorization, 'Bearer write-token');
		const data = options.body && JSON.parse(options.body);
		if (options.method !== 'GET') mutations.push([url, data]);
		if (url.endsWith('/git/ref/heads/main')) return reply({ object: { sha: 'main-sha' } });
		if (url.includes('/git/ref/heads/auto/')) return reply({}, branch ? 200 : 404);
		if (url.includes('/contents/')) {
			if (options.method === 'GET') return reply(content ? { content: Buffer.from(content).toString('base64') } : {}, content ? 200 : 404);
			assert.equal(data.branch, 'auto/add-space-game');
			content = Buffer.from(data.content, 'base64').toString('utf8');
			return reply({});
		}
		if (url.endsWith('/git/refs')) {
			assert.equal(data.ref, 'refs/heads/auto/add-space-game');
			assert.equal(data.sha, 'main-sha');
			branch = true;
			return reply({});
		}
		if (url.endsWith('/labels/star-list')) return reply({});
		throw new Error(`Unexpected API call: ${url}`);
	};
	const hooks = {
		validate: (candidate) => {
			validationCount++;
			assert.equal(candidate.yaml, content ?? draft.yaml);
			return { passed, output: passed ? 'All tests passed.' : 'schema <bad> & invalid' };
		},
		gh: (args, token) => {
			assert.equal(token, 'write-token');
			ghCalls.push(args);
			if (args[1] === 'list') return JSON.stringify(pull ? [{ url: pull }] : []);
			assert.equal(args[1], 'create');
			assert.equal(args[args.indexOf('--base') + 1], 'main');
			assert.equal(args[args.indexOf('--head') + 1], 'auto/add-space-game');
			assert.equal(args[args.indexOf('--label') + 1], 'star-list');
			assert.equal(args.includes('--draft'), !passed);
			lastBodyFile = args[args.indexOf('--body-file') + 1];
			const text = fs.readFileSync(lastBodyFile, 'utf8');
			assert.match(text, /\*\*GUESS\*\*/);
			if (!passed) assert.match(text, /schema &lt;bad&gt; &amp; invalid/);
			if (forbidden) throw Object.assign(new Error('HTTP 403'), { stderr: 'GitHub Actions is not permitted to create pull requests.' });
			pull = 'https://github.com/owner/catalog/pull/9';
			return pull + '\n';
		}
	};
	assert.equal(await syncPullRequest('write-token', 'owner/catalog', draft, 'https://example.com/list', hooks), 'https://github.com/owner/catalog/pull/9');
	assert.equal(mutations.length, 2, 'one branch and one YAML commit');
	assert.equal(validationCount, 1);
	assert.ok(!fs.existsSync(lastBodyFile), 'temporary PR body must be removed');
	await syncPullRequest('write-token', 'owner/catalog', draft, 'https://example.com/list', hooks);
	assert.equal(ghCalls.filter((args) => args[1] === 'create').length, 1, 'open PR must not be duplicated');
	assert.equal(validationCount, 1, 'existing PR must not rerun validation or overwrite reviewed content');
	assert.equal(mutations.length, 2);
	pull = null;
	passed = false;
	content += '# Reviewer edits retained\n';
	await syncPullRequest('write-token', 'owner/catalog', draft, 'https://example.com/list', hooks);
	assert.equal(mutations.length, 2, 'retry must reuse the branch/file without overwriting it');
	pull = null;
	forbidden = true;
	await assert.rejects(syncPullRequest('write-token', 'owner/catalog', draft, 'https://example.com/list', hooks), /Allow GitHub Actions.*Settings > Actions > General > Workflow permissions/);
	assert.ok(!fs.existsSync(lastBodyFile), '403 must still remove the PR body file');
	await assert.rejects(syncPullRequest('write-token', 'owner/catalog', { ...draft, branch: 'main' }, 'https://example.com/list', hooks), /Refusing to write outside/);
} finally {
	globalThis.fetch = originalFetch;
}

const tempRoot = fs.realpathSync(os.tmpdir());
const validationWorkspace = fs.mkdtempSync(path.join(tempRoot, 'mpc-star-list-test-'));
try {
	fs.writeFileSync(path.join(validationWorkspace, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
	assert.equal(validateDraft(draft, validationWorkspace).passed, true);
	assert.ok(!fs.existsSync(path.join(validationWorkspace, draft.path)), 'successful validation must restore the catalog');
	fs.writeFileSync(path.join(validationWorkspace, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "console.error(123);process.exit(1)"' } }));
	const failure = validateDraft(draft, validationWorkspace);
	assert.equal(failure.passed, false);
	assert.match(failure.output, /123/);
	assert.ok(!fs.existsSync(path.join(validationWorkspace, draft.path)), 'failed validation must restore the catalog');
} finally {
	assert.equal(path.dirname(fs.realpathSync(validationWorkspace)), tempRoot);
	fs.rmSync(validationWorkspace, { recursive: true, force: true });
}
console.log('Star-list checks passed: comparison, draft generation, PR idempotency, failed validation, permissions and cleanup.');
