import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readEntries } from './catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(root, '.catalog-test-'));
const dataDir = path.join(fixture, 'data');
function write(file, text) {
	fs.mkdirSync(path.dirname(path.join(dataDir, file)), { recursive: true });
	fs.writeFileSync(path.join(dataDir, file), text);
}
function bad(file, text, pattern) {
	write(file, text);
	assert.throws(() => readEntries(dataDir), pattern);
	fs.unlinkSync(path.join(dataDir, file));
}
try {
	write('mods/host/mod.yaml', 'name: Host\ndescription: Host mod\nrepo: owner/host\nauthor: owner\n');
	const playerRecord = 'name: Player\ndescription: Player app\nrepo: owner/player\nauthor: owner\nrequires: [host]\n';
	write('apps/player/app.yaml', playerRecord);
	write('apps/player/screenshots/02-screen.png', 'second image');
	write('apps/player/screenshots/01-screen.png', 'first image');
	const entries = readEntries(dataDir);
	assert.deepEqual(entries.map(({ id, section }) => ({ id, section })), [{ id: 'host', section: 'mods' }, { id: 'player', section: 'apps' }]);
	assert.deepEqual(entries[1].media, ['screenshots/01-screen.png', 'screenshots/02-screen.png']);
	bad('apps/player/wrong.yaml', 'name: Wrong', /unexpected filename/);
	bad('apps/player/loose.png', 'orphan', /orphan media/);
	write('tools/orphan/logo.png', 'orphan');
	assert.throws(() => readEntries(dataDir), /missing tool.yaml/);
	fs.rmSync(path.join(dataDir, 'tools'), { recursive: true });
	write('games/host/game.yaml', 'name: Duplicate');
	assert.throws(() => readEntries(dataDir), /Duplicate id/);
	fs.rmSync(path.join(dataDir, 'games'), { recursive: true });
	write('unknown/item/item.yaml', 'name: Unknown');
	assert.throws(() => readEntries(dataDir), /Unknown data section/);
	fs.rmSync(path.join(dataDir, 'unknown'), { recursive: true });
	fs.renameSync(path.join(dataDir, 'mods/host/mod.yaml'), path.join(dataDir, 'mods/host/app.yaml'));
	assert.throws(() => readEntries(dataDir), /missing mod.yaml/);
	fs.renameSync(path.join(dataDir, 'mods/host/app.yaml'), path.join(dataDir, 'mods/host/mod.yaml'));
	fs.mkdirSync(path.join(fixture, 'scripts'));
	for (const file of ['catalog.js', 'build-data.js', 'validate.js']) fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
	fs.mkdirSync(path.join(fixture, 'schema'));
	fs.copyFileSync(path.join(root, 'schema/mod.yaml'), path.join(fixture, 'schema/mod.yaml'));
	const validate = () => spawnSync(process.execPath, [path.join(fixture, 'scripts/validate.js')], { encoding: 'utf8' });
	assert.equal(validate().status, 0, 'requires must resolve across sections');
	write('apps/player/app.yaml', playerRecord.replace('[host]', '[missing]'));
	assert.match(validate().stderr, /requires unknown entry/);
	write('apps/player/app.yaml', playerRecord.replace('[host]', '[player]'));
	assert.match(validate().stderr, /cannot require itself/);
	write('apps/player/app.yaml', playerRecord + 'category: app\n');
	assert.match(validate().stderr, /schema validation failed/);
	write('apps/player/app.yaml', playerRecord);
	write('media-sources.json', JSON.stringify({ player: [{ file: 'screenshots/missing.png' }] }));
	assert.match(validate().stderr, /orphan media/);
	fs.unlinkSync(path.join(dataDir, 'media-sources.json'));
	let result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-data.js')], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	let output = JSON.parse(fs.readFileSync(path.join(fixture, 'src/lib/data.json')));
	assert.deepEqual(output.find((entry) => entry.id === 'host').required_by, ['player']);
	assert.equal(output.find((entry) => entry.id === 'player').screenshots[0], 'media/player/screenshots/01-screen.png');
	assert.equal(fs.readFileSync(path.join(fixture, 'static/media/player/screenshots/01-screen.png'), 'utf8'), 'first image');
	fs.unlinkSync(path.join(dataDir, 'apps/player/screenshots/02-screen.png'));
	result = spawnSync(process.execPath, [path.join(fixture, 'scripts/build-data.js')], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.ok(!fs.existsSync(path.join(fixture, 'static/media/player/screenshots/02-screen.png')), 'stale generated media must disappear');
	console.log('Catalog checks passed: section discovery, invalid layouts, cross-section references, media copying and stale cleanup.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
