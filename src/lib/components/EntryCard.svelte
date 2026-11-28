<script>
import { base } from '$app/paths';
	import StarIcon from '$lib/StarIcon.svelte';
	import {
		sectionGlow,
		sectionSingularLabel,
		entryPath,
		installLabel,
		priceBadge
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';
	import { formatCatalogDate } from '$lib/format-date.js';

	/** @type {{
	 *   mod: any,
	 *   pixelatedUrls: Record<string, boolean>,
	 *   onScreenImageLoad: (e: Event, src: string | null) => void
	 * }} */
	let { mod, pixelatedUrls, onScreenImageLoad } = $props();

	/**
	 * Priority: first screenshot -> logo centred on black -> generated splash fallback.
	 * @param {{ logo?: string | null, screenshots?: string[] }} entry
	 */
	function cardScreenMedia(entry) {
		if (entry.screenshots?.length) {
			return { kind: 'shot', src: assetUrl(entry.screenshots[0]) };
		}
		if (entry.logo) {
			return { kind: 'logo', src: assetUrl(entry.logo) };
		}
		return { kind: 'splash', src: null };
	}

	/** @param {string | number | null | undefined} value */
	function formatUpdated(value) {
		return formatCatalogDate(value);
	}

	const media = $derived(cardScreenMedia(mod));
	const install = $derived(installLabel(mod.install));
	const fwClass = $derived(
		mod.firmware_status === '1.4'
			? 'fw-1-4'
			: mod.firmware_status === '1.3'
				? 'fw-1-3'
				: ''
	);
</script>

<a
	class="pad-card"
	href="{base}{entryPath(mod)}"
	style="--pad-glow: {sectionGlow(mod.section)}"
	aria-labelledby="card-section-{mod.id} card-title-{mod.id}"
>
	<!-- 4:3 Glossy Black Bezel Screen Display -->
	<div class="bezel-screen card-screen">
		{#if media.src}
			<img
				class="screen-img"
				class:is-logo={media.kind === 'logo'}
				class:pixelated={media.kind === 'shot' && pixelatedUrls[media.src]}
				src={media.src}
				alt=""
				loading="lazy"
				onload={(e) => onScreenImageLoad(e, media.src)}
			/>
			{#if mod.firmware_status && mod.firmware_label}
				<span class="fw-chip fw-chip-corner {fwClass}">
					{mod.firmware_label}
				</span>
			{/if}
		{:else}
			<div class="splash-fallback">
				<div class="splash-topbar">
					<span class="splash-cat" aria-hidden="true">{sectionSingularLabel(mod.section)}</span>
					{#if mod.firmware_status && mod.firmware_label}
						<span class="fw-chip {fwClass}">
							{mod.firmware_label}
						</span>
					{/if}
				</div>
				<p class="splash-title" aria-hidden="true">{mod.name}</p>
				<div class="splash-footer" aria-hidden="true">
					<span class="splash-bar"></span>
					<span class="splash-author">{mod.author}</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="card-badges">
		<span id="card-section-{mod.id}" class="chip chip-category">{sectionSingularLabel(mod.section)}</span>
		{#if install}
			<span class="chip chip-install">{install}</span>
		{/if}
		{#if priceBadge(mod.price)}
			<span class="chip chip-price">{priceBadge(mod.price)}</span>
		{/if}
		{#if mod.status}
			<span class="badge-status {mod.status}">{mod.status}</span>
		{/if}
	</div>

	<div class="card-body">
		<h2 id="card-title-{mod.id}" class="card-title">{mod.name}</h2>
		<p class="card-desc">{mod.description}</p>
	</div>

	<div class="card-footer">
		<span class="card-author">{mod.author}</span>
		<div class="card-readout">
			{#if mod.stars != null}
				<span class="screen-badge stars">
					<StarIcon />{mod.stars}<span class="visually-hidden">
						{mod.stars === 1 ? ' star' : ' stars'}</span
					>
				</span>
			{/if}
			{#if formatUpdated(mod.pushed_at)}
				<span class="screen-badge date">{formatUpdated(mod.pushed_at)}</span>
			{/if}
		</div>
	</div>
</a>

<style>
.card-screen {
		width: 100%;
	}

.card-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

.card-body {
		display: grid;
		gap: 0.35rem;
		margin-bottom: auto;
	}

.card-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-stretch: 110%;
		font-variation-settings: 'wdth' 110, 'wght' 800;
		font-size: 1.08rem;
		line-height: 1.22;
		color: var(--mpc-pad-text);
		overflow-wrap: anywhere;
	}

.card-desc {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: #2c2e36;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgb(0 0 0 / 0.12);
	}

.card-author {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: #2f323b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

.card-readout {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}
</style>
