import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { updateCompat } from './compat.js';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'samplemods-compat-'));
const readmeDir = path.join(fixture, 'readme');
const samplebootReadme = path.join(readmeDir, 'sampleboot.md');
const mpselectorReadme = path.join(readmeDir, 'mpselector.md');
const output = path.join(fixture, 'compat.json');
const entries = [
	{ id: 'engine-ports', record: { name: 'Engine Ports', website: 'https://jazzyrhythmer.github.io/mpc-sample/' } },
	{ id: 'rhythmer-os', record: { name: 'RHYTHMER OS', website: 'http://jazzyrhythmer.github.io/mpc-sample' } },
	{ id: 'mpc-600-s', record: { repo: 'LA-2500/MPC-600-S' } },
	{ id: 'melodee-sample', record: { name: 'Melodee', repo: 'keremimo/melodee-sample' } },
	{ id: 'mpc-simple', record: { name: 'MPC Simple', website: 'https://mpcsimple.com/' } }
];
const header = '| System | Versions | Status | Checked by | Notes | From |\n|---|---|---|---|---|---|';
const samplebootTable = [
	'# SampleBoot',
	'## Works with',
	'Current compatibility:',
	'',
	header,
	'| MPC 600 S | v1.7b | Works | Tested | Needs `sampleboot.inplace`; see [setup](https://example.com/setup). | [GitHub](https://github.com/la-2500/mpc-600-s) |',
	'| Stock firmware | 1.3.0 | Works | Tested | | Akai Professional |',
	'| Rhythmer OS | 0.2.0 | Works | User report | Keep **both** folders at the root. | [Site](https://jazzyrhythmer.github.io/mpc-sample/) |',
	'| ODDFORM | 1.2.0 beta | Works | User report | | – |',
	'',
	'## Other systems',
	header,
	'| MPC 600 S | older | Works | Tested | | [GitHub](https://github.com/la-2500/mpc-600-s) |'
].join('\n');

function mpselectorTable(akaiVersion) {
	return [
		'# MP Selector',
		`### Opened on Akai ${akaiVersion}`,
		'',
		'| Firmware | Version |',
		'| --- | --- |',
		'| [Melodee](https://github.com/keremimo/melodee-sample/releases) | 0.8.3 |',
		'| [MPC Simple](https://mpcsimple.com) | 1.0 Beta 11 |',
		'| [Rhythmer OS](https://jazzyrhythmer.github.io/mpc-sample) | 0.3.0 |',
		'| [Missing Mod](https://github.com/nobody/missing-mod) | 9.9.9 |',
		'',
		'### Not on Akai yet',
		'',
		'- ignored'
	].join('\n');
}

try {
	fs.mkdirSync(readmeDir);
	fs.writeFileSync(samplebootReadme, samplebootTable);
	updateCompat(fixture, entries, new Date('2026-11-23T23:59:59Z'));
	const original = fs.readFileSync(output, 'utf8');
	const expectedSampleboot = {
		source: 'https://github.com/pxcm/SampleBoot#works-with',
		updated: '2026-11-23',
		entries: {
			'mpc-600-s': { versions: 'v1.7b', status: 'Works', checked_by: 'Tested', notes: 'Needs sampleboot.inplace; see setup.' },
			'rhythmer-os': { versions: '0.2.0', status: 'Works', checked_by: 'User report', notes: 'Keep both folders at the root.' }
		}
	};
	const snapshot = JSON.parse(original).sampleboot;
	assert.deepEqual(snapshot, expectedSampleboot);
	assert.deepEqual(Object.keys(snapshot.entries), Object.keys(expectedSampleboot.entries));

	fs.utimesSync(output, 1000000, 1000000);
	updateCompat(fixture, entries, new Date('2026-11-24T00:00:00Z'));
	assert.equal(fs.readFileSync(output, 'utf8'), original);
	assert.equal(fs.statSync(output).mtimeMs, 1000000000, 'unchanged entries must not rewrite the file');

	const warnings = [];
	const warn = console.warn;
	console.warn = (message) => warnings.push(message);
	try {
		fs.writeFileSync(samplebootReadme, '# SampleBoot');
		updateCompat(fixture, entries);
		fs.writeFileSync(samplebootReadme, `## Works with\n\n${header}\n| ODDFORM | 1.2.0 beta | Works | User report | | – |`);
		updateCompat(fixture, entries);
	} finally {
		console.warn = warn;
	}
	assert.equal(warnings.length, 2);
	assert.equal(fs.readFileSync(output, 'utf8'), original, 'missing and unmatched tables preserve the snapshot');
	assert.equal(fs.statSync(output).mtimeMs, 1000000000);

	// Restore SampleBoot README, add MP Selector with /releases link + heading version change.
	fs.writeFileSync(samplebootReadme, samplebootTable);
	fs.writeFileSync(mpselectorReadme, mpselectorTable('1.4.0.8'));
	updateCompat(fixture, entries, new Date('2026-11-27T12:00:00Z'));
	let data = JSON.parse(fs.readFileSync(output, 'utf8'));
	assert.deepEqual(data.sampleboot, expectedSampleboot, 'SampleBoot block stays byte-identical when only mpselector is new');
	assert.equal(data.mpselector.source, 'https://github.com/fomoPhil/mpselector#opened-on-akai-1408');
	assert.equal(data.mpselector.updated, '2026-11-27');
	assert.deepEqual(data.mpselector.entries, {
		'melodee-sample': { versions: '0.8.3', status: 'Works', checked_by: 'Tested', notes: '' },
		'mpc-simple': { versions: '1.0 Beta 11', status: 'Works', checked_by: 'Tested', notes: '' },
		'rhythmer-os': { versions: '0.3.0', status: 'Works', checked_by: 'Tested', notes: '' }
	});

	fs.writeFileSync(mpselectorReadme, mpselectorTable('1.5.0.0'));
	updateCompat(fixture, entries, new Date('2026-11-28T12:00:00Z'));
	data = JSON.parse(fs.readFileSync(output, 'utf8'));
	assert.equal(data.mpselector.source, 'https://github.com/fomoPhil/mpselector#opened-on-akai-1500');
	assert.equal(data.mpselector.updated, '2026-11-28');
	assert.deepEqual(data.sampleboot, expectedSampleboot, 'heading-version change must not rewrite SampleBoot');
	assert.deepEqual(Object.keys(data.mpselector.entries), ['melodee-sample', 'mpc-simple', 'rhythmer-os']);

	console.log('Compatibility checks passed: SampleBoot matching, MP Selector /releases + heading change, no-op writes and snapshot preservation.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
