import { error } from '@sveltejs/kit';
import mods from '$lib/data.json';

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return mods.map((mod) => ({ id: mod.id }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const mod = mods.find((m) => m.id === params.id);
	if (!mod) {
		error(404, 'Mod not found');
	}
	return { mod, mods };
}
