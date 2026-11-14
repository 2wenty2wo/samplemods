import { error } from '@sveltejs/kit';
import mods from '$lib/data.json';
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

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	if (!VALID_SINGULARS.has(params.section)) {
		throw error(404, `Section "${params.section}" not found`);
	}
	const mod = mods.find((m) => m.id === params.id);
	if (!mod) {
		throw error(404, `Entry "${params.id}" not found`);
	}
	const canonicalSection = sectionSingular(mod.section);
	const canonicalPath = entryPath(mod);

	if (params.section === canonicalSection) {
		return { mod, mods, redirectTo: null, canonicalPath };
	}
	if (params.section === 'mod' && canonicalSection !== 'mod') {
		return { mod, mods, redirectTo: canonicalPath, canonicalPath };
	}
	throw error(404, `Entry "${params.id}" not found in /${params.section}/`);
}
