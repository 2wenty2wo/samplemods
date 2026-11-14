import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const SECTION_FILES = {
	mods: 'mod.yaml', apps: 'app.yaml', games: 'game.yaml',
	tools: 'tool.yaml', guides: 'guide.yaml', dev: 'dev.yaml'
};
const IMAGE_EXTS = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg', '.gif']);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readEntries(dataDir = path.join(root, 'data')) {
	const entries = [];
	const ids = new Set();
	for (const sectionDir of fs.readdirSync(dataDir, { withFileTypes: true })) {
		if (sectionDir.isFile() && sectionDir.name.endsWith('.json')) continue;
		if (sectionDir.isDirectory() && sectionDir.name === 'readme') continue;
		const section = sectionDir.name;
		if (!sectionDir.isDirectory() || !Object.hasOwn(SECTION_FILES, section)) {
			throw new Error(`Unknown data section or misplaced file: ${section}`);
		}
		for (const entry of fs.readdirSync(path.join(dataDir, section), { withFileTypes: true })) {
			const id = entry.name;
			const dir = path.join(dataDir, section, id);
			if (!entry.isDirectory()) throw new Error(`${dir}: expected an entry directory`);
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${dir}: id must be kebab-case`);
			if (ids.has(id)) throw new Error(`Duplicate id across sections: ${id}`);
			ids.add(id);
			const file = path.join(dir, SECTION_FILES[section]);
			if (!fs.existsSync(file)) throw new Error(`${dir}: missing ${SECTION_FILES[section]} (wrong filename or orphan media)`);
			let record;
			try { record = yaml.load(fs.readFileSync(file, 'utf8')); }
			catch (error) { throw new Error(`${file}: YAML parse error: ${error.message}`); }
			if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`${file}: expected a YAML object`);
			if (Object.hasOwn(record, 'section')) throw new Error(`${file}: section comes from the folder; omit it from YAML`);
			if (Object.hasOwn(record, 'id')) throw new Error(`${file}: id comes from the folder; omit it from YAML`);
			const media = [];
			for (const asset of fs.readdirSync(dir, { withFileTypes: true })) {
				if ((asset.name === SECTION_FILES[section] || asset.name === 'about.md') && asset.isFile()) continue;
				if (asset.isFile() && /^logo\./.test(asset.name) && IMAGE_EXTS.has(path.extname(asset.name))) {
					media.push(asset.name);
				} else if (asset.isDirectory() && asset.name === 'screenshots') {
					for (const shot of fs.readdirSync(path.join(dir, 'screenshots'), { withFileTypes: true })) {
						if (!shot.isFile() || !IMAGE_EXTS.has(path.extname(shot.name)) || shot.name.endsWith('.svg')) {
							throw new Error(`${dir}/screenshots/${shot.name}: unsupported or orphan media`);
						}
						media.push(`screenshots/${shot.name}`);
					}
				} else {
					throw new Error(`${dir}/${asset.name}: unexpected filename or orphan media`);
				}
			}
			entries.push({ id, section, dir, file, record, media: media.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) });
		}
	}
	if (!entries.length) throw new Error(`No catalog entries found in ${dataDir}`);
	return entries.sort((a, b) => a.id.localeCompare(b.id));
}
