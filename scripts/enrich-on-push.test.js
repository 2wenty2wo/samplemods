import assert from 'node:assert/strict';
import {
	collectEntryYamlChanges,
	extractRepoField,
	isEntryYamlPath,
	repoFieldChanged,
	shouldEnrichOnPush
} from './enrich-on-push.js';

assert.equal(isEntryYamlPath('data/plugins/mpc-vst-plaits/plugin.yaml'), true);
assert.equal(isEntryYamlPath('data/apps/dfos/app.yaml'), true);
assert.equal(isEntryYamlPath('data/github.json'), false);
assert.equal(isEntryYamlPath('data/readme/foo.md'), false);
assert.equal(isEntryYamlPath('data/plugins/foo/screenshots/bar.png'), false);

assert.equal(extractRepoField('name: X\nrepo: owner/name\n'), 'owner/name');
assert.equal(extractRepoField("repo: 'owner/name'\n"), 'owner/name');
assert.equal(extractRepoField('description: repo: not this\n'), '');
assert.equal(repoFieldChanged('repo: a/b\n', 'repo: a/c\n'), true);
assert.equal(repoFieldChanged('repo: a/b\n', 'repo: a/b\n'), false);
assert.equal(repoFieldChanged('', 'repo: a/b\n'), true);

assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/new/plugin.yaml', status: 'A' }]
	}),
	true,
	'added entry yaml triggers'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/x/plugin.yaml', status: 'M', repoChanged: true }]
	}),
	true,
	'repo: change triggers'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/x/plugin.yaml', status: 'M', repoChanged: false }]
	}),
	false,
	'ordinary yaml edit skips'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/x/plugin.yaml', status: 'D' }]
	}),
	false,
	'delete alone skips'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [
			{
				path: 'data/tools/y/tool.yaml',
				oldPath: 'data/tools/x/tool.yaml',
				status: 'R',
				repoChanged: false
			}
		]
	}),
	true,
	'renamed entry triggers'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/new/plugin.yaml', status: 'A' }],
		actor: 'github-actions[bot]',
		commitMessage: 'chore: refresh GitHub metadata'
	}),
	false,
	'enrich bot commit never re-triggers'
);
assert.equal(
	shouldEnrichOnPush({
		changes: [{ path: 'data/plugins/new/plugin.yaml', status: 'A' }],
		actor: 'github-actions[bot]',
		commitMessage: 'feat: add plaits'
	}),
	true,
	'bot actor with unrelated message still triggers on add'
);

const gitLog = [];
const fakeGit = (args) => {
	gitLog.push(args.join(' '));
	if (args[0] === 'diff') {
		return [
			'A\tdata/plugins/new/plugin.yaml',
			'M\tdata/apps/dfos/app.yaml',
			'M\tdata/github.json',
			'D\tdata/mods/gone/mod.yaml'
		].join('\n');
	}
	if (args[0] === 'show' && args[1].endsWith('data/apps/dfos/app.yaml')) {
		return args[1].startsWith('aaa:') ? 'repo: old/dfos\n' : 'repo: old/dfos\nname: DFOS\n';
	}
	if (args[0] === 'show' && args[1].includes('data/plugins/new/plugin.yaml')) {
		return 'repo: owner/new\n';
	}
	throw new Error(`unexpected git ${args.join(' ')}`);
};

const collected = collectEntryYamlChanges('aaa', 'bbb', { git: fakeGit });
assert.deepEqual(
	collected.map((c) => ({ path: c.path, status: c.status, repoChanged: Boolean(c.repoChanged) })),
	[
		{ path: 'data/plugins/new/plugin.yaml', status: 'A', repoChanged: false },
		{ path: 'data/apps/dfos/app.yaml', status: 'M', repoChanged: false },
		{ path: 'data/mods/gone/mod.yaml', status: 'D', repoChanged: false }
	]
);
assert.equal(shouldEnrichOnPush({ changes: collected }), true, 'collected add triggers');
assert.ok(gitLog[0].startsWith('diff --name-status'), 'uses name-status diff');

const repoOnlyGit = (args) => {
	if (args[0] === 'diff') return 'M\tdata/tools/x/tool.yaml\n';
	if (args[0] === 'show' && args[1].startsWith('aaa:')) return 'repo: a/old\n';
	if (args[0] === 'show' && args[1].startsWith('bbb:')) return 'repo: a/new\n';
	throw new Error(`unexpected git ${args.join(' ')}`);
};
assert.equal(
	shouldEnrichOnPush({ changes: collectEntryYamlChanges('aaa', 'bbb', { git: repoOnlyGit }) }),
	true,
	'collected repo change triggers'
);

console.log(
	'Enrich-on-push checks passed: path filter, add/repo/rename triggers, ordinary edit skip, bot metadata guard.'
);
