<script>
import { base } from '$app/paths';
	import CheckIcon from '$lib/CheckIcon.svelte';
	import {
		sectionGlow,
		sectionSingularLabel,
		entryPath,
		initials
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	/** @typedef {{ checked_by: string, versions: string, notes: string }} CompatRow */

	/** @type {{
	 *   mod: any,
	 *   byId: Record<string, any>,
	 *   compatibleIds: string[],
	 *   launcherIds: string[],
	 *   sampleBootCompat?: { source?: string, updated?: string, entries: Record<string, CompatRow> }
	 * }} */
	let { mod, byId, compatibleIds, launcherIds, sampleBootCompat } = $props();

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

{#snippet compatibilityCards(ids, compat)}
	{@const rows = compat?.entries ?? {}}
	<ul class="mini-card-list compat-card-list">
		{#each ids as id}
			{@const rel = byId[id]}
			{@const row = rows[id]}
			<li>
				{#if rel}
					{@const media = miniCardMedia(rel)}
					<a
						class="pad-card mini-pad-card compat-pad-card"
						href="{base}{entryPath(rel)}"
						style="--pad-glow: {sectionGlow(rel.section)}"
					>
						<div class="bezel-screen mini-bezel compat-bezel">
							{#if media.src}
								<img
									class="screen-img"
									class:is-logo={media.kind === 'logo'}
									src={media.src}
									alt=""
									loading="lazy"
								/>
							{:else}
								<span class="mini-initials compat-initials">{initials(rel.name)}</span>
							{/if}
						</div>
						<div class="compat-info">
							<div class="compat-head">
								<div class="compat-title-group">
									<p class="mini-card-title compat-title">{rel.name}</p>
									<span class="chip chip-category compat-chip">{sectionSingularLabel(rel.section)}</span>
									{#if rel.status}
										<span class="badge-status {rel.status} compat-chip">{rel.status}</span>
									{/if}
								</div>
								{#if row}
									<span class="compat-version">
										{#if row.checked_by === 'Tested'}
											<CheckIcon />{row.versions}
										{:else}
											{[row.checked_by, row.versions].filter(Boolean).join(' ')}
										{/if}
									</span>
								{/if}
							</div>
							{#if row?.notes}
								<p class="compat-note">{row.notes}</p>
							{/if}
						</div>
					</a>
				{:else}
					<div class="pad-card mini-pad-card compat-pad-card">
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
		{@render compatibilityCards(compatibleIds, mod.id === 'sampleboot' ? sampleBootCompat : undefined)}
	</section>
{/if}

{#if launcherIds.length}
	<section class="detail-section">
		<h2 class="silk-heading">Works with</h2>
		{@render compatibilityCards(launcherIds, mod.id === 'sampleboot' ? undefined : sampleBootCompat)}
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
/* —— Related Mini-Cards (Requires / Required by / Based on) —— */

.mini-card-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.65rem;
	}

.mini-card-list > li {
		display: flex;
		min-width: 0;
	}

.mini-pad-card {
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		padding: 0.65rem 0.75rem;
		gap: 0.75rem;
		height: 100%;
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

/* —— Compact Pad-Cards (Compatible with / Works with) —— */

.compat-card-list {
		gap: 0.45rem;
	}

.compat-pad-card {
		padding: 0.42rem 0.6rem;
		gap: 0.6rem;
	}

.compat-bezel {
		width: 48px;
		border-width: 1.5px;
		border-radius: 4px;
	}

.compat-initials {
		font-size: 0.72rem;
	}

.compat-info {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 0.14rem;
	}

.compat-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.16rem 0.5rem;
		min-width: 0;
	}

.compat-title-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.22rem 0.38rem;
		min-width: 0;
	}

.compat-title {
		font-size: 0.88rem;
		line-height: 1.15;
	}

.compat-chip {
		flex-shrink: 0;
		font-size: 0.62rem;
		padding: 0.06rem 0.34rem;
		border-bottom-width: 2px;
		line-height: 1.15;
		position: relative;
		top: -0.05em;
	}

.compat-version {
		font-family: var(--font-screen);
		font-size: 0.72rem;
		line-height: 1.3;
		color: var(--mpc-silkscreen-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

.compat-version :global(.check-icon) {
		color: #147a30;
	}

.compat-note {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		line-height: 1.35;
		color: var(--mpc-silkscreen-muted);
		overflow-wrap: anywhere;
	}
</style>
