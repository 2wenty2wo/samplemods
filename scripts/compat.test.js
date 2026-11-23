import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { updateSampleBootCompat } from './compat.js';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'samplemods-compat-'));
const readme = path.join(fixture, 'readme', 'sampleboot.md');
const output = path.join(fixture, 'compat.json');
const entries = [
	{ id: 'engine-ports', record: { name: 'Engine Ports', website: 'https://jazzyrhythmer.github.io/mpc-sample/' } },
	{ id: 'rhythmer-os', record: { name: 'RHYTHMER OS', website: 'http://jazzyrhythmer.github.io/mpc-sample' } },
	{ id: 'mpc-600-s', record: { repo: 'LA-2500/MPC-600-S' } }
];
const header = '| System | Versions | Status | Checked by | Notes | From |\n|---|---|---|---|---|---|';
const table = [
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

try {
	fs.mkdirSync(path.dirname(readme));
	fs.writeFileSync(readme, table);
	updateSampleBootCompat(fixture, entries, new Date('2026-11-23T23:59:59Z'));
	const original = fs.readFileSync(output, 'utf8');
	const expected = {
		source: 'https://github.com/pxcm/SampleBoot#works-with',
		updated: '2026-11-23',
		entries: {
			'mpc-600-s': { versions: 'v1.7b', status: 'Works', checked_by: 'Tested', notes: 'Needs sampleboot.inplace; see setup.' },
			'rhythmer-os': { versions: '0.2.0', status: 'Works', checked_by: 'User report', notes: 'Keep both folders at the root.' }
		}
	};
	const snapshot = JSON.parse(original).sampleboot;
	assert.deepEqual(snapshot, expected);
	assert.deepEqual(Object.keys(snapshot.entries), Object.keys(expected.entries));

	fs.utimesSync(output, 1000000, 1000000);
	updateSampleBootCompat(fixture, entries, new Date('2026-11-24T00:00:00Z'));
	assert.equal(fs.readFileSync(output, 'utf8'), original);
	assert.equal(fs.statSync(output).mtimeMs, 1000000000, 'unchanged entries must not rewrite the file');

	const warnings = [];
	const warn = console.warn;
	console.warn = (message) => warnings.push(message);
	try {
		fs.writeFileSync(readme, '# SampleBoot');
		updateSampleBootCompat(fixture, entries);
		fs.writeFileSync(readme, `## Works with\n\n${header}\n| ODDFORM | 1.2.0 beta | Works | User report | | – |`);
		updateSampleBootCompat(fixture, entries);
	} finally {
		console.warn = warn;
	}
	assert.equal(warnings.length, 2);
	assert.equal(fs.readFileSync(output, 'utf8'), original, 'missing and unmatched tables preserve the snapshot');
	assert.equal(fs.statSync(output).mtimeMs, 1000000000);
	console.log('SampleBoot compatibility checks passed: matching, row order, plain notes, no-op writes and snapshot preservation.');
} finally {
	fs.rmSync(fixture, { recursive: true, force: true });
}
