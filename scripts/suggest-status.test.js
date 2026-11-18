import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { suggestStatus, statusSuggestions, setStatus, formatStatusBody, syncStatusSuggestions } from './suggest-status.js';

const kaos = { name: 'KAOSAMPLE', repo: 'omarhuertasllc-ops/kaosample-beta', author: 'omarhuertasllc-ops' };
const maia = { name: 'MaiaOS', repo: 'rosen-wav/MaiaOS---Mpc-Sample-CFW', author: 'rosen-wav' };
assert.equal(suggestStatus(kaos, {}, '# KAOSAMPLE — public beta').status, 'beta');
assert.equal(suggestStatus(maia, {}, '# MaiaOS\n\nThe first beta is out now in releases').status, 'beta');
assert.equal(suggestStatus({ ...kaos, repo: 'owner/kaos' }, {}, '# KAOSAMPLE — public beta').status, 'beta');
for (const status of ['stable', 'beta', 'experimental', 'concept', 'archived']) {
 assert.equal(suggestStatus({ ...kaos, status }, {}, '# Public beta'), null);
 assert.equal(suggestStatus({ ...kaos, status }, { archived: true })?.status ?? null, status === 'archived' ? null : 'archived');
}
const normal = { name: 'Normal', repo: 'owner/normal', author: 'owner' };
for (const releases of [[], [{ prerelease: false }], [{}], [{ prerelease: true }, {}], [{ prerelease: true }, { prerelease: false }]]) {
 assert.equal(suggestStatus(normal, { releases }), null, 'unknown, empty and mixed releases must not imply beta');
}
assert.equal(suggestStatus(normal, { releases: [{ prerelease: true, html_url: 'https://github.com/owner/normal/releases/tag/v1' }] }).status, 'beta');
assert.equal(suggestStatus(normal, {}, '# Normal\nNo longer beta.'), null);
assert.equal(suggestStatus(normal, {}, '# Normal\nNot a beta release.'), null);
assert.equal(suggestStatus(normal, {}, '# Normal\nFirmware beta builds have not been verified.'), null);
assert.equal(suggestStatus(normal, {}, '# Normal\n```\nbeta\n```'), null);
assert.equal(suggestStatus(normal, {}, '# Normal\n' + '\n'.repeat(40) + 'Public beta'), null);
assert.equal(suggestStatus(normal, {}, '\n'.repeat(41) + '# Normal beta').status, 'beta', 'first heading is also checked');
assert.equal(suggestStatus(normal, {}, '# Normal\n[Docs](https://example.com/beta)'), null);
assert.equal(suggestStatus({ name: 'External' }, { archived: true }), null);

const entry = { id: 'kaosample', section: 'mods', record: kaos };
const [candidate] = statusSuggestions([entry], {}, {});
assert.equal(candidate.path, 'data/mods/kaosample/mod.yaml');
assert.deepEqual(statusSuggestions([{ ...entry, record: { ...kaos, status: 'beta' } },
 { id: 'maiaos', section: 'mods', record: { ...maia, status: 'beta' } }], {}, { maiaos: 'The first beta is out now in releases' }), []);
const text = 'name: KAOSAMPLE\r\nauthor: owner # retain\r\ntags:\r\n  - sound\r\n';
assert.equal(setStatus(text, 'beta'), 'name: KAOSAMPLE\r\nauthor: owner # retain\r\nstatus: beta\r\ntags:\r\n  - sound\r\n');
assert.equal(setStatus('author: owner\nstatus: stable # keep\n', 'archived'), 'author: owner\nstatus: archived # keep\n');
assert.equal(setStatus('author: owner\r\nstatus: stable # keep\r\n', 'archived'), 'author: owner\r\nstatus: archived # keep\r\n');
assert.throws(() => setStatus('name: No author\n', 'beta'), /author/);
assert.throws(() => setStatus('author: owner\n', 'stable'), /status/);
const body = formatStatusBody([candidate]);
assert.match(body, /\| Entry \| Suggested status \| Evidence \|/);
assert.match(body, /https:\/\/github.com\/omarhuertasllc-ops\/kaosample-beta/);
assert.match(body, /<!-- status-suggestions: \[{"id":"kaosample","status":"beta"}\] -->/);
assert.match(body, /hidden.*comment.*remove/i);

// Exercise the real synchronizer; only external GitHub/gh I/O is replaced.
let open = null;
let closed = [];
let branch = false;
let remote = 'name: KAOSAMPLE\nrepo: omarhuertasllc-ops/kaosample-beta\nauthor: owner\ndescription: Changed on main\n';
let expectedContent = 'name: KAOSAMPLE\nrepo: omarhuertasllc-ops/kaosample-beta\nauthor: owner\nstatus: beta\ndescription: Changed on main\n';
const calls = [];
let historyPage = false;
const api = async (endpoint, token, method = 'GET', data) => {
 assert.equal(token, 'test-token');
 calls.push({ endpoint, method, data });
 if (endpoint.includes('/pulls?')) {
  if (historyPage && endpoint.endsWith('page=1')) return Array.from({ length: 100 }, () => ({ head: { ref: 'other' }, body: '', merged_at: null }));
  return closed;
 }
 if (endpoint.endsWith('/git/ref/heads/main')) return { object: { sha: 'current-main' } };
 if (endpoint.endsWith('/git/commits/current-main')) return { tree: { sha: 'main-tree' } };
 if (endpoint.includes('/contents/')) {
  assert.ok(endpoint.endsWith('?ref=current-main'), 'read exact current main, not the checkout or branch');
  return { encoding: 'base64', content: Buffer.from(remote).toString('base64') };
 }
 if (endpoint.endsWith('/git/ref/heads/auto/status-suggestions')) {
  if (!branch) throw Object.assign(new Error('Not found'), { status: 404 });
  return { object: { sha: 'old-branch' } };
 }
 if (endpoint.endsWith('/git/trees')) {
  assert.equal(data.base_tree, 'main-tree');
  assert.equal(data.tree.length, 1);
  assert.equal(data.tree[0].path, 'data/mods/kaosample/mod.yaml');
  assert.equal(data.tree[0].content, expectedContent);
  return { sha: 'suggestion-tree' };
 }
 if (endpoint.endsWith('/git/commits')) {
  assert.deepEqual(data.parents, ['current-main']);
  assert.equal(data.tree, 'suggestion-tree');
  return { sha: 'suggestion-commit' };
 }
 if (endpoint.endsWith('/git/refs')) {
  assert.equal(data.ref, 'refs/heads/auto/status-suggestions');
  branch = true;
  return {};
 }
 if (endpoint.endsWith('/git/refs/heads/auto/status-suggestions')) {
  assert.equal(data.force, true);
  return {};
 }
 throw new Error(`Unexpected API request: ${method} ${endpoint}`);
};
let lastBody;
let automaticallyClosed;
const gh = (args, token) => {
 assert.equal(token, 'test-token');
 calls.push({ gh: args });
 if (args[1] === 'list') return JSON.stringify(open ? [open] : []);
 if (args.includes('--body-file')) {
  const bodyFile = args[args.indexOf('--body-file') + 1];
  lastBody = bodyFile;
  const text = fs.readFileSync(bodyFile, 'utf8');
  if (args[1] === 'create') open = { number: 4, url: 'https://github.com/owner/catalog/pull/4', body: text };
  else open.body = text;
 }
 if (args[1] === 'close') { automaticallyClosed = open.body; open = null; }
 return open?.url ?? '';
};
const sync = suggestions => syncStatusSuggestions('test-token', 'owner/catalog', suggestions, { api, gh });
await sync([candidate]);
assert.ok(open);
assert.ok(!fs.existsSync(lastBody), 'temporary PR bodies are removed');
assert.ok(calls.some(c => c.data?.tree), 'create status-only tree');
assert.ok(!calls.some(c => c.method !== 'GET' && /\/heads\/main$/.test(c.endpoint ?? '')), 'never update main');
let writes = calls.filter(c => c.method && c.method !== 'GET' || c.gh && c.gh[1] !== 'list').length;
await sync([candidate]);
assert.equal(calls.filter(c => c.method && c.method !== 'GET' || c.gh && c.gh[1] !== 'list').length, writes, 'same pairs cause no writes');
open.body = '<!-- status-suggestions: [] -->';
await sync([candidate]);
assert.ok(calls.some(c => c.endpoint?.endsWith('/git/refs/heads/auto/status-suggestions') && c.method === 'PATCH'), 'changed set force-updates dedicated branch');
await sync([]);
assert.equal(open, null, 'no suggestions closes PR');
assert.match(automaticallyClosed, /<!-- status-suggestions: \[\] -->/, 'automatic closure must not become a rejection');
closed = [{ head: { ref: 'auto/status-suggestions' }, merged_at: null, body: automaticallyClosed }];
await sync([candidate]);
assert.ok(open, 'automatic closure does not suppress a later suggestion');
await sync([]);
closed = [{ head: { ref: 'auto/status-suggestions' }, merged_at: null, body }];
historyPage = true;
writes = calls.length;
await sync([candidate]);
assert.equal(open, null, 'rejected pair is suppressed, including paginated history');
assert.ok(calls.slice(writes).some(c => c.endpoint?.endsWith('page=2')));
closed[0].merged_at = '2026-11-18';
await sync([candidate]);
assert.ok(open, 'merged PRs are not rejections');
await sync([]);
closed = [];
remote = remote.replace('author: owner\n', 'author: owner\nstatus: stable\n');
await sync([candidate]);
assert.equal(open, null, 'honor status set on main after checkout');
expectedContent = 'name: KAOSAMPLE\nrepo: omarhuertasllc-ops/kaosample-beta\nauthor: owner\nstatus: archived\ndescription: Changed on main\n';
await sync([{ ...candidate, status: 'archived' }]);
assert.ok(open, 'archive overrides a current explicit status');
remote = 'name: KAOSAMPLE\nrepo: omarhuertasllc-ops/kaosample-beta\nauthor: |\n  owner\n';
const beforeInvalid = calls.filter(c => c.method && c.method !== 'GET').length;
await assert.rejects(sync([candidate]), /status|YAML|mapping/i);
assert.equal(calls.filter(c => c.method && c.method !== 'GET').length, beforeInvalid, 'unsafe YAML insertion never changes a branch');
await assert.rejects(sync([{ ...candidate, path: 'package.json' }]), /path/i);
await assert.rejects(syncStatusSuggestions('test-token', 'owner/catalog', [candidate], { gh, api: async () => { throw new Error('GitHub unavailable'); } }), /GitHub unavailable/);

const dry = spawnSync(process.execPath, ['scripts/suggest-status.js', '--dry-run'], { encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: '', GITHUB_REPOSITORY: '' } });
assert.equal(dry.status, 0, dry.stderr);
assert.match(dry.stdout, /Dry run/);
console.log('Status suggestion checks passed: rules, YAML preservation, PR isolation, idempotency, closure, rejection history and dry run.');
