import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Decide whether the enrich catch-up workflow should trigger enrich.yml.
 * @param {{ lastSuccessAt?: string | null, now?: number | Date, hasActiveRun?: boolean, maxAgeHours?: number }} input
 */
export function shouldCatchUpEnrich({
	lastSuccessAt = null,
	now = Date.now(),
	hasActiveRun = false,
	maxAgeHours = 7
} = {}) {
	if (hasActiveRun) return false;
	if (!lastSuccessAt) return true;
	const then = Date.parse(String(lastSuccessAt));
	if (!Number.isFinite(then)) return true;
	const nowMs = now instanceof Date ? now.getTime() : Number(now);
	return nowMs - then > maxAgeHours * 60 * 60 * 1000;
}

function parseArgs(argv) {
	const out = { last: null, active: 0 };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--last') out.last = argv[++i] || null;
		else if (arg === '--active') out.active = Number(argv[++i] || 0);
	}
	return out;
}

const invokedDirectly = process.argv[1]
	&& path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
	const { last, active } = parseArgs(process.argv.slice(2));
	const should = shouldCatchUpEnrich({
		lastSuccessAt: last && last !== '' ? last : null,
		hasActiveRun: Number(active) > 0
	});
	console.log(should ? 'trigger' : 'skip');
	process.exitCode = should ? 0 : 1;
}
