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
	import { formatCatalogDate } from '$lib/format-date.js';

	/** @typedef {{ checked_by: string, versions: string, notes: string }} CompatRow */

	/** @type {{
	 *   mod: any,
	 *   byId: Record<string, any>,
	 *   compatibleIds: string[],
	 *   launcherIds: string[],
	 *   sampleBootCompat?: { source: string, updated: string, entries: Record<string, CompatRow> }
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

{#snippet compatibilityRows(ids, compat)}
	{@const rows = compat?.entries ?? {}}
	<div class="compat-panel">
		<ul class="compat-list">
			{#each ids as id}
				{@const rel = byId[id]}
				{@const row = rows[id]}
				<li>
					{#if rel}
						{@const media = miniCardMedia(rel)}
						<a
							class="compat-row"
							href="{base}{entryPath(rel)}"
							style="--pad-glow: {sectionGlow(rel.section)}"
						>
							<div class="bezel-screen compat-bezel">
								{#if media.src}
									<img
										class="screen-img"
										class:is-logo={media.kind === 'logo'}
										src={media.src}
										alt=""
										loading="lazy"
									/>
								{:else}
									<span class="compat-initials">{initials(rel.name)}</span>
								{/if}
							</div>
							<div class="compat-body">
								<div class="compat-head">
									<span class="compat-name">{rel.name}</span>
									{#if row}
										<span class="compat-version" class:is-tested={row.checked_by === 'Tested'}>
											{#if row.checked_by === 'Tested'}
												<CheckIcon />{row.versions}
											{:else}
												{row.checked_by} {row.versions}
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
						<div class="compat-row">
							<code>{id}</code>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if compat && ids.some((id) => rows[id])}
			{@const date = formatCatalogDate(compat.updated, { locale: 'en-GB', year: undefined })}
			<p class="compat-footer">
				<span class="compat-footer-check"><CheckIcon />tested by SampleBoot</span> · from
				<a href={compat.source}>its README</a>, {date}
			</p>
		{/if}
	</div>
{/snippet}

{#if compatibleIds.length}
	<section class="detail-section">
		<h2 class="silk-heading">Compatible with</h2>
		{@render compatibilityRows(compatibleIds, mod.id === 'sampleboot' ? sampleBootCompat : undefined)}
	</section>
{/if}

{#if launcherIds.length}
	<section class="detail-section">
		<h2 class="silk-heading">Works with</h2>
		{@render compatibilityRows(launcherIds, mod.id === 'sampleboot' ? undefined : sampleBootCompat)}
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
/* —— Compact Screen-Styled Compatibility Rows (Compatible with / Works with) —— */

.compat-panel {
		background: var(--mpc-screen-bg);
		border: 2px solid #262930;
		border-left: 4px solid var(--pad-glow, var(--mpc-screen-yellow));
		border-radius: 6px;
		overflow: hidden;
		box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.65);
	}

.compat-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

.compat-list > li + li {
		border-top: 1px solid #1a1d24;
	}

.compat-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.75rem;
		text-decoration: none;
		color: var(--mpc-screen-text);
		transition: background 100ms ease;
	}

a.compat-row:hover,
a.compat-row:focus-visible {
		background: #12151e;
		color: var(--mpc-screen-white);
	}

.compat-bezel {
		width: 48px;
		flex-shrink: 0;
		border-width: 1.5px;
		border-color: #242834;
		border-radius: 4px;
	}

a.compat-row:hover .compat-bezel,
a.compat-row:focus-visible .compat-bezel {
		border-color: var(--pad-glow, var(--mpc-screen-yellow));
	}

.compat-initials {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.72rem;
		color: var(--mpc-screen-yellow);
	}

.compat-body {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 0.14rem;
	}

.compat-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.12rem 0.6rem;
	}

.compat-name {
		font-family: var(--font-display);
		font-weight: 700;
		font-stretch: 105%;
		font-variation-settings: 'wdth' 105, 'wght' 700;
		font-size: 0.88rem;
		line-height: 1.25;
		color: var(--mpc-screen-white);
		overflow-wrap: anywhere;
	}

a.compat-row:hover .compat-name,
a.compat-row:focus-visible .compat-name {
		color: var(--mpc-screen-yellow);
	}

.compat-version {
		font-family: var(--font-screen);
		font-size: 0.72rem;
		line-height: 1.3;
		color: var(--mpc-screen-grey);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

.compat-version :global(.check-icon) {
		color: var(--mpc-btn-green);
	}

.compat-note {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		line-height: 1.35;
		color: var(--mpc-screen-grey);
		overflow-wrap: anywhere;
	}

.compat-footer {
		margin: 0;
		padding: 0.42rem 0.75rem;
		background: #10131a;
		border-top: 1px solid #1a1d24;
		font-family: var(--font-screen);
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--mpc-screen-grey);
	}

.compat-footer-check :global(.check-icon) {
		color: var(--mpc-btn-green);
	}

.compat-footer a {
		color: var(--mpc-screen-cyan);
	}

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
</style>
