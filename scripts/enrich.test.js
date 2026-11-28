import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(root, '.enrich-test-'));
const output = path.join(fixture, 'data', 'github.json');
const readme = path.join(fixture, 'data', 'readme', 'a.md');
const contributorsFile = path.join(fixture, 'data', 'contributors.json');
const mock = `
import assert from 'node:assert/strict';
globalThis.fetch = async (url, { headers }) => {
  const repo = new URL(url).pathname.split('/')[3];
  assert.ok(['a', 'z', 'gone', 'samplemods'].includes(repo), 'only GitHub-backed entries or the catalog repo may trigger API requests');
  assert.equal(headers.Authorization, process.env.GITHUB_TOKEN ? 'Bearer test-token' : undefined);
  const reply = (data, status = 200, extra = {}) => ({ ok: status < 400, status, headers: new Headers(extra), json: async () => data });
  if (url.includes('/2wenty2wo/samplemods/contributors')) {
    return reply([
      { login: '2wenty2wo', type: 'User', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4', html_url: 'https://github.com/2wenty2wo', contributions: 4 },
      { login: 'dependabot[bot]', type: 'Bot', avatar_url: 'https://avatars.githubusercontent.com/u/2?v=4', html_url: 'https://github.com/apps/dependabot', contributions: 2 },
      { login: 'claude', type: 'User', avatar_url: 'https://avatars.githubusercontent.com/u/3?v=4', html_url: 'https://github.com/claude', contributions: 9 }
    ]);
  }
  if (process.env.FAIL_API && url.includes('/z/readme')) return reply({}, 503);
  if (process.env.FAIL_RELEASES_502 && url.includes('/a/releases?')) return reply({}, 502);
  if (process.env.RATE_LIMIT) return reply({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' });
  if (process.env.GONE_404 && new URL(url).pathname === '/repos/owner/gone') return reply({}, 404);
  const absent = url.includes('/z/');
  const release = { tag_name: 'v1', name: 'First release', prerelease: false, published_at: '2026-01-01T00:00:00Z', html_url: 'https://github.com/owner/a/releases/tag/v1', body: '**Changes**' + 'x'.repeat(13000) };
  if (url.endsWith('/releases/latest')) return reply(release, absent ? 404 : 200);
  if (url.includes('/releases?')) {
    if (url.includes('owner/a') && process.env.EXPECT_PREFIX) assert.match(url, /per_page=10/);
    if (url.includes('owner/z') || (url.includes('owner/a') && !process.env.EXPECT_PREFIX)) assert.match(url, /per_page=3/);
    return reply(absent ? [] : [release, { ...release, tag_name: 'v0.9', prerelease: true, body: null }]);
  }
  if (url.endsWith('/readme')) return reply({ encoding: 'base64', path: 'docs/README.md', content: Buffer.from('# A\\r\\nREADME').toString('base64') }, absent || process.env.NO_README ? 404 : 200);
  if (url.includes('/contributors?')) return reply(absent ? [] : [{ login: 'one' }], absent ? 204 : 200, absent ? {} : { link: '<https://api.github.com/repos/owner/a/contributors?anon=true&per_page=1&page=7>; rel="last"' });
  if (url.includes('/commits?')) return reply(absent ? {} : [{ commit: { committer: { date: '2026-01-02T00:00:00Z' } } }], absent ? 409 : 200);
  return reply({ stargazers_count: process.env.GONE_404 ? 99 : 7, forks_count: 2, pushed_at: '2026-01-01T00:00:00Z', open_issues_count: 3, default_branch: 'develop',
    license: url.endsWith('/z') ? null : { spdx_id: 'MIT' }, description: null, archived: false });
};`;
function run(extra = {}) {
	return spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(mock)}`,
		path.join(fixture, 'scripts', 'enrich.js')], {
		encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: 'test-token', FAIL_API: '', FAIL_RELEASES_502: '', RATE_LIMIT: '', NO_README: '', EXPECT_PREFIX: '', GONE_404: '', ...extra }
	});
}

try {
	fs.mkdirSync(path.join(fixture, 'scripts'));
	fs.mkdirSync(path.join(fixture, 'data', 'mods', 'a'), { recursive: true });
	fs.mkdirSync(path.join(fixture, 'data', 'mods', 'gone'), { recursive: true });
	fs.mkdirSync(path.join(fixture, 'data', 'apps', 'z'), { recursive: true });
	fs.mkdirSync(path.join(fixture, 'data', 'mods', 'external'), { recursive: true });
	for (const file of ['enrich.js', 'enrich-404-issue.js', 'check-star-list.js', 'catalog.js', 'catalog-contributors.js', 'compat.js']) {
		fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
	}
	fs.writeFileSync(path.join(fixture, 'data', 'apps', 'z', 'app.yaml'), 'repo: owner/z\n');
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'a', 'mod.yaml'), 'repo: owner/a\n');
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'gone', 'mod.yaml'), 'repo: owner/gone\n');
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'external', 'mod.yaml'), 'name: External\nwebsite: https://example.com\n');
	const first = run();
	assert.equal(first.status, 0, first.stderr);
	const original = fs.readFileSync(output, 'utf8');
	const data = JSON.parse(original);
	assert.deepEqual(Object.keys(data), ['owner/a', 'owner/gone', 'owner/z']);
	const goneReadme = path.join(fixture, 'data', 'readme', 'gone.md');
	assert.equal(fs.readFileSync(goneReadme, 'utf8'), '# A\nREADME');
	const goneSnapshot = data['owner/gone'];
	assert.ok(!fs.existsSync(path.join(fixture, 'data/readme/external.md')));
	assert.equal(data['owner/a'].contributors, 7);
	assert.equal(data['owner/a'].open_issues, 3);
	assert.equal(data['owner/a'].last_commit_at, '2026-01-02T00:00:00Z');
	assert.equal(data['owner/a'].readme_path, 'docs/README.md');
	assert.equal(data['owner/a'].default_branch, 'develop');
	assert.equal(data['owner/a'].releases.length, 2);
	assert.equal(data['owner/a'].releases[0].prerelease, false);
	assert.equal(data['owner/a'].releases[1].prerelease, true);
	assert.equal(data['owner/a'].releases[0].body.length, 12000);
	assert.equal(data['owner/a'].releases[0].truncated, true);
	assert.equal(data['owner/a'].releases[1].body, '');
	assert.deepEqual(data['owner/a'].latest_release, { tag: 'v1', published_at: '2026-01-01T00:00:00Z' });
	assert.equal(data['owner/a'].license, 'MIT');
	assert.equal(fs.readFileSync(readme, 'utf8'), '# A\nREADME');
	assert.equal(data['owner/z'].latest_release, null);
	assert.deepEqual(data['owner/z'].releases, []);
	assert.equal(data['owner/z'].last_commit_at, null);
	assert.equal(data['owner/z'].contributors, 0);
	assert.equal(data['owner/z'].license, null);
	assert.ok(!fs.existsSync(path.join(fixture, 'data/readme/z.md')));
	assert.deepEqual(JSON.parse(fs.readFileSync(contributorsFile, 'utf8')), {
		stars: 7,
		contributors: [
			{
				login: '2wenty2wo',
				avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
				html_url: 'https://github.com/2wenty2wo',
				contributions: 4
			}
		]
	});
	fs.utimesSync(output, 1000000, 1000000);
	fs.utimesSync(readme, 1000000, 1000000);
	fs.utimesSync(contributorsFile, 1000000, 1000000);
	const second = run({ GITHUB_TOKEN: '' });
	assert.equal(second.status, 0, second.stderr);
	assert.equal(fs.statSync(output).mtimeMs, 1000000000, 'unchanged metadata must not be rewritten');
	assert.equal(fs.statSync(readme).mtimeMs, 1000000000, 'unchanged README must not be rewritten');
	assert.equal(fs.statSync(contributorsFile).mtimeMs, 1000000000, 'unchanged contributors must not be rewritten');
	const failed = run({ FAIL_API: '1' });
	assert.equal(failed.status, 0, failed.stderr || failed.stdout);
	assert.match(`${failed.stdout}\n${failed.stderr}`, /::warning::GitHub owner\/z: HTTP 503, keeping previous snapshot/);
	const afterFail = JSON.parse(fs.readFileSync(output, 'utf8'));
	assert.deepEqual(afterFail['owner/z'], data['owner/z'], '5xx on a sub-request must keep that repo snapshot');
	assert.equal(afterFail['owner/a'].stars, 7, 'other repos must still update after a 5xx');
	assert.equal(fs.readFileSync(readme, 'utf8'), '# A\nREADME', '5xx retention must preserve other READMEs');
	const aSnapshot = afterFail['owner/a'];
	const report404 = path.join(fixture, 'enrich-404.json');
	const release502 = run({ FAIL_RELEASES_502: '1', ENRICH_404_PATH: report404 });
	assert.equal(release502.status, 0, release502.stderr || release502.stdout);
	assert.match(`${release502.stdout}\n${release502.stderr}`, /::warning::GitHub owner\/a: HTTP 502, keeping previous snapshot/);
	const after502 = JSON.parse(fs.readFileSync(output, 'utf8'));
	assert.deepEqual(after502['owner/a'], aSnapshot, '502 on releases must keep previous github.json entry');
	assert.equal(fs.readFileSync(readme, 'utf8'), '# A\nREADME', '502 on releases must keep README cache');
	assert.equal(after502['owner/z'].stars, 7, 'other repos must still update when one repo 502s');
	assert.equal(
		JSON.parse(fs.readFileSync(report404, 'utf8')).some((row) => row.repo === 'owner/a'),
		false,
		'5xx retention must not report the repo as a 404'
	);
	const limited = run({ RATE_LIMIT: '1' });
	assert.notEqual(limited.status, 0);
	assert.match(limited.stderr, /rate limited.*retry.*GITHUB_TOKEN/);
	const missing = run({ GONE_404: '1', ENRICH_404_PATH: report404 });
	assert.equal(missing.status, 0, missing.stderr || missing.stdout);
	assert.match(`${missing.stdout}\n${missing.stderr}`, /::warning::GitHub owner\/gone: 404, keeping previous snapshot/);
	const afterMissing = JSON.parse(fs.readFileSync(output, 'utf8'));
	assert.equal(afterMissing['owner/a'].stars, 99, 'other repos must still update when one repo 404s');
	assert.deepEqual(afterMissing['owner/gone'], goneSnapshot, '404 repo must keep previous github.json entry');
	assert.equal(fs.readFileSync(goneReadme, 'utf8'), '# A\nREADME', '404 repo README cache must survive');
	assert.deepEqual(JSON.parse(fs.readFileSync(report404, 'utf8')), [
		{ id: 'gone', section: 'mods', repo: 'owner/gone' }
	], '404 report lists active entries for the issue sync step');
	const removed = run({ NO_README: '1' });
	assert.equal(removed.status, 0, removed.stderr);
	assert.ok(!fs.existsSync(readme), 'removed upstream README must not remain stale');

	fs.mkdirSync(path.join(fixture, 'data', 'tools', 'a-boot'), { recursive: true });
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'a', 'mod.yaml'), 'repo: owner/a\nrelease_prefix: v\n');
	fs.writeFileSync(path.join(fixture, 'data', 'tools', 'a-boot', 'tool.yaml'), 'repo: owner/a\nrelease_prefix: boot-\n');
	fs.writeFileSync(path.join(fixture, 'data', 'tools', 'a-boot', 'about.md'), '# Boot about');
	const shared = run({ EXPECT_PREFIX: '1' });
	assert.equal(shared.status, 0, shared.stderr);
	assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(output, 'utf8'))), ['owner/a', 'owner/gone', 'owner/z'], 'shared repo fetched once');
	assert.equal(fs.readFileSync(readme, 'utf8'), '# A\nREADME');
	assert.ok(!fs.existsSync(path.join(fixture, 'data/readme/a-boot.md')), 'about.md entries skip README mirroring');
	console.log('Enrichment checks passed: README/release caches, stats, auth, no-op writes, rate limits, 5xx retention, failure preservation, shared-repo prefix fetch and about.md skip.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
