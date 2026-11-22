import assert from 'node:assert/strict';
import { formatCatalogDate, formatRelativeDay, utcDayKey } from '../src/lib/format-date.js';

// MaiaOS V2: evening UTC must stay Nov 20 for every viewer timezone.
assert.equal(formatCatalogDate('2026-11-20T21:41:45Z'), 'Nov 20, 2026');
assert.equal(formatCatalogDate('2026-11-13T17:13:41Z'), 'Nov 13, 2026');
// Date-only strings keep that calendar day via Date.UTC.
assert.equal(formatCatalogDate('2026-11-20'), 'Nov 20, 2026');
assert.equal(formatCatalogDate(null), null);
assert.equal(formatCatalogDate('not-a-date'), null);

const eveningUtc = new Date('2026-11-20T21:41:45Z');
assert.equal(utcDayKey(eveningUtc), '2026-11-20');

// Local calendar-day fixtures run under UTC, Australia/Sydney and America/Los_Angeles.
const now = new Date(2026, 10, 22, 0, 15);
assert.equal(formatRelativeDay(new Date(2026, 10, 22, 0, 1).toISOString(), now), 'Today');
assert.equal(formatRelativeDay(new Date(2026, 10, 21, 23, 59).toISOString(), now), '1 day ago');
assert.equal(formatRelativeDay('2026-11-22', now), 'Today');
assert.equal(formatRelativeDay('2026-11-21', now), '1 day ago');
assert.equal(formatRelativeDay('2026-11-20', now), '2 days ago');
assert.equal(formatRelativeDay('2026-10-23', now), '30 days ago');
assert.equal(formatRelativeDay('2026-10-22', now), null);
assert.equal(formatRelativeDay('2026-11-23', now), 'Today');
assert.equal(formatRelativeDay('not-a-date', now), null);
assert.equal(formatRelativeDay('2026-02-30', now), null);
assert.equal(formatRelativeDay(null, now), null);
assert.equal(formatRelativeDay('', now), null);
assert.equal(formatRelativeDay('2026-11-22', new Date(NaN)), null);
assert.equal(formatRelativeDay('2026-12-31', new Date(2027, 0, 1, 0, 1)), '1 day ago');

// Spring-forward and fall-back dates in Sydney and Los Angeles.
for (const [month, day] of [[2, 8], [9, 4]]) {
	const before = new Date(2026, month, day, 0, 30);
	const after = new Date(2026, month, day + 1, 0, 0);
	assert.equal(formatRelativeDay(before.toISOString(), after), '1 day ago');
}

for (const [month, day] of [[3, 5], [10, 1]]) {
	const before = new Date(2026, month, day, 0, 15);
	const after = new Date(2026, month, day + 1, 23, 45);
	assert.equal(formatRelativeDay(before.toISOString(), after), '1 day ago');
}

console.log('Format-date checks passed for UTC and viewer-local calendar dates.');
