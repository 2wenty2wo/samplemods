import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Catalog entry YAML: data/<section>/<id>/<file>.yaml */
const ENTRY_YAML_RE = /^data\/[^/]+\/[^/]+\/[^/]+\.ya?ml$/i;

/**
 * @param {string} filePath
 */
export function isEntryYamlPath(filePath) {
	return ENTRY_YAML_RE.test(String(filePath || '').replace(/\\/g, '/'));
}

/**
 * @param {string | null | undefined} yamlText
 * @returns {string}
 */
export function extractRepoField(yamlText) {
	const match = String(yamlText ?? '').match(/^\s*repo:\s*(.+?)\s*$/m);
	if (!match) return '';
	return match[1].replace(/^['"]|['"]$/g, '').trim();
}

/**
 * @param {string | null | undefined} beforeText
 * @param {string | null | undefined} afterText
 */
export function repoFieldChanged(beforeText, afterText) {
	return extractRepoField(beforeText) !== extractRepoField(afterText);
}

/**
 * Decide whether a main push should run the full enrich workflow.
 * @param {{
 *   changes?: Array<{ path: string, status: string, repoChanged?: boolean, oldPath?: string }>,
 *   actor?: string,
 *   commitMessage?: string
 * }} input
 */
export function shouldEnrichOnPush({ changes = [], actor = '', commitMessage = '' } = {}) {
	const who = String(actor || '');
	const message = String(commitMessage || '');
	// Belt-and-suspenders: enrich's own metadata commit must never re-enter.
	if (
		(who === 'github-actions[bot]' || who === 'github-actions') &&
		/^\s*chore:\s*refresh GitHub metadata\b/m.test(message)
	) {
		return false;
	}

	for (const change of changes) {
		const status = String(change.status || '').toUpperCase();
		const dest = change.path;
		if (!isEntryYamlPath(dest)) continue;

		if (status === 'A' || status.startsWith('R')) return true;
		if (status === 'M' && change.repoChanged) return true;
	}
	return false;
}

/**
 * @param {string} before
 * @param {string} after
 * @param {{ git?: (args: string[]) => string }} [opts]
 */
export function collectEntryYamlChanges(before, after, opts = {}) {
	const git =
		opts.git ||
		((args) =>
			execFileSync('git', args, {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe']
			}));

	const raw = git(['diff', '--name-status', before, after]);
	/** @type {Array<{ path: string, status: string, repoChanged?: boolean, oldPath?: string }>} */
	const changes = [];

	for (const line of raw.split(/\r?\n/)) {
		if (!line.trim()) continue;
		const parts = line.split('\t');
		const statusToken = parts[0] || '';
		const status = statusToken.charAt(0).toUpperCase();

		if (status === 'R' && parts.length >= 3) {
			const oldPath = parts[1];
			const newPath = parts[2];
			if (!isEntryYamlPath(newPath) && !isEntryYamlPath(oldPath)) continue;
			let beforeText = '';
			let afterText = '';
			try {
				beforeText = git(['show', `${before}:${oldPath}`]);
			} catch {
				beforeText = '';
			}
			try {
				afterText = git(['show', `${after}:${newPath}`]);
			} catch {
				afterText = '';
			}
			changes.push({
				path: newPath,
				oldPath,
				status: 'R',
				repoChanged: repoFieldChanged(beforeText, afterText)
			});
			continue;
		}

		const filePath = parts[1];
		if (!filePath || !isEntryYamlPath(filePath)) continue;

		if (status === 'A') {
			changes.push({ path: filePath, status: 'A' });
			continue;
		}
		if (status === 'D') {
			changes.push({ path: filePath, status: 'D' });
			continue;
		}
		if (status === 'M') {
			let beforeText = '';
			let afterText = '';
			try {
				beforeText = git(['show', `${before}:${filePath}`]);
			} catch {
				beforeText = '';
			}
			try {
				afterText = git(['show', `${after}:${filePath}`]);
			} catch {
				afterText = '';
			}
			changes.push({
				path: filePath,
				status: 'M',
				repoChanged: repoFieldChanged(beforeText, afterText)
			});
		}
	}

	return changes;
}

function parseArgs(argv) {
	const out = { before: '', after: '', actor: '', message: '' };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--before') out.before = argv[++i] || '';
		else if (arg === '--after') out.after = argv[++i] || '';
		else if (arg === '--actor') out.actor = argv[++i] || '';
		else if (arg === '--message') out.message = argv[++i] || '';
	}
	return out;
}

const invokedDirectly =
	process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
	const { before, after, actor, message } = parseArgs(process.argv.slice(2));
	if (!before || !after || /^0+$/.test(before)) {
		console.log('skip: missing or null before SHA');
		process.exitCode = 1;
	} else {
		const changes = collectEntryYamlChanges(before, after);
		const should = shouldEnrichOnPush({ changes, actor, commitMessage: message });
		console.log(should ? 'trigger' : 'skip');
		if (should) {
			for (const change of changes) {
				if (change.status === 'D') continue;
				if (change.status === 'A' || change.status.startsWith('R') || change.repoChanged) {
					console.log(`${change.status}\t${change.path}${change.repoChanged ? '\trepo-changed' : ''}`);
				}
			}
		}
		process.exitCode = should ? 0 : 1;
	}
}
