import { getAllReleases } from '$lib/server/releases.js';
import { latestReleasesOnePerEntry } from '$lib/latest-releases-strip.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		latestReleases: latestReleasesOnePerEntry(getAllReleases(), 5)
	};
}
