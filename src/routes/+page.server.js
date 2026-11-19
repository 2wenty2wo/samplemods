import { getAllReleases } from '$lib/server/releases.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		latestReleases: getAllReleases().slice(0, 5)
	};
}
