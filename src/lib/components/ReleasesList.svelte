<script>
	import CaretIcon from '$lib/CaretIcon.svelte';
	import ExternalIcon from '$lib/ExternalIcon.svelte';
import { hostnameOf } from '$lib/categories.js';
	import EntryProse from '$lib/components/EntryProse.svelte';

	/** @type {{
	 *   mod: any,
	 *   releases: any[],
	 *   formatUpdated: (value: string | number | null | undefined) => string | null
	 * }} */
	let { mod, releases, formatUpdated } = $props();
</script>

{#if releases.length}
	<section id="releases" class="detail-section" aria-label="Recent releases">
		<h2 class="silk-heading">Recent releases</h2>
		<ul class="release-list">
			{#each releases as rel, i (rel.tag)}
				<li class="release-card">
					<div class="release-header">
						<div class="release-title-group">
							{#if rel.html_url && mod.status !== 'removed'}
								<a
									class="screen-badge date release-tag-link"
									href={rel.html_url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{rel.label ?? rel.tag}
								</a>
							{:else}
								<span class="screen-badge date">{rel.label ?? rel.tag}</span>
							{/if}
							{#if rel.name && rel.name !== (rel.label ?? rel.tag)}
								<span class="release-title">{rel.name}</span>
							{/if}
							{#if formatUpdated(rel.published_at)}
								<span class="release-pub-date">{formatUpdated(rel.published_at)}</span>
							{/if}
						</div>
						{#if rel.html_url && mod.status !== 'removed'}
							<a
								class="release-ext-link"
								href={rel.html_url}
								target="_blank"
								rel="noopener noreferrer"
							>
								{#if mod.repo}
									Release on GitHub&nbsp;<ExternalIcon />
								{:else}
									Download{hostnameOf(rel.html_url) ? ` on ${hostnameOf(rel.html_url)}` : ''}&nbsp;<ExternalIcon />
								{/if}
							</a>
						{/if}
					</div>

					{#if rel.body_html?.trim()}
						<details class="release-details" open={i === 0}>
							<summary class="release-summary">
								<span class="release-summary-label">
									<CaretIcon />
									<span>Release notes</span>
								</span>
								{#if rel.truncated}
									<span class="trunc-badge">Truncated</span>
								{/if}
							</summary>
							<div class="release-notes-box">
								<EntryProse html={rel.body_html} className="release-prose" />
							</div>
							{#if rel.truncated && mod.status !== 'removed' && rel.html_url}
								<p class="release-truncated-note">
									Truncated,
									<a href={rel.html_url} target="_blank" rel="noopener noreferrer">
										see full notes on GitHub&nbsp;<ExternalIcon />
									</a>
								</p>
							{/if}
						</details>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
/* —— Recent Releases Section —— */

.release-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.85rem;
		max-width: 72ch;
	}

.release-card {
		background: var(--mpc-body-mid);
		border: 2px solid #282b34;
		border-left: 4px solid var(--pad-glow, var(--mpc-btn-orange));
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 3px 0 #1b1d24;
		padding: 0.9rem 1.1rem;
		display: grid;
		gap: 0.65rem;
	}

.release-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

.release-title-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

.release-tag-link {
		text-decoration: none;
	}

.release-title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.98rem;
		color: var(--mpc-pad-text);
	}

.release-pub-date {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--mpc-silkscreen-muted);
	}

.release-ext-link {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--mpc-accent-red);
	}

.release-details {
		background: #f4f2ef;
		border: 1.5px solid #b8b4ad;
		border-radius: 5px;
		overflow: hidden;
	}

.release-summary {
		list-style: none;
		padding: 0.5rem 0.85rem;
		background: #e8e5e0;
		font-family: var(--font-sans);
		font-size: 0.76rem;
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

.release-summary-label :global(.caret-icon) {
		width: 0.85rem;
		height: 0.85rem;
		color: var(--mpc-accent-red);
		flex-shrink: 0;
	}

.release-details[open] .release-summary-label :global(.caret-icon) {
		transform: rotate(90deg);
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
		padding: 0.9rem 1rem;
		max-height: 320px;
		overflow-y: auto;
	}

.release-truncated-note {
		margin: 0;
		padding: 0.55rem 1rem;
		background: #e6e2dc;
		border-top: 1px solid #c9c5be;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--mpc-silkscreen);
	}

@media (max-width: 960px) {
	.release-list {
		max-width: 100%;
	}
}
</style>
