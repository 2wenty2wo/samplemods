<script>
	import autoAnimate from '@formkit/auto-animate';
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/site.js';
	import SeoHead from '$lib/SeoHead.svelte';
	import { absoluteUrl, defaultShareImage } from '$lib/seo.js';
	import { sectionGlow, sectionLabel } from '$lib/categories.js';
	import ReleaseRow from '$lib/components/ReleaseRow.svelte';
	import RssIcon from '$lib/RssIcon.svelte';
	import { formatCatalogDate, utcDayKey } from '$lib/format-date.js';

	let { data } = $props();
	const releases = $derived(data.releases ?? []);

	const FILTER_SECTIONS = ['mods', 'apps', 'games', 'tools'];

	let section = $state('');

	const sectionCounts = $derived(
		Object.fromEntries(
			FILTER_SECTIONS.map((s) => [s, releases.filter((r) => r.section === s).length])
		)
	);

	const filtered = $derived(
		section ? releases.filter((r) => r.section === section) : releases
	);

	let todayUtcDay = $state('');
	let yesterdayUtcDay = $state('');

	$effect(() => {
		const now = new Date();
		todayUtcDay = utcDayKey(now);
		yesterdayUtcDay = utcDayKey(
			new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
		);
	});

	/** @param {string} day */
	function formatDayHeading(day) {
		if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Unknown date';
		if (todayUtcDay && day === todayUtcDay) return 'Today';
		if (yesterdayUtcDay && day === yesterdayUtcDay) return 'Yesterday';
		return (
			formatCatalogDate(day, {
				locale: 'en-GB',
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			}) ?? 'Unknown date'
		);
	}

	const grouped = $derived.by(() => {
		/** @type {Array<{ day: string, label: string, items: typeof releases }>} */
		const groups = [];
		for (const rel of filtered) {
			const day = rel.day || 'Unknown';
			let last = groups[groups.length - 1];
			if (!last || last.day !== day) {
				last = { day, label: formatDayHeading(day), items: [] };
				groups.push(last);
			}
			last.items.push(rel);
		}
		return groups;
	});

	const feedAnimation = { duration: 200, easing: 'ease-out' };
	const title = `Releases · ${SITE_NAME}`;
	const description = `Latest firmware mods, apps, games and tool releases across the ${SITE_NAME} community catalog for the Akai MPC Sample.`;
</script>

<SeoHead
	{title}
	{description}
	url={absoluteUrl('/releases/', base)}
	image={defaultShareImage(base)}
/>

<section class="page-hero-band">
	<div class="page-hero-inner">
		<a class="back-link" href="{base}/">← All entries</a>
		<div class="page-screen-box">
			<p class="page-kicker">RELEASE FEED</p>
			<h1 class="page-title">Latest Releases</h1>
			<p class="page-lead">
				Newest firmware mods, apps, games and companion tool updates across the catalog,
				ordered by release date.
			</p>
			<p class="page-rss">
				<a href="{base}/releases.xml"><RssIcon /> <span>RSS feed</span></a>
			</p>
		</div>
	</div>
</section>

<div class="wrap releases-wrap">
	<section class="filter-bar" aria-label="Filter releases by section">
		<div class="filter-group">
			<span class="silk-label">SECTION</span>
			<div class="hw-buttons" role="group" aria-label="Section">
				<button
					type="button"
					class="hw-btn"
					style="--btn-lit: #FF8A1E"
					aria-pressed={section === ''}
					onclick={() => (section = '')}
				>
					All <span class="btn-count">{releases.length}</span>
				</button>
				{#each FILTER_SECTIONS as cat}
					<button
						type="button"
						class="hw-btn"
						style="--btn-lit: {sectionGlow(cat)}"
						aria-pressed={section === cat}
						onclick={() => (section = cat)}
					>
						{sectionLabel(cat)} <span class="btn-count">{sectionCounts[cat]}</span>
					</button>
				{/each}
			</div>
		</div>
	</section>

	<div class="results-bar">
		<p class="results-count" role="status" aria-live="polite">
			Showing <strong>{filtered.length}</strong> of {releases.length} releases
			{#if section}
				in <strong>{sectionLabel(section)}</strong>
			{/if}
		</p>
		{#if section}
			<button type="button" class="reset-link" onclick={() => (section = '')}>
				Reset filter
			</button>
		{/if}
	</div>

	{#if grouped.length === 0}
		<div class="empty-state">
			<p class="empty-title">No releases found in this section.</p>
		</div>
	{:else}
		<div class="day-groups" use:autoAnimate={feedAnimation}>
			{#each grouped as group (group.day)}
				<section class="detail-section day-section" aria-label={group.label}>
					<h2 class="silk-heading day-heading">{group.label}</h2>
					<ul class="release-feed-list" use:autoAnimate={feedAnimation}>
						{#each group.items as rel (rel.key)}
							<li>
								<ReleaseRow {rel} />
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-hero-band {
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		border-bottom: 4px solid var(--mpc-body-recess);
		padding: 1.15rem 0 1.5rem;
		margin-bottom: 1.5rem;
	}

	.page-hero-inner {
		width: min(920px, 100% - 2rem);
		margin-inline: auto;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 0.75rem;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--mpc-screen-cyan);
		text-decoration: none;
	}

	.page-screen-box {
		background: var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-left: 4px solid var(--mpc-btn-orange);
		border-radius: 8px;
		padding: 1.25rem;
	}

	.page-kicker {
		display: inline-block;
		margin: 0 0 0.7rem;
		padding: 0.2rem 0.6rem;
		border-radius: 1px;
		background: var(--mpc-screen-white);
		color: #000;
		font-family: var(--font-screen);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.page-title {
		margin: 0 0 0.45rem;
		font-family: var(--font-display);
		font-weight: 600;
		font-variation-settings: 'wdth' 100, 'wght' 600;
		font-size: clamp(1.4rem, 3vw, 2rem);
		color: var(--mpc-screen-white);
		letter-spacing: -0.01em;
	}

	.page-lead {
		margin: 0;
		color: var(--mpc-screen-text);
		max-width: 65ch;
	}

	.page-rss {
		margin: 0.75rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}

	.page-rss a {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		color: var(--mpc-screen-white);
		font-weight: 600;
		text-decoration: none;
	}

	.page-rss a span {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.releases-wrap {
		width: min(920px, 100% - 2rem);
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem 1.5rem;
		padding: 0.95rem 1.1rem;
		background: var(--mpc-body-mid);
		border: 1px solid var(--mpc-body-recess);
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 2px 4px rgb(0 0 0 / 0.06);
		margin-bottom: 0.9rem;
	}

	.filter-group {
		display: grid;
		gap: 0.45rem;
		flex: 1 1 100%;
	}

	.hw-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.btn-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1;
		opacity: 0.82;
		padding: 0.14rem 0.34rem;
		border-radius: 3px;
		background: rgb(0 0 0 / 0.22);
	}

	.hw-btn[aria-pressed='true'] .btn-count {
		background: rgb(0 0 0 / 0.16);
		opacity: 0.95;
	}

	.results-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 1.25rem;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--mpc-silkscreen-muted);
	}

	.results-count {
		margin: 0;
	}

	.results-count strong {
		color: var(--mpc-silkscreen);
	}

	.reset-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-block-size: var(--target-size, 24px);
		min-inline-size: var(--target-size, 24px);
		background: none;
		border: none;
		padding: 0.2rem 0.35rem;
		margin: -0.2rem -0.35rem;
		font: inherit;
		font-weight: 700;
		color: var(--mpc-accent-red);
		text-decoration: underline;
		cursor: pointer;
	}

	.day-groups {
		display: grid;
		gap: 1.5rem;
	}

	.day-heading {
		padding-bottom: 0.3rem;
		border-bottom: 1.5px solid var(--mpc-body-recess);
	}

	.release-feed-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.empty-state {
		padding: 2rem 1.5rem;
		background: var(--mpc-body-mid);
		border: 2px dashed var(--mpc-body-recess);
		border-radius: var(--radius);
		text-align: center;
	}

	.empty-title {
		margin: 0;
		font-weight: 700;
	}

	@media (max-width: 640px) {
		.page-hero-inner,
		.releases-wrap {
			width: calc(100% - 1.25rem);
		}

		.filter-bar {
			padding: 0.65rem 0.75rem;
			margin-bottom: 0.65rem;
		}
	}
</style>
