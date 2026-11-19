import { getAllReleases } from '$lib/server/releases.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		releases: getAllReleases()
	};
}
