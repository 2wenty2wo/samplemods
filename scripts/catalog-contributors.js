/** Catalog-repo contributor fetch helpers (used by enrich.js). */

export const CATALOG_REPO = '2wenty2wo/samplemods';

/** Logins excluded even when GitHub reports type User (case-insensitive). */
export const AGENT_DENYLIST = new Set([
	'claude',
	'claude-code',
	'anthropic-claude',
	'codex',
	'openai-codex',
	'cursor',
	'cursoragent',
	'copilot',
	'github-copilot',
	'gemini',
	'antigravity',
	'devin'
]);

/**
 * @param {{ login?: string, type?: string } | null | undefined} user
 */
export function isHumanContributor(user) {
	if (!user?.login) return false;
	if (user.type === 'Bot') return false;
	const login = String(user.login);
	if (login.toLowerCase().endsWith('[bot]')) return false;
	if (AGENT_DENYLIST.has(login.toLowerCase())) return false;
	return true;
}

/**
 * Stable filtered list for data/contributors.json.
 * @param {Array<{ login?: string, avatar_url?: string, html_url?: string, contributions?: number, type?: string }>} users
 */
export function normalizeCatalogContributors(users) {
	return users
		.filter(isHumanContributor)
		.map((user) => ({
			login: user.login,
			avatar_url: user.avatar_url,
			html_url: user.html_url,
			contributions: user.contributions ?? 0
		}))
		.sort(
			(a, b) =>
				b.contributions - a.contributions || a.login.localeCompare(b.login, 'en')
		);
}
