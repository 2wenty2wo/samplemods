import assert from 'node:assert/strict';
import { latestReleasesOnePerEntry } from '../src/lib/latest-releases-strip.js';

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

console.log('Latest-releases strip checks passed: 5 distinct entryIds, newest kept.');
