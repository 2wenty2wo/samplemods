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

	/** @param {string | number | null | undefined} value */
	function formatShortDate(value) {
		if (!value) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	}

	const fullDate = $derived(formatDate(rel.published_at));
	const shortDate = $derived(formatShortDate(rel.published_at));
</script>

{#if compact}
	<article class="release-row is-compact hw-band-chip" style="--pad-glow: {glow}; --chip-accent: {glow}">
		<!-- The whole row is one link to the entry's releases section on samplemods.com. -->
		<a class="compact-grid" href="{base}{rel.entryPath}#releases">
			<div class="release-thumb-link compact-thumb">
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
			</div>

			<span class="release-entry-link compact-name" title={rel.entryName}>
				{rel.entryName}
			</span>

			<span class="chip chip-category compact-cat">{sectionSingularLabel(rel.section)}</span>

			<div class="compact-version-wrap">
				<span class="screen-badge date compact-tag" title={rel.tag}>{rel.tag}</span>
				{#if rel.prerelease}
					<span class="badge-status beta compact-prerelease">Pre-release</span>
				{/if}
			</div>

			{#if fullDate}
				<time class="release-pub-date compact-date" datetime={rel.published_at ?? ''}>
					<span class="date-full">{fullDate}</span>
					<span class="date-short">{shortDate}</span>
				</time>
			{/if}
		</a>
	</article>
{:else}
	<article class="release-row" style="--pad-glow: {glow}">
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
						<a class="release-entry-link" href="{base}{rel.entryPath}" title={rel.entryName}>
							{rel.entryName}
						</a>
						<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
						{#if rel.html_url}
							<a
								class="screen-badge date release-tag-link"
								href={rel.html_url}
								target="_blank"
								rel="noopener noreferrer"
								title={rel.tag}
							>
								{rel.tag}
							</a>
						{:else}
							<span class="screen-badge date" title={rel.tag}>{rel.tag}</span>
						{/if}
						{#if rel.prerelease}
							<span class="badge-status beta">Pre-release</span>
						{/if}
						{#if fullDate}
							<time class="release-pub-date" datetime={rel.published_at ?? ''}>{fullDate}</time>
						{/if}
					</div>

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

				{#if rel.excerpt && rel.body_html?.trim()}
					<p class="release-excerpt">{rel.excerpt}</p>
				{/if}
			</div>
		</div>

		{#if rel.body_html?.trim()}
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
{/if}

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
		width: 100%;
		display: grid;
		padding: 0.25rem 0.6rem;
		gap: 0;
		background: var(--mpc-body-light);
		border: 1.5px solid #282b34;
		border-bottom: 3px solid var(--chip-accent, var(--pad-glow));
		border-radius: 5px;
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.65),
			0 2px 0 #1b1d24;
	}

	.release-row.is-compact:hover {
		background: #f2f0ec;
	}

	.compact-grid {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}

	.compact-thumb {
		margin-right: 0.15rem;
	}

	.compact-name {
		min-width: 0;
		max-width: 34ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.compact-cat {
		flex-shrink: 0;
	}

	.compact-version-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}

	.compact-tag {
		display: inline-block;
		max-width: 24ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: middle;
	}

	.compact-prerelease {
		flex-shrink: 0;
	}

	.compact-date {
		margin-left: auto;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.date-short {
		display: none;
	}

	.release-row-main {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
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

		.release-row-main {
			align-items: flex-start;
			gap: 0.65rem;
		}

		.release-bezel {
			width: 56px;
		}
	}

	@media (max-width: 560px) {
		.release-row.is-compact {
			padding: 0.42rem 0.6rem;
		}

		.compact-grid {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-rows: auto auto;
			column-gap: 0.55rem;
			row-gap: 0.25rem;
			align-items: center;
		}

		.compact-thumb {
			grid-column: 1;
			grid-row: 1 / span 2;
			margin-right: 0;
		}

		.is-compact .release-bezel {
			width: 56px;
			height: 42px;
		}

		.compact-name {
			grid-column: 2;
			grid-row: 1;
			max-width: none;
			font-size: 0.94rem;
		}

		.compact-cat {
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
		}

		.compact-version-wrap {
			grid-column: 2;
			grid-row: 2;
			justify-self: start;
			max-width: 100%;
		}

		.compact-tag {
			max-width: 180px;
		}

		.compact-date {
			grid-column: 3;
			grid-row: 2;
			justify-self: end;
			margin-left: 0;
			font-size: 0.72rem;
		}

		.date-full {
			display: none;
		}

		.date-short {
			display: inline;
		}
	}
</style>
