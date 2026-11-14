import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(root, '.enrich-test-'));
const output = path.join(fixture, 'data', 'github.json');
const mock = `
import assert from 'node:assert/strict';
globalThis.fetch = async (url, { headers }) => {
  assert.equal(headers.Authorization, process.env.GITHUB_TOKEN ? 'Bearer test-token' : undefined);
  const release = url.endsWith('/releases/latest');
  if (process.env.FAIL_API) return { ok: false, status: 503 };
  if (release && url.includes('/z/')) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => release
    ? { tag_name: 'v1', published_at: '2026-01-01T00:00:00Z' }
    : { stargazers_count: 7, forks_count: 2, pushed_at: '2026-01-01T00:00:00Z',
        license: url.endsWith('/z') ? null : { spdx_id: 'MIT' }, description: null, archived: false } };
};`;
function run(extra = {}) {
	return spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(mock)}`,
		path.join(fixture, 'scripts', 'enrich.js')], {
		encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: 'test-token', FAIL_API: '', ...extra }
	});
}

try {
	fs.mkdirSync(path.join(fixture, 'scripts'));
	fs.mkdirSync(path.join(fixture, 'data', 'mods'), { recursive: true });
	fs.copyFileSync(path.join(root, 'scripts', 'enrich.js'), path.join(fixture, 'scripts', 'enrich.js'));
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'z.yaml'), 'repo: owner/z\n');
	fs.writeFileSync(path.join(fixture, 'data', 'mods', 'a.yaml'), 'repo: owner/a\n');
	const first = run();
	assert.equal(first.status, 0, first.stderr);
	const original = fs.readFileSync(output, 'utf8');
	const data = JSON.parse(original);
	assert.deepEqual(Object.keys(data), ['owner/a', 'owner/z']);
	assert.deepEqual(data['owner/a'], { stars: 7, forks: 2, pushed_at: '2026-01-01T00:00:00Z',
		license: 'MIT', description: null,
		latest_release: { tag: 'v1', published_at: '2026-01-01T00:00:00Z' }, archived: false });
	assert.equal(data['owner/z'].latest_release, null);
	assert.equal(data['owner/z'].license, null);
	fs.utimesSync(output, 1000000, 1000000);
	const mtime = fs.statSync(output).mtimeMs;
	const second = run({ GITHUB_TOKEN: '' });
	assert.equal(second.status, 0, second.stderr);
	assert.equal(fs.statSync(output).mtimeMs, mtime, 'unchanged data must not be rewritten');
	const failed = run({ FAIL_API: '1' });
	assert.notEqual(failed.status, 0);
	assert.match(failed.stderr, /HTTP 503/);
	assert.equal(fs.readFileSync(output, 'utf8'), original, 'API failures must preserve the cache');
	console.log('Enrichment checks passed: metadata, releases, auth, stable output, failure preservation.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
