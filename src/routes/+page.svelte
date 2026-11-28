<script>
	import { tick } from 'svelte';
	import autoAnimate from '@formkit/auto-animate';
	import { afterNavigate } from '$app/navigation';
	import { base } from '$app/paths';
	import mods from '$lib/data.json';
	import catalogContributors from '../../data/contributors.json';
	import { SITE_NAME } from '$lib/site.js';
	import SeoHead from '$lib/SeoHead.svelte';
	import { absoluteUrl, defaultShareImage } from '$lib/seo.js';
	import {
		SECTIONS,
		sectionFromParam,
		sectionSingular,
		FIRMWARE_FILTERS,
		firmwareFromParam,
		firmwareFilterParam
	} from '$lib/categories.js';
	import HomeHero from '$lib/components/HomeHero.svelte';
	import LatestReleasesStrip from '$lib/components/LatestReleasesStrip.svelte';
	import CatalogFilterBar from '$lib/components/CatalogFilterBar.svelte';
	import EntryCard from '$lib/components/EntryCard.svelte';
	import ContributorsBand from '$lib/components/ContributorsBand.svelte';
	import { formatCatalogDate } from '$lib/format-date.js';

	let { data } = $props();
	const latestReleases = $derived(data?.latestReleases ?? []);
	const newEntries = $derived(data?.newEntries ?? []);

	const homeTitle = `${SITE_NAME}: mods, apps, games & tools for the Akai MPC Sample`;
	const homeDescription = `${SITE_NAME}: community catalog of custom firmware mods, apps, games, tools, guides, and developer libraries for the Akai MPC Sample.`;

	const contributors = Array.isArray(catalogContributors)
		? catalogContributors
		: (catalogContributors?.contributors ?? []);
	const contributorCount = contributors.length;
	const contributorPeopleLabel =
		contributorCount === 1 ? '1 person who built this catalog' : `${contributorCount} people who built this catalog`;

	let query = $state('');
	let section = $state('');
	let firmware = $state('');
	let sort = $state('name');
	let ready = false;
	/** @type {import('@formkit/auto-animate').AnimationController | undefined} */
	let gridAnim;

	/** @param {HTMLElement} el */
	function animateGrid(el) {
		gridAnim = autoAnimate(el, { duration: 200, easing: 'ease-out' });
		if (!ready && gridAnim.isEnabled()) gridAnim.disable();
		return gridAnim;
	}

	/** Track image URLs whose naturalWidth <= 400 so 320×240 captures render pixelated */
	let pixelatedUrls = $state(/** @type {Record<string, boolean>} */ ({}));

	const totalMods = mods.length;
	const sectionCounts = Object.fromEntries(
		SECTIONS.map((s) => [s, mods.filter((m) => m.section === s).length])
	);
	const firmwareCounts = Object.fromEntries(
		FIRMWARE_FILTERS.map((fw) => [
			fw,
			mods.filter((m) => (m.firmware_status ?? 'none') === fw).length
		])
	);
	const totalAuthors = new Set(mods.map((m) => m.author)).size;
	const latestUpdateTimestamp = mods.reduce((max, m) => {
		const t = m.pushed_at ? Date.parse(m.pushed_at) : 0;
		return t > max ? t : max;
	}, 0);

	afterNavigate(async () => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		section = sectionFromParam(params.get('section'));
		firmware = firmwareFromParam(params.get('fw'));
		if (!ready) {
			await tick();
			ready = true;
			if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				gridAnim?.enable();
			}
		}
	});

	/** @param {string} next */
	function selectSection(next) {
		section = next;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (next) {
				url.searchParams.set('section', sectionSingular(next));
			} else {
				url.searchParams.delete('section');
			}
			window.history.replaceState(window.history.state, '', url);
		}
	}

	/** @param {string} next */
	function selectFirmware(next) {
		firmware = next;
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (next) {
				url.searchParams.set('fw', firmwareFilterParam(next));
			} else {
				url.searchParams.delete('fw');
			}
			window.history.replaceState(window.history.state, '', url);
		}
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		let list = mods.filter((mod) => {
			if (section && mod.section !== section) return false;
			if (firmware && (mod.firmware_status ?? 'none') !== firmware) return false;
			if (!q) return true;
			const hay = [
				mod.name,
				mod.description,
				mod.author,
				mod.firmware ?? '',
				mod.firmware_label ?? '',
				...(mod.tags ?? [])
			]
				.join(' ')
				.toLowerCase();
			return hay.includes(q);
		});

		list = [...list].sort((a, b) => {
			if (sort === 'stars') {
				return (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name);
			}
			if (sort === 'updated') {
				const at = a.pushed_at ? Date.parse(a.pushed_at) : 0;
				const bt = b.pushed_at ? Date.parse(b.pushed_at) : 0;
				return bt - at || a.name.localeCompare(b.name);
			}
			return a.name.localeCompare(b.name);
		});

		return list;
	});

	/** @param {string | number | null | undefined} value */
	function formatUpdated(value) {
		return formatCatalogDate(value);
	}

	/** @param {Event} e @param {string | null} src */
	function onScreenImageLoad(e, src) {
		if (!src) return;
		const img = /** @type {HTMLImageElement} */ (e.currentTarget);
		if (img.naturalWidth > 0 && img.naturalWidth <= 400) {
			pixelatedUrls[src] = true;
		}
	}
</script>

<SeoHead
	title={homeTitle}
	description={homeDescription}
	url={absoluteUrl('/', base)}
	image={defaultShareImage(base)}
/>

<HomeHero
	{totalMods}
	{totalAuthors}
	latestUpdateLabel={formatUpdated(latestUpdateTimestamp)}
	bind:query
/>

<LatestReleasesStrip releases={latestReleases} {newEntries} />

<div class="wrap" id="catalog">
	<CatalogFilterBar
		{section}
		{firmware}
		bind:sort
		{totalMods}
		{sectionCounts}
		{firmwareCounts}
		filteredCount={filtered.length}
		bind:query
		{selectSection}
		{selectFirmware}
	/>

	{#if filtered.length === 0}
		<div class="empty-state">
			<p class="empty-title">No entries match those filters.</p>
			<p class="empty-sub">Try clearing your search query or switching back to All sections.</p>
		</div>
	{:else}
		<ul class="card-grid" use:animateGrid>
			{#each filtered as mod (mod.id)}
				<li class="card-item">
					<EntryCard {mod} {pixelatedUrls} {onScreenImageLoad} />
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if contributorCount > 0}
	<ContributorsBand {contributors} {contributorPeopleLabel} />
{/if}

<style>
.empty-state {
		padding: 2.5rem 1.5rem;
		background: var(--mpc-body-mid);
		border: 2px dashed var(--mpc-body-recess);
		border-radius: var(--radius);
		text-align: center;
	}

.empty-title {
		margin: 0 0 0.35rem;
		font-weight: 700;
		font-size: 1.05rem;
	}

.empty-sub {
		margin: 0;
		font-size: 0.875rem;
		color: var(--mpc-silkscreen-muted);
	}

.card-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 275px), 1fr));
		gap: 1.05rem;
		align-items: stretch;
	}

.card-item {
		display: flex;
	}
</style>
