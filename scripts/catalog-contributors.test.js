import assert from 'node:assert/strict';
import {
	isHumanContributor,
	normalizeCatalogContributors
} from './catalog-contributors.js';

assert.equal(isHumanContributor({ login: '2wenty2wo', type: 'User' }), true);
assert.equal(isHumanContributor({ login: 'dependabot[bot]', type: 'Bot' }), false);
assert.equal(isHumanContributor({ login: 'renovate[bot]', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'claude', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'Claude-Code', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'cursor', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'Codex', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'gemini', type: 'User' }), false);
assert.equal(isHumanContributor({ login: 'antigravity', type: 'User' }), false);
assert.equal(isHumanContributor(null), false);

const normalized = normalizeCatalogContributors([
	{
		login: 'claude',
		type: 'User',
		avatar_url: 'https://example.com/c',
		html_url: 'https://github.com/claude',
		contributions: 99
	},
	{
		login: 'bob',
		type: 'User',
		avatar_url: 'https://example.com/b',
		html_url: 'https://github.com/bob',
		contributions: 2
	},
	{
		login: 'alice',
		type: 'User',
		avatar_url: 'https://example.com/a',
		html_url: 'https://github.com/alice',
		contributions: 5
	},
	{
		login: 'helper[bot]',
		type: 'Bot',
		avatar_url: 'https://example.com/h',
		html_url: 'https://github.com/helper',
		contributions: 3
	}
]);

assert.deepEqual(normalized, [
	{
		login: 'alice',
		avatar_url: 'https://example.com/a',
		html_url: 'https://github.com/alice',
		contributions: 5
	},
	{
		login: 'bob',
		avatar_url: 'https://example.com/b',
		html_url: 'https://github.com/bob',
		contributions: 2
	}
]);

console.log('Catalog-contributor filter checks passed.');
