import assert from 'node:assert/strict';
import { formatCatalogDate, utcDayKey } from '../src/lib/format-date.js';

// MaiaOS V2: evening UTC must stay Nov 20 for every viewer timezone.
assert.equal(formatCatalogDate('2026-11-20T21:41:45Z'), 'Nov 20, 2026');
assert.equal(formatCatalogDate('2026-11-13T17:13:41Z'), 'Nov 13, 2026');
// Date-only strings keep that calendar day via Date.UTC.
assert.equal(formatCatalogDate('2026-11-20'), 'Nov 20, 2026');
assert.equal(formatCatalogDate(null), null);
assert.equal(formatCatalogDate('not-a-date'), null);

const eveningUtc = new Date('2026-11-20T21:41:45Z');
assert.equal(utcDayKey(eveningUtc), '2026-11-20');

console.log('Format-date checks passed: UTC calendar day for timestamps and YYYY-MM-DD.');
