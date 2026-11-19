<script>
	import { base } from '$app/paths';
	import {
		sectionGlow,
		sectionSingularLabel,
		initials,
		hostnameOf
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';
	import EntryProse from '$lib/components/EntryProse.svelte';

	/** @type {{
	 *   rel: {
	 *     key: string,
	 *     entryId: string,
	 *     entryName: string,
	 *     entryPath: string,
	 *     section: string,
	 *     status: string | null,
	 *     repo: string | null,
	 *     thumb: { kind: 'shot' | 'logo' | 'splash', src: string | null },
	 *     tag: string,
	 *     name: string | null,
	 *     published_at: string | null,
	 *     html_url: string | null,
	 *     body_html: string,
	 *     excerpt: string,
	 *     prerelease: boolean,
	 *     truncated: boolean
	 *   },
	 *   compact?: boolean
	 * }} */
	let { rel, compact = false } = $props();

	const thumbSrc = $derived(assetUrl(rel.thumb?.src));
	const glow = $derived(sectionGlow(rel.section));

	/** @param {string | number | null | undefined} value */
	function formatDate(value) {
		if (!value) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<article class="release-row" class:is-compact={compact} style="--pad-glow: {glow}">
	<div class="release-row-main">
		<a class="release-thumb-link" href="{base}{rel.entryPath}" aria-label={rel.entryName}>
			<div class="bezel-screen release-bezel">
				{#if thumbSrc}
					<img
						class="screen-img"
						class:is-logo={rel.thumb?.kind === 'logo'}
						src={thumbSrc}
						alt=""
						loading="lazy"
					/>
				{:else}
					<span class="mini-initials">{initials(rel.entryName)}</span>
				{/if}
			</div>
		</a>

		<div class="release-row-info">
			<div class="release-row-header">
				<div class="release-row-title-group">
					<a class="release-entry-link" href="{base}{rel.entryPath}">{rel.entryName}</a>
					<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
					{#if rel.html_url}
						<a
							class="screen-badge date release-tag-link"
							href={rel.html_url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{rel.tag}
						</a>
					{:else}
						<span class="screen-badge date">{rel.tag}</span>
					{/if}
					{#if rel.prerelease}
						<span class="badge-status beta">Pre-release</span>
					{/if}
					{#if !compact && formatDate(rel.published_at)}
						<span class="release-pub-date">{formatDate(rel.published_at)}</span>
					{/if}
				</div>

				{#if compact && formatDate(rel.published_at)}
					<span class="release-pub-date is-right">{formatDate(rel.published_at)}</span>
				{:else if !compact && rel.html_url}
					<a
						class="release-ext-link"
						href={rel.html_url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{rel.repo ? 'Release on GitHub ↗' : `Download${hostnameOf(rel.html_url) ? ` on ${hostnameOf(rel.html_url)}` : ''} ↗`}
					</a>
				{/if}
			</div>

			{#if !compact && rel.excerpt && rel.body_html?.trim()}
				<p class="release-excerpt">{rel.excerpt}</p>
			{/if}
		</div>
	</div>

	{#if !compact && rel.body_html?.trim()}
		<details class="release-details">
			<summary class="release-summary">
				<span class="release-summary-label">
					<span class="release-caret" aria-hidden="true"></span>
					<span>Release notes</span>
				</span>
				{#if rel.truncated}
					<span class="trunc-badge">Truncated</span>
				{/if}
			</summary>
			<div class="release-notes-box">
				<EntryProse html={rel.body_html} className="release-prose" />
			</div>
			<div class="release-notes-footer">
				{#if rel.truncated}
					<span class="release-truncated-text">Truncated ·</span>
				{/if}
				{#if rel.html_url}
					<a
						class="release-ext-link"
						href={rel.html_url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{rel.repo ? 'Release on GitHub ↗' : `Download${hostnameOf(rel.html_url) ? ` on ${hostnameOf(rel.html_url)}` : ''} ↗`}
					</a>
				{/if}
			</div>
		</details>
	{/if}
</article>

<style>
	.release-row {
		background: var(--mpc-body-mid);
		border: 2px solid #282b34;
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 3px 0 #1b1d24;
		padding: 0.8rem 1rem;
		display: grid;
		gap: 0.65rem;
	}

	.release-row.is-compact {
		padding: 0.25rem 0.6rem;
		gap: 0;
	}

	.release-row-main {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.is-compact .release-row-main {
		gap: 0.6rem;
	}

	.release-thumb-link {
		flex-shrink: 0;
		text-decoration: none;
		border-radius: 5px;
	}

	.release-bezel {
		width: 72px;
		border-width: 2px;
	}

	.is-compact .release-bezel {
		width: 48px;
		height: 36px;
	}

	.mini-initials {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.85rem;
		color: var(--mpc-screen-yellow);
	}

	.release-row-info {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
		flex: 1;
	}

	.release-row-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 0.85rem;
	}

	.release-row-title-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.release-entry-link {
		font-family: var(--font-display);
		font-weight: 800;
		font-stretch: 110%;
		font-variation-settings: 'wdth' 110, 'wght' 800;
		font-size: 0.98rem;
		line-height: 1.2;
		color: var(--mpc-pad-text);
		text-decoration: none;
	}

	.release-entry-link:hover {
		color: var(--mpc-accent-red);
		text-decoration: underline;
	}

	.release-tag-link {
		text-decoration: none;
	}

	.release-pub-date {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: var(--mpc-silkscreen-muted);
	}

	.release-pub-date.is-right {
		margin-left: auto;
		white-space: nowrap;
	}

	.release-ext-link {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--mpc-accent-red);
		white-space: nowrap;
	}

	.release-excerpt {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.4;
		color: #2c2e36;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.release-details {
		background: #f4f2ef;
		border: 1.5px solid #b8b4ad;
		border-radius: 5px;
		overflow: hidden;
	}

	.release-summary {
		list-style: none;
		padding: 0.45rem 0.8rem;
		background: #e8e5e0;
		font-family: var(--font-sans);
		font-size: 0.74rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--mpc-silkscreen);
		cursor: pointer;
		user-select: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		transition: background 120ms ease, color 120ms ease;
	}

	.release-summary::-webkit-details-marker {
		display: none;
	}

	.release-summary:hover {
		background: #dedad3;
		color: var(--mpc-pad-text);
	}

	.release-summary-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.release-caret::before {
		content: '▸';
		display: inline-block;
		font-size: 0.85rem;
		line-height: 1;
		color: var(--mpc-accent-red);
	}

	.release-details[open] .release-caret::before {
		content: '▾';
	}

	.release-details[open] .release-summary {
		border-bottom: 1px solid #c9c5be;
	}

	.trunc-badge {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		padding: 0.1rem 0.38rem;
		border-radius: 3px;
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-yellow);
	}

	.release-notes-box {
		padding: 0.85rem 1rem;
		max-height: 340px;
		overflow-y: auto;
	}

	.release-notes-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.4rem;
		padding: 0.45rem 0.85rem;
		background: #e6e2dc;
		border-top: 1px solid #c9c5be;
		font-family: var(--font-mono);
		font-size: 0.74rem;
	}

	.release-truncated-text {
		color: var(--mpc-silkscreen-muted);
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.release-row {
			padding: 0.65rem 0.75rem;
		}

		.release-row.is-compact {
			padding: 0.4rem 0.6rem;
		}

		.release-row-main {
			align-items: flex-start;
			gap: 0.65rem;
		}

		.is-compact .release-row-main {
			align-items: center;
			gap: 0.55rem;
		}

		.release-bezel {
			width: 56px;
		}

		.is-compact .release-bezel {
			width: 53px;
			height: 40px;
		}

		.release-pub-date.is-right {
			margin-left: 0;
		}
	}
</style>
