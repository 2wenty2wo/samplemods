import assert from 'node:assert/strict';
import { shouldCatchUpEnrich } from './enrich-catchup.js';

const now = Date.parse('2026-11-18T12:00:00.000Z');

assert.equal(
	shouldCatchUpEnrich({ lastSuccessAt: null, now, hasActiveRun: false }),
	true,
	'no prior success should trigger'
);
assert.equal(
	shouldCatchUpEnrich({
		lastSuccessAt: '2026-11-18T04:59:00.000Z',
		now,
		hasActiveRun: false
	}),
	true,
	'older than 7h should trigger'
);
assert.equal(
	shouldCatchUpEnrich({
		lastSuccessAt: '2026-11-18T05:01:00.000Z',
		now,
		hasActiveRun: false
	}),
	false,
	'fresher than 7h should skip'
);
assert.equal(
	shouldCatchUpEnrich({
		lastSuccessAt: '2026-11-17T00:00:00.000Z',
		now,
		hasActiveRun: true
	}),
	false,
	'active enrich run must skip even when overdue'
);
assert.equal(
	shouldCatchUpEnrich({ lastSuccessAt: 'not-a-date', now, hasActiveRun: false }),
	true,
	'unparseable last success should trigger'
);

console.log('Enrich catch-up checks passed: overdue, fresh, active-run skip, missing/invalid last success.');
