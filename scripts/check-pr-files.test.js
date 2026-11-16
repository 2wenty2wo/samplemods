import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { protectedFiles } from './check-pr-files.js';

const blocked = ['data/github.json', 'data/contributors.json', 'data/watch.json', 'data/readme/project.md',
	'data/readme/nested/file.md', 'src/lib/data.json', 'src/lib/server/details.json',
	'static/catalog.json', 'static/media/project/screenshots/01-screen.png'];
const allowed = ['data/mods/project/mod.yaml', 'data/mods/project/about.md',
	'data/mods/project/screenshots/01-screen.png', 'data/media-sources.json',
	'data/github.json.bak', 'data/readme-notes.md', 'static/media-notes.md', 'CONTRIBUTING.md'];
assert.deepEqual(protectedFiles([...allowed, ...blocked]), blocked);
assert.deepEqual(protectedFiles([]), []);

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'samplemods-pr-check-'));
const script = fileURLToPath(new URL('./check-pr-files.js', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: fixture, encoding: 'utf8' }).trim();
const commit = () => {
	git('add', '.');
	git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'Fixture');
};
const run = () => spawnSync(process.execPath, [script], { cwd: fixture, encoding: 'utf8' });
try {
	git('init', '-q');
	fs.mkdirSync(path.join(fixture, 'data/readme'), { recursive: true });
	fs.writeFileSync(path.join(fixture, 'data/github.json'), '{}');
	fs.writeFileSync(path.join(fixture, 'data/readme/project.md'), '# Project');
	commit();
	const base = git('rev-parse', 'HEAD');
	git('update-ref', 'refs/remotes/origin/main', base);
	fs.writeFileSync(path.join(fixture, 'CONTRIBUTING.md'), 'Contribution');
	commit();
	const head = git('rev-parse', 'HEAD');
	// Main's refresh after the branch diverges must not count as a PR edit.
	git('checkout', '-q', '--detach', base);
	fs.writeFileSync(path.join(fixture, 'data/github.json'), '{"refresh":true}');
	commit();
	git('update-ref', 'refs/remotes/origin/main', 'HEAD');
	git('checkout', '-q', '--detach', head);
	assert.equal(run().status, 0, 'unrelated main refresh must not fail the guard');
	fs.unlinkSync(path.join(fixture, 'data/github.json'));
	fs.renameSync(path.join(fixture, 'data/readme/project.md'), path.join(fixture, 'moved.md'));
	commit();
	const result = run();
	assert.equal(result.status, 1);
	assert.match(result.stderr, /These files are updated automatically every 6 hours by the refresh job\. Please remove them from this PR:/);
	assert.match(result.stderr, /- data\/github\.json/);
	assert.match(result.stderr, /- data\/readme\/project\.md/);
	assert.match(result.stderr, /Tip: `git checkout origin\/main -- <file>`\./);
	console.log('PR file checks passed: protected paths, allowed sources, merge base, deletions and renames.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
