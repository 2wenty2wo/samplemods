import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const modsDir = path.join(root, 'data', 'mods');
const staticModsDir = path.join(root, 'static', 'mods');
const schemaPath = path.join(root, 'schema', 'mod.yaml');

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXTS = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg', '.gif']);
const MAX_IMAGE_BYTES = 500 * 1024;

const schema = yaml.load(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (!fs.existsSync(modsDir)) {
	console.error(`Missing mods directory: ${modsDir}`);
	process.exit(1);
}

const files = fs.readdirSync(modsDir).filter((f) => f.endsWith('.yaml'));
if (files.length === 0) {
	console.error('No mod YAML files found in data/mods/');
	process.exit(1);
}

const ids = new Set();
const records = [];
let failed = false;

for (const file of files) {
	const id = path.basename(file, '.yaml');
	const full = path.join(modsDir, file);

	if (!KEBAB.test(id)) {
		console.error(`${file}: id "${id}" must be kebab-case (a-z0-9 with hyphens)`);
		failed = true;
		continue;
	}

	if (ids.has(id)) {
		console.error(`${file}: duplicate id "${id}"`);
		failed = true;
		continue;
	}
	ids.add(id);

	let data;
	try {
		data = yaml.load(fs.readFileSync(full, 'utf8'));
	} catch (err) {
		console.error(`${file}: YAML parse error: ${err.message}`);
		failed = true;
		continue;
	}

	if (!validate(data)) {
		console.error(`${file}: schema validation failed`);
		for (const err of validate.errors ?? []) {
			console.error(`  ${err.instancePath || '/'} ${err.message}`);
		}
		failed = true;
		continue;
	}

	records.push({ id, file, data });
}

for (const { id, file, data } of records) {
	for (const req of data.requires ?? []) {
		if (!ids.has(req)) {
			console.error(`${file}: requires unknown mod id "${req}"`);
			failed = true;
		}
		if (req === id) {
			console.error(`${file}: cannot require itself`);
			failed = true;
		}
	}
}

if (fs.existsSync(staticModsDir)) {
	for (const entry of fs.readdirSync(staticModsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const id = entry.name;
		if (!ids.has(id)) {
			console.error(
				`static/mods/${id}/: no matching data/mods/${id}.yaml (typo or orphaned media folder)`
			);
			failed = true;
		}
	}

	/** @param {string} dir */
	function walkImages(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walkImages(full);
				continue;
			}
			const ext = path.extname(entry.name).toLowerCase();
			if (!IMAGE_EXTS.has(ext)) continue;
			const size = fs.statSync(full).size;
			if (size > MAX_IMAGE_BYTES) {
				const rel = path.relative(root, full).replaceAll('\\', '/');
				const kb = (size / 1024).toFixed(1);
				console.warn(`warn: ${rel} is ${kb} KB (guideline: ≤ 500 KB)`);
			}
		}
	}

	walkImages(staticModsDir);
}

if (failed) {
	console.error(`Validation failed (${files.length} file(s) checked).`);
	process.exit(1);
}

console.log(`Validated ${records.length} mod(s).`);
