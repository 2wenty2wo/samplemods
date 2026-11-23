import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const compatFile = 'data/compat.json';
const generatedFiles = new Set([
	'data/github.json',
	'data/contributors.json',
	'data/watch.json',
	compatFile,
	'src/lib/data.json',
	'src/lib/catalog-meta.json',
	'src/lib/server/details.json',
	'static/catalog.json'
]);

export function protectedFiles(files) {
	return files.filter((file) => generatedFiles.has(file)
		|| file.startsWith('data/readme/') || file.startsWith('static/media/'));
}

function main() {
	const base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { encoding: 'utf8' }).trim();
	// Disable rename detection so moving a protected file still reports its old path.
	const changed = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, 'HEAD'], { encoding: 'utf8' });
	const blocked = protectedFiles(changed.split('\0').filter(Boolean));
	const compatIndex = blocked.indexOf(compatFile);
	if (compatIndex !== -1 && !execFileSync('git', ['ls-tree', 'origin/main', '--', compatFile], { encoding: 'utf8' })) {
		// Allow the initial seed until main starts tracking the bot-owned snapshot.
		blocked.splice(compatIndex, 1);
	}
	if (blocked.length) {
		console.error(`These files are updated automatically every 6 hours by the refresh job. Please remove them from this PR:\n${blocked.map((file) => `- ${file}`).join('\n')}\nTip: \`git checkout origin/main -- <file>\`.`);
		process.exitCode = 1;
	} else {
		console.log('PR file check passed: no bot-owned or generated files changed.');
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try { main(); }
	catch (error) { console.error(`PR file check failed: ${error.message}`); process.exitCode = 1; }
}
