<script>
	import SearchIcon from '$lib/SearchIcon.svelte';
	import {
		SECTIONS,
		sectionGlow,
		sectionLabel,
		sectionExplainer,
		FIRMWARE_FILTERS,
		firmwareFilterLabel,
		firmwareFilterGlow
	} from '$lib/categories.js';

	/** @type {{
	 *   section: string,
	 *   firmware: string,
	 *   sort: string,
	 *   totalMods: number,
	 *   sectionCounts: Record<string, number>,
	 *   firmwareCounts: Record<string, number>,
	 *   filteredCount: number,
	 *   query: string,
	 *   selectSection: (next: string) => void,
	 *   selectFirmware: (next: string) => void,
	 *   onQueryInput?: (next: string) => void
	 * }} */
	let {
		section,
		firmware = '',
		sort = $bindable('name'),
		totalMods,
		sectionCounts,
		firmwareCounts = {},
		filteredCount,
		query = $bindable(''),
		selectSection,
		selectFirmware,
		onQueryInput
	} = $props();

	/** @param {string} next */
	function setQuery(next) {
		query = next;
		onQueryInput?.(next);
	}

	/** @type {HTMLDivElement | null} */
	let fwRockerEl = $state(null);
	let fwPillX = $state(0);
	let fwPillW = $state(0);
	/** Pill measured and painted; button active fill hands off to the pill. */
	let fwPillReady = $state(false);
	/** Transitions enabled only after the first correct position (no load slide). */
	let fwPillAnimate = $state(false);

	const fwPillLit = $derived(firmwareFilterGlow(firmware));

	function measureFwPill() {
		const rocker = fwRockerEl;
		if (!rocker) return;
		const active = rocker.querySelector('.fw-rocker-btn[aria-pressed="true"]');
		if (!(active instanceof HTMLElement)) return;
		fwPillX = active.offsetLeft;
		fwPillW = active.offsetWidth;
	}

	$effect(() => {
		firmware;
		filteredCount;
		totalMods;
		firmwareCounts;
		const rocker = fwRockerEl;
		if (!rocker) return;

		const id = requestAnimationFrame(() => {
			measureFwPill();
			if (!fwPillReady) {
				fwPillReady = true;
				requestAnimationFrame(() => {
					fwPillAnimate = true;
				});
			}
		});
		return () => cancelAnimationFrame(id);
	});

	$effect(() => {
		const rocker = fwRockerEl;
		if (!rocker || typeof ResizeObserver === 'undefined') return;

		const ro = new ResizeObserver(() => measureFwPill());
		ro.observe(rocker);
		for (const btn of rocker.querySelectorAll('.fw-rocker-btn')) {
			ro.observe(btn);
		}
		return () => ro.disconnect();
	});
</script>

<search class="filter-bar" aria-label="Filter and sort entries">
	<div class="deck-top-row">
		<div class="deck-top-head">
			<span class="silk-label">SECTION</span>
			<div class="results-inline">
				<p class="results-count" role="status" aria-live="polite">
					Showing <strong>{filteredCount}</strong> of {totalMods} entries
					{#if section}
						in <strong>{sectionLabel(section)}</strong>
					{/if}
					{#if firmware}
						· <strong>{firmwareFilterLabel(firmware)}</strong>
					{/if}
				</p>
				{#if section || firmware || query}
					<button
						type="button"
						class="reset-link"
						onclick={() => {
							selectSection('');
							selectFirmware('');
							setQuery('');
						}}
					>
						Reset filters
					</button>
				{/if}
			</div>
		</div>

		<div class="section-buttons" role="group" aria-label="Section">
			<button
				type="button"
				class="hw-btn"
				style="--btn-lit: #FF8A1E"
				aria-pressed={section === ''}
				onclick={() => selectSection('')}
			>
				<span class="sec-label">All</span> <span class="btn-count">{totalMods}</span>
			</button>
			{#each SECTIONS as cat}
				<button
					type="button"
					class="hw-btn"
					style="--btn-lit: {sectionGlow(cat)}"
					aria-pressed={section === cat}
					onclick={() => selectSection(cat)}
				>
					{#if cat === 'dev'}
						<span class="sec-label-full">{sectionLabel(cat)}</span>
						<span class="sec-label-short">Dev</span>
					{:else}
						<span class="sec-label">{sectionLabel(cat)}</span>
					{/if}
					<span class="btn-count">{sectionCounts[cat]}</span>
				</button>
			{/each}
		</div>

		{#if section && sectionExplainer(section)}
			<p class="section-explainer" style="--explainer-accent: {sectionGlow(section)}">
				{sectionExplainer(section)}
			</p>
		{/if}
	</div>

	<div class="deck-bottom-row">
		<div class="deck-field search-field">
			<label class="silk-label" for="mod-search">SEARCH CATALOG</label>
			<div class="deck-search-wrap">
				<SearchIcon />
				<input
					id="mod-search"
					type="search"
					value={query}
					oninput={(e) => setQuery(e.currentTarget.value)}
					placeholder="Filter by name, description, tag, author, or firmware…"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="search"
				/>
				{#if query}
					<button type="button" class="search-clear" onclick={() => setQuery('')}>
						Clear
					</button>
				{/if}
			</div>
		</div>

		<div class="deck-field fw-field">
			<span class="silk-label">FIRMWARE</span>
			<div
				class="fw-rocker"
				class:pill-ready={fwPillReady}
				bind:this={fwRockerEl}
				role="group"
				aria-label="Firmware"
			>
				<span
					class="fw-rocker-pill"
					class:animate={fwPillAnimate}
					style="--btn-lit: {fwPillLit}; transform: translateX({fwPillX}px); width: {fwPillW}px;"
					aria-hidden="true"
				></span>
				<button
					type="button"
					class="fw-rocker-btn"
					style="--btn-lit: #FF8A1E"
					aria-pressed={firmware === ''}
					onclick={() => selectFirmware('')}
				>
					<span>All</span> <span class="r-count">{totalMods}</span>
				</button>
				{#each FIRMWARE_FILTERS as fw}
					<button
						type="button"
						class="fw-rocker-btn"
						style="--btn-lit: {firmwareFilterGlow(fw)}"
						aria-pressed={firmware === fw}
						onclick={() => selectFirmware(fw)}
					>
						<span>{firmwareFilterLabel(fw)}</span>
						<span class="r-count">{firmwareCounts[fw] ?? 0}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="deck-field sort-field">
			<label class="silk-label" for="mod-sort">SORT ORDER</label>
			<select id="mod-sort" class="hw-select deck-sort-select" bind:value={sort}>
				<option value="name">Name (A–Z)</option>
				<option value="stars">Stars (High–Low)</option>
				<option value="updated">Recently updated</option>
			</select>
		</div>
	</div>
</search>

<style>
.filter-bar {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: var(--mpc-body-mid);
		border: 1.5px solid #282b34;
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 3px 0 #1b1d24;
		margin-bottom: 1.05rem;
	}

.deck-top-row {
		display: grid;
		gap: 0.42rem;
	}

.deck-top-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.35rem 0.85rem;
	}

.results-inline {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.65rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
		padding: 0.15rem 0.3rem;
		margin: -0.15rem -0.3rem;
		font: inherit;
		font-weight: 700;
		color: var(--mpc-accent-red);
		text-decoration: underline;
		cursor: pointer;
	}

.section-buttons {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 0.4rem;
	}

.section-buttons .hw-btn {
		width: 100%;
		padding: 0.44rem 0.4rem;
		font-size: 0.72rem;
		white-space: nowrap;
	}

.sec-label-short {
		display: none;
	}

.btn-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 700;
		line-height: 1;
		opacity: 0.82;
		padding: 0.13rem 0.32rem;
		border-radius: 3px;
		background: rgb(0 0 0 / 0.22);
	}

.hw-btn[aria-pressed='true'] .btn-count {
		background: rgb(0 0 0 / 0.16);
		opacity: 0.95;
	}

.section-explainer {
		margin: 0.15rem 0 0;
		padding: 0.45rem 0.75rem;
		background: var(--mpc-body-light);
		border-left: 3px solid var(--explainer-accent, var(--mpc-btn-orange));
		border-radius: 4px;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--mpc-silkscreen);
	}

.deck-bottom-row {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) auto auto;
		align-items: start;
		gap: 0.75rem 0.85rem;
		padding-top: 0.7rem;
		border-top: 1px solid rgb(0 0 0 / 0.12);
	}

.deck-field {
		display: grid;
		gap: 0.34rem;
		min-width: 0;
	}

.deck-search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

.deck-search-wrap :global(.search-icon) {
		position: absolute;
		left: 0.68rem;
		width: 14px;
		height: 14px;
		color: var(--mpc-screen-cyan);
		pointer-events: none;
	}

.deck-search-wrap input[type='search'] {
		width: 100%;
		min-height: 36px;
		font-family: var(--font-sans);
		font-size: 0.86rem;
		color: var(--mpc-screen-text);
		background: var(--mpc-screen-bg);
		border: 2px solid #282b34;
		border-radius: 5px;
		padding: 0.42rem 0.75rem 0.42rem 2.05rem;
		box-shadow: inset 0 2px 5px rgb(0 0 0 / 0.8);
		transition: border-color 120ms ease;
	}

.deck-search-wrap input[type='search']::placeholder {
		color: #848d9f;
	}

.deck-search-wrap input[type='search']:focus-visible {
		border-color: var(--mpc-screen-cyan);
		outline: 2px solid var(--mpc-focus-ring);
		outline-offset: 1px;
		box-shadow: inset 0 2px 5px rgb(0 0 0 / 0.8);
	}

.search-clear {
		position: absolute;
		right: 0.35rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 24px;
		min-inline-size: 24px;
		background: #232836;
		color: var(--mpc-screen-text);
		border: 1px solid #3a4154;
		border-radius: 4px;
		padding: 0.18rem 0.5rem;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

.search-clear::after {
		content: '';
		position: absolute;
		inset: -8px -4px;
	}

/* Recessed Segmented Rocker for Firmware */
.fw-rocker {
		position: relative;
		display: inline-flex;
		align-items: stretch;
		min-height: 36px;
		background: #14161c;
		padding: 3px;
		border-radius: 5px;
		border: 1.5px solid #282b34;
		box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.75);
		gap: 2px;
	}

.fw-rocker-pill {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 0;
		z-index: 0;
		border-radius: 3px;
		background-color: var(--btn-lit, var(--mpc-btn-orange));
		box-shadow: 0 0 8px color-mix(in srgb, var(--btn-lit, var(--mpc-btn-orange)) 55%, transparent);
		pointer-events: none;
		opacity: 0;
	}

.fw-rocker.pill-ready .fw-rocker-pill {
		opacity: 1;
	}

.fw-rocker-pill.animate {
		transition:
			transform 250ms cubic-bezier(0.22, 1.2, 0.36, 1),
			width 250ms cubic-bezier(0.22, 1.2, 0.36, 1),
			background-color 220ms ease-out,
			box-shadow 220ms ease-out;
	}

@media (prefers-reduced-motion: reduce) {
		.fw-rocker-pill.animate {
			transition: none;
		}
	}

.fw-rocker-btn {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		border: none;
		background: transparent;
		color: #c5cad6;
		font-family: var(--font-sans);
		font-size: 0.71rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.32rem 0.58rem;
		border-radius: 3px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 100ms ease, color 100ms ease, box-shadow 100ms ease;
	}

.fw-rocker-btn:hover {
		color: #ffffff;
		background: rgb(255 255 255 / 0.06);
	}

.fw-rocker-btn:focus-visible {
		outline: 2px solid var(--mpc-focus-ring);
		outline-offset: 1px;
		box-shadow: none;
	}

.fw-rocker-btn .r-count {
		font-family: var(--font-mono);
		font-size: 0.64rem;
		font-weight: 700;
		line-height: 1;
		opacity: 0.75;
		padding: 0.1rem 0.28rem;
		border-radius: 2px;
		background: rgb(255 255 255 / 0.08);
	}

/* Static active fill until the sliding pill is measured (SSR / first paint). */
.fw-rocker:not(.pill-ready) .fw-rocker-btn[aria-pressed='true'] {
		background: var(--btn-lit, var(--mpc-btn-orange));
		color: var(--mpc-pad-text);
		box-shadow: 0 0 8px color-mix(in srgb, var(--btn-lit, var(--mpc-btn-orange)) 55%, transparent);
	}

.fw-rocker.pill-ready .fw-rocker-btn[aria-pressed='true'] {
		background: transparent;
		color: var(--mpc-pad-text);
		box-shadow: none;
	}

.fw-rocker.pill-ready .fw-rocker-btn[aria-pressed='true']:hover {
		background: transparent;
	}

.fw-rocker-btn[aria-pressed='true'] .r-count {
		background: rgb(0 0 0 / 0.18);
		color: var(--mpc-pad-text);
		opacity: 0.95;
	}

.deck-sort-select {
		min-width: 175px;
		min-height: 36px;
		padding: 0.38rem 0.65rem;
		font-size: 0.82rem;
	}

@media (max-width: 1120px) {
		.section-buttons .hw-btn {
			padding: 0.42rem 0.25rem;
			font-size: 0.68rem;
			letter-spacing: 0.04em;
			gap: 0.25rem;
		}
	}

@media (max-width: 920px) {
		.section-buttons {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.section-buttons .hw-btn {
			padding: 0.44rem 0.4rem;
			font-size: 0.72rem;
			letter-spacing: 0.07em;
			gap: 0.35rem;
		}

		.deck-bottom-row {
			grid-template-columns: 1fr auto;
		}

		.search-field {
			grid-column: 1 / -1;
		}

		.fw-rocker {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

@media (max-width: 640px) {
		.filter-bar {
			padding: 0.7rem 0.75rem;
			gap: 0.65rem;
			margin-bottom: 0.85rem;
		}

		.section-buttons {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 0.32rem;
		}

		.section-buttons .hw-btn {
			padding: 0.36rem 0.25rem;
			font-size: 0.64rem;
			letter-spacing: 0.03em;
			gap: 0.22rem;
		}

		.sec-label-full {
			display: none;
		}

		.sec-label-short {
			display: inline;
		}

		.section-buttons .btn-count {
			font-size: 0.58rem;
			padding: 0.08rem 0.22rem;
		}

		.deck-bottom-row {
			grid-template-columns: 1fr;
			gap: 0.55rem;
			padding-top: 0.6rem;
		}

		.fw-rocker {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.fw-rocker-btn {
			padding: 0.32rem 0.15rem;
			font-size: 0.6rem;
			letter-spacing: 0.02em;
			gap: 0.18rem;
		}

		.fw-rocker-btn .r-count {
			font-size: 0.56rem;
			padding: 0.07rem 0.18rem;
		}

		.deck-sort-select {
			width: 100%;
			min-width: 0;
		}
	}
</style>
