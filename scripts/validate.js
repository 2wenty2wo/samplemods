import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import { readEntries } from './catalog.js';
import { readCompat } from './compat.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = yaml.load(fs.readFileSync(path.join(root, 'schema', 'mod.yaml'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
let entries;
try { entries = readEntries(); }
catch (error) { console.error(error.message); process.exit(1); }
const ids = new Set(entries.map((entry) => entry.id));
let failed = false;
try { readCompat(path.join(root, 'data')); }
catch (error) {
	console.error('data/compat.json: ' + error.message);
	failed = true;
}
// Keep in sync with PRIMARY_LAUNCHER in build-data.js (always first in "Works with").
if (!ids.has('sampleboot')) {
	console.error('Missing required launcher entry "sampleboot" (PRIMARY_LAUNCHER in build-data.js).');
	failed = true;
}
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
	if (!record.repo && !record.website) {
		console.error(`${file}: website is required when repo is absent`);
		failed = true;
	}
	if (record.released) {
		const date = Date.parse(`${record.released}T00:00:00Z`);
		if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== record.released) {
			console.error(`${file}: released must be a valid calendar date (YYYY-MM-DD)`);
			failed = true;
		}
	}
	for (const requirement of record.requires ?? []) {
		if (!ids.has(requirement) || requirement === id) {
			console.error(`${file}: ${requirement === id ? 'cannot require itself' : `requires unknown entry id "${requirement}"`}`);
			failed = true;
		}
	}
	if (record.firmware_ignore) {
		if (!record.firmware) {
			console.error(`${file}: firmware_ignore requires firmware`);
			failed = true;
		}
		for (const build of record.firmware_ignore) {
			if (typeof build !== 'string' || !/^1\.[3-9]\.\d+\.\d+$/.test(build)) {
				console.error(`${file}: firmware_ignore entry must be a firmware build like 1.4.0.7 (got ${JSON.stringify(build)})`);
				failed = true;
			}
		}
	}
	if (section === 'plugins') {
		const hasHosts = Array.isArray(record.hosts) && record.hosts.length > 0;
		const hasFirmware = Boolean(record.firmware);
		if (!hasHosts && !hasFirmware) {
			console.error(`${file}: plugins need hosts (host app ids) or firmware (runs in stock Akai plug-in support)`);
			failed = true;
		}
	}
	for (const hostId of record.hosts ?? []) {
		if (!ids.has(hostId) || hostId === id) {
			console.error(`${file}: ${hostId === id ? 'cannot list itself as host' : `hosts unknown entry id "${hostId}"`}`);
			failed = true;
		}
	}
	for (const baseId of record.based_on ?? []) {
		if (!ids.has(baseId) || baseId === id) {
			console.error(`${file}: ${baseId === id ? 'cannot be based on itself' : `based_on unknown entry id "${baseId}"`}`);
			failed = true;
		}
	}
	for (const compatibleId of record.compatible ?? []) {
		if (!ids.has(compatibleId) || compatibleId === id) {
			console.error(`${file}: ${compatibleId === id ? 'cannot list itself as compatible' : `compatible unknown entry id "${compatibleId}"`}`);
			failed = true;
		}
	}
	for (const versionId of Object.keys(record.compatible_versions ?? {})) {
		if (!record.compatible?.includes(versionId)) {
			console.error(`${file}: compatible_versions entry id "${versionId}" must be listed in compatible`);
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
