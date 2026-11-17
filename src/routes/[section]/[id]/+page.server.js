import { error } from '@sveltejs/kit';
import mods from '$lib/data.json';
import details from '$lib/server/details.json';
import { SECTION_SINGULAR, sectionSingular, entryPath } from '$lib/categories.js';

const VALID_SINGULARS = new Set(Object.values(SECTION_SINGULAR));

export function entries() {
	/** @type {Array<{ section: string, id: string }>} */
	const list = [];
	for (const m of mods) {
		const sing = sectionSingular(m.section);
		list.push({ section: sing, id: m.id });
		if (sing !== 'mod') {
			list.push({ section: 'mod', id: m.id });
		}
	}
	return list;
}

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	if (!VALID_SINGULARS.has(params.section)) {
		throw error(404, `Section "${params.section}" not found`);
	}
	const summary = mods.find((m) => m.id === params.id);
	if (!summary) {
		throw error(404, `Entry "${params.id}" not found`);
	}
	const canonicalSection = sectionSingular(summary.section);
	const canonicalPath = entryPath(summary);

	if (params.section === canonicalSection) {
		const mod = { ...summary, ...details[summary.id] };
		const relatedIds = new Set([
			...(mod.requires ?? []),
			...mod.required_by,
			...(mod.compatible ?? []),
			...(mod.launchers ?? [])
		]);
		const related = mods.filter((entry) => relatedIds.has(entry.id)).map((entry) => ({
			id: entry.id, section: entry.section, name: entry.name, status: entry.status, logo: entry.logo, screenshots: entry.screenshots.slice(0, 1)
		}));
		return { mod, mods: related, redirectTo: null, canonicalPath };
	}
	if (params.section === 'mod' && canonicalSection !== 'mod') {
		return { id: summary.id, redirectTo: canonicalPath };
	}
	throw error(404, `Entry "${params.id}" not found in /${params.section}/`);
}
