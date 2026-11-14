import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import { readEntries } from './catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = yaml.load(fs.readFileSync(path.join(root, 'schema', 'mod.yaml'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
let entries;
try { entries = readEntries(); }
catch (error) { console.error(error.message); process.exit(1); }
const ids = new Set(entries.map((entry) => entry.id));
let failed = false;
if (fs.existsSync(path.join(root, 'static', 'mods'))) {
	console.error('Legacy static/mods media must live beside the entry YAML in data/<section>/<id>/.');
	failed = true;
}
for (const { id, section, file, dir, record, media } of entries) {
	if (!validate({ ...record, section })) {
		console.error(`${file}: schema validation failed`);
		for (const error of validate.errors ?? []) console.error(`  ${error.instancePath || '/'} ${error.message}`);
		failed = true;
		continue;
	}
	for (const requirement of record.requires ?? []) {
		if (!ids.has(requirement) || requirement === id) {
			console.error(`${file}: ${requirement === id ? 'cannot require itself' : `requires unknown entry id "${requirement}"`}`);
			failed = true;
		}
	}
	for (const asset of media) {
		const bytes = fs.statSync(path.join(dir, asset)).size;
		if (bytes > 500 * 1024) console.warn(`warn: ${id}/${asset} is ${(bytes / 1024).toFixed(1)} KB (guideline: <= 500 KB)`);
	}
}
const sourcesPath = path.join(root, 'data', 'media-sources.json');
if (fs.existsSync(sourcesPath)) {
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	for (const [id, sources] of Object.entries(JSON.parse(fs.readFileSync(sourcesPath, 'utf8')))) {
		const entry = byId.get(id);
		if (!entry) { console.error(`media-sources.json: unknown entry "${id}"`); failed = true; continue; }
		for (const source of sources) {
			if (!entry.media.includes(source.file)) {
				console.error(`media-sources.json: orphan media ${id}/${source.file}`);
				failed = true;
			}
		}
	}
}
if (failed) { console.error(`Validation failed (${entries.length} entries checked).`); process.exit(1); }
console.log(`Validated ${entries.length} catalog entries.`);
