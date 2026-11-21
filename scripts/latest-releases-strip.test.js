import assert from 'node:assert/strict';
import {
	latestReleasesOnePerEntry,
	selectNewestCatalogEntries
} from '../src/lib/latest-releases-strip.js';

/** Newest-first fixture with duplicates (like Tape Workshop ×3). */
const fixture = [
	{ entryId: 'tape-workshop', key: 'tape:3' },
	{ entryId: 'mpc-simple', key: 'simple:1' },
	{ entryId: 'tape-workshop', key: 'tape:2' },
	{ entryId: 'tape-workshop', key: 'tape:1' },
	{ entryId: 'mpc-600-s', key: '600:1' },
	{ entryId: 'gridzilla', key: 'gz:1' },
	{ entryId: 'other', key: 'other:1' }
];

const strip = latestReleasesOnePerEntry(fixture, 5);
assert.equal(strip.length, 5);
assert.deepEqual(
	strip.map((r) => r.entryId),
	['tape-workshop', 'mpc-simple', 'mpc-600-s', 'gridzilla', 'other']
);
assert.equal(new Set(strip.map((r) => r.entryId)).size, 5);
assert.equal(strip[0].key, 'tape:3', 'keeps newest release per entry');

const catalogFixture = [
	{ id: 'tape-workshop', name: 'Tape Workshop', added: '2026-11-20T22:00:00Z' },
	{ id: 'sampleseq3000', name: 'SampleSeq3000', added: '2026-11-20T21:04:56+11:00' },
	{ id: 'padhead', name: 'Padhead', added: '2026-11-20T19:23:59+11:00' },
	{ id: 'dsb-boot', name: 'HenrySkillz D.S.B Boot', added: '2026-11-19T15:36:21+11:00' },
	{ id: 'vigobeatz-stems-grid64', name: 'VigoBeatz Stems + Grid64', added: '2026-11-19T07:24:41+11:00' },
	{ id: 'mpc-sample-engine-ports', name: 'MPC Sample Engine Ports', added: '2026-11-17T21:20:49+11:00' },
	{ id: 'le-resampler', name: 'Le Resampler', added: '2026-11-17T21:20:44+11:00' },
	{ id: 'no-date', name: 'No Date', added: null }
];
const newest = selectNewestCatalogEntries(catalogFixture, strip, 5);
assert.equal(newest.length, 5);
assert.deepEqual(
	newest.map((e) => e.id),
	[
		'sampleseq3000',
		'padhead',
		'dsb-boot',
		'vigobeatz-stems-grid64',
		'mpc-sample-engine-ports'
	],
	'dedupes against Latest releases strip, sorts newest first by added timestamp, and caps at limit'
);

console.log('Latest-releases strip checks passed: 5 distinct entryIds, newest kept, new-in-catalog deduped.');
