<script>
import { base } from '$app/paths';
	import {
		sectionGlow,
		sectionSingularLabel,
		entryPath,
		initials
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	/** @type {{
	 *   mod: any,
	 *   byId: Record<string, any>,
	 *   compatibleIds: string[],
	 *   launcherIds: string[]
	 * }} */
	let { mod, byId, compatibleIds, launcherIds } = $props();

	/** @param {{ logo?: string | null, screenshots?: string[] }} entry */
	function miniCardMedia(entry) {
		if (entry.screenshots?.length) {
			return { kind: 'shot', src: assetUrl(entry.screenshots[0]) };
		}
		if (entry.logo) {
			return { kind: 'logo', src: assetUrl(entry.logo) };
		}
		return { kind: 'splash', src: null };
	}
</script>

{#snippet relatedMiniCards(ids)}
	<ul class="mini-card-list">
		{#each ids as id}
			{@const rel = byId[id]}
			<li>
				{#if rel}
					{@const media = miniCardMedia(rel)}
					<a
						class="pad-card mini-pad-card"
						href="{base}{entryPath(rel)}"
						style="--pad-glow: {sectionGlow(rel.section)}"
					>
						<div class="bezel-screen mini-bezel">
							{#if media.src}
								<img
									class="screen-img"
									class:is-logo={media.kind === 'logo'}
									src={media.src}
									alt=""
									loading="lazy"
								/>
							{:else}
								<span class="mini-initials">{initials(rel.name)}</span>
							{/if}
						</div>
						<div class="mini-card-info">
							<div class="mini-card-tags">
								<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
								{#if rel.status}
									<span class="badge-status {rel.status}">{rel.status}</span>
								{/if}
							</div>
							<p class="mini-card-title">{rel.name}</p>
						</div>
					</a>
				{:else}
					<div class="pad-card mini-pad-card">
						<code>{id}</code>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#if compatibleIds.length}
	<section class="detail-section">
		<h2 class="silk-heading">Compatible with</h2>
		{@render relatedMiniCards(compatibleIds)}
	</section>
{/if}

{#if launcherIds.length}
	<section class="detail-section">
		<h2 class="silk-heading">Works with</h2>
		{@render relatedMiniCards(launcherIds)}
	</section>
{/if}

{#if mod.requires?.length}
	<section class="detail-section">
		<h2 class="silk-heading">Requires</h2>
		{@render relatedMiniCards(mod.requires)}
	</section>
{/if}

{#if mod.required_by?.length}
	<section class="detail-section">
		<h2 class="silk-heading">Required by</h2>
		{@render relatedMiniCards(mod.required_by)}
	</section>
{/if}

{#if mod.based_on?.length}
	<section class="detail-section">
		<h2 class="silk-heading">Based on</h2>
		{@render relatedMiniCards(mod.based_on)}
	</section>
{/if}

{#if mod.derived?.length}
	<section class="detail-section">
		<h2 class="silk-heading">Builds based on this</h2>
		{@render relatedMiniCards(mod.derived)}
	</section>
{/if}

<style>
/* —— Related Mini-Cards (Requires / Required by) —— */

.mini-card-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.65rem;
	}

.mini-pad-card {
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		padding: 0.65rem 0.75rem;
		gap: 0.75rem;
	}

.mini-bezel {
		width: 72px;
		flex-shrink: 0;
		border-width: 2px;
	}

.mini-initials {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.9rem;
		color: var(--mpc-screen-yellow);
	}

.mini-card-info {
		display: grid;
		gap: 0.28rem;
		min-width: 0;
		justify-items: start;
	}

.mini-card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.28rem;
		align-items: center;
	}

.mini-card-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-stretch: 110%;
		font-variation-settings: 'wdth' 110, 'wght' 800;
		font-size: 0.95rem;
		line-height: 1.2;
		color: var(--mpc-pad-text);
		overflow-wrap: anywhere;
	}
</style>
