<script>
	import { afterNavigate } from '$app/navigation';
	import { base } from '$app/paths';
	import mods from '$lib/data.json';
	import { SITE_NAME } from '$lib/site.js';
	import {
		SECTIONS,
		sectionGlow,
		sectionLabel,
		sectionSingular,
		sectionSingularLabel,
		sectionExplainer,
		sectionFromParam,
		entryPath,
		installLabel,
		priceBadge
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	let query = $state('');
	let section = $state('');
	let sort = $state('name');

	/** Track image URLs whose naturalWidth <= 400 so 320×240 captures render pixelated */
	let pixelatedUrls = $state(/** @type {Record<string, boolean>} */ ({}));

	const totalMods = mods.length;
	const sectionCounts = Object.fromEntries(
		SECTIONS.map((s) => [s, mods.filter((m) => m.section === s).length])
	);
	const totalAuthors = new Set(mods.map((m) => m.author)).size;
	const latestUpdateTimestamp = mods.reduce((max, m) => {
		const t = m.pushed_at ? Date.parse(m.pushed_at) : 0;
		return t > max ? t : max;
	}, 0);

	afterNavigate(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		section = sectionFromParam(params.get('section'));
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

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		let list = mods.filter((mod) => {
			if (section && mod.section !== section) return false;
			if (!q) return true;
			const hay = [mod.name, mod.description, mod.author, ...(mod.tags ?? [])]
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
		if (!value) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	/**
	 * Priority: first screenshot -> logo centred on black -> generated splash fallback.
	 * @param {{ logo?: string | null, screenshots?: string[] }} mod
	 */
	function cardScreenMedia(mod) {
		if (mod.screenshots?.length) {
			return { kind: 'shot', src: assetUrl(mod.screenshots[0]) };
		}
		if (mod.logo) {
			return { kind: 'logo', src: assetUrl(mod.logo) };
		}
		return { kind: 'splash', src: null };
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

<svelte:head>
	<title>{SITE_NAME}: mods, apps, games &amp; tools for the Akai MPC Sample</title>
	<meta
		name="description"
		content="{SITE_NAME}: community catalog of custom firmware mods, apps, games, tools, guides, and developer libraries for the Akai MPC Sample."
	/>
</svelte:head>

<section class="hero-band" aria-label="Search and catalog overview">
	<div class="hero-inner">
		<div class="hero-screen">
			<div class="hero-top-row">
				<div class="hero-title-group">
					<p class="hero-kicker">COMMUNITY CATALOG FOR THE AKAI MPC SAMPLE</p>
					<h1 class="hero-headline">
						Custom firmware, synths, games &amp; tools for the Akai MPC Sample.
					</h1>
				</div>

				<dl class="hero-stats" aria-label="Catalog statistics">
					<div class="stat-box">
						<dt>ENTRIES</dt>
						<dd class="stat-val yellow">{totalMods}</dd>
					</div>
					<div class="stat-box">
						<dt>AUTHORS</dt>
						<dd class="stat-val magenta">{totalAuthors}</dd>
					</div>
					<div class="stat-box">
						<dt>LATEST PUSH</dt>
						<dd class="stat-val cyan">{formatUpdated(latestUpdateTimestamp) ?? '—'}</dd>
					</div>
				</dl>
			</div>

			<div class="hero-search-bar">
				<label class="search-label" for="mod-search">SEARCH CATALOG</label>
				<div class="search-input-wrap">
					<input
						id="mod-search"
						type="search"
						bind:value={query}
						placeholder="Filter by name, description, tag, or author…"
						autocomplete="off"
					/>
					{#if query}
						<button type="button" class="search-clear" onclick={() => (query = '')}>
							Clear
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<div class="wrap" id="catalog">
	<section class="filter-bar" aria-label="Filter and sort entries">
		<div class="filter-group">
			<span class="silk-label">SECTION</span>
			<div class="hw-buttons" role="group" aria-label="Section">
				<button
					type="button"
					class="hw-btn"
					style="--btn-lit: #FF8A1E"
					aria-pressed={section === ''}
					onclick={() => selectSection('')}
				>
					All <span class="btn-count">{totalMods}</span>
				</button>
				{#each SECTIONS as cat}
					<button
						type="button"
						class="hw-btn"
						style="--btn-lit: {sectionGlow(cat)}"
						aria-pressed={section === cat}
						onclick={() => selectSection(cat)}
					>
						{sectionLabel(cat)} <span class="btn-count">{sectionCounts[cat]}</span>
					</button>
				{/each}
			</div>
			{#if section && sectionExplainer(section)}
				<p class="section-explainer" style="--explainer-accent: {sectionGlow(section)}">
					{sectionExplainer(section)}
				</p>
			{/if}
		</div>

		<div class="sort-group">
			<label class="silk-label" for="mod-sort">SORT ORDER</label>
			<select id="mod-sort" class="hw-select" bind:value={sort}>
				<option value="name">Name (A–Z)</option>
				<option value="stars">Stars (High–Low)</option>
				<option value="updated">Recently updated</option>
			</select>
		</div>
	</section>

	<div class="results-bar" aria-live="polite">
		<span class="results-count">
			Showing <strong>{filtered.length}</strong> of {totalMods} entries
			{#if section}
				in <strong>{sectionLabel(section)}</strong>
			{/if}
		</span>
		{#if section || query}
			<button
				type="button"
				class="reset-link"
				onclick={() => {
					selectSection('');
					query = '';
				}}
			>
				Reset filters
			</button>
		{/if}
	</div>

	{#if filtered.length === 0}
		<div class="empty-state">
			<p class="empty-title">No entries match those filters.</p>
			<p class="empty-sub">Try clearing your search query or switching back to All sections.</p>
		</div>
	{:else}
		<ul class="card-grid">
			{#each filtered as mod (mod.id)}
				{@const media = cardScreenMedia(mod)}
				{@const install = installLabel(mod.install)}
				<li class="card-item">
					<a
						class="pad-card"
						href="{base}{entryPath(mod)}"
						style="--pad-glow: {sectionGlow(mod.section)}"
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
							{:else}
								<div class="splash-fallback" aria-hidden="true">
									<div class="splash-topbar">
										<span class="splash-cat">{sectionSingularLabel(mod.section)}</span>
										{#if mod.firmware}
											<span class="splash-fw">FW {mod.firmware}</span>
										{/if}
									</div>
									<p class="splash-title">{mod.name}</p>
									<div class="splash-footer">
										<span class="splash-bar"></span>
										<span class="splash-author">{mod.author}</span>
									</div>
								</div>
							{/if}
						</div>

						<div class="card-badges">
							<span class="chip chip-category">{sectionSingularLabel(mod.section)}</span>
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
							<h2 class="card-title">{mod.name}</h2>
							<p class="card-desc">{mod.description}</p>
						</div>

						<div class="card-footer">
							<span class="card-author">{mod.author}</span>
							<div class="card-readout">
								{#if mod.stars != null}
									<span class="screen-badge stars" title="{mod.stars} GitHub stars">
										★ {mod.stars}
									</span>
								{/if}
								{#if formatUpdated(mod.pushed_at)}
									<span class="screen-badge date">{formatUpdated(mod.pushed_at)}</span>
								{/if}
							</div>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.hero-band {
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		border-bottom: 4px solid var(--mpc-body-recess);
		padding: 1.35rem 0 1.6rem;
		margin-bottom: 1.5rem;
	}

	.hero-inner {
		width: min(1200px, 100% - 2rem);
		margin-inline: auto;
	}

	.hero-screen {
		background:
			linear-gradient(180deg, rgb(232 200 17 / 0.04) 0%, transparent 65%),
			var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-radius: 8px;
		padding: 1.25rem 1.35rem;
		box-shadow:
			inset 0 2px 10px rgb(0 0 0 / 0.85),
			0 1px 0 rgb(255 255 255 / 0.07);
		display: grid;
		gap: 1.15rem;
	}

	.hero-top-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem 1.5rem;
	}

	.hero-title-group {
		max-width: 640px;
	}

	.hero-kicker {
		margin: 0 0 0.3rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--mpc-screen-cyan);
	}

	.hero-headline {
		margin: 0;
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 800;
		font-stretch: 115%;
		font-variation-settings: 'wdth' 115, 'wght' 800;
		font-size: clamp(1.3rem, 2.6vw, 1.85rem);
		line-height: 1.18;
		color: var(--mpc-screen-yellow);
		letter-spacing: 0.01em;
	}

	.hero-stats {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.stat-box {
		background: #10131a;
		border: 1px solid #252a36;
		border-radius: 5px;
		padding: 0.45rem 0.75rem;
		min-width: 92px;
	}

	.stat-box dt {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: #9ba3b4;
		margin-bottom: 0.1rem;
	}

	.stat-box dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 1.05rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.stat-val.yellow {
		color: var(--mpc-screen-yellow);
	}

	.stat-val.magenta {
		color: var(--mpc-screen-magenta);
	}

	.stat-val.cyan {
		color: var(--mpc-screen-cyan);
		font-size: 0.92rem;
	}

	.hero-search-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.85rem;
		padding-top: 0.85rem;
		border-top: 1px solid #1d212b;
	}

	.search-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mpc-screen-cyan);
		white-space: nowrap;
	}

	.search-input-wrap {
		position: relative;
		flex: 1 1 260px;
		display: flex;
		align-items: center;
	}

	.search-input-wrap input[type='search'] {
		width: 100%;
		font-family: var(--font-sans);
		font-size: 0.95rem;
		color: var(--mpc-screen-text);
		background: #050608;
		border: 2px solid #2c3242;
		border-radius: 5px;
		padding: 0.6rem 0.85rem;
		box-shadow: inset 0 2px 5px rgb(0 0 0 / 0.75);
		transition: border-color 120ms ease;
	}

	.search-input-wrap input[type='search']::placeholder {
		color: #848d9f;
	}

	.search-input-wrap input[type='search']:focus-visible {
		border-color: var(--mpc-screen-cyan);
		outline: 2px solid var(--mpc-focus-ring);
		outline-offset: 1px;
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		background: #232836;
		color: var(--mpc-screen-text);
		border: 1px solid #3a4154;
		border-radius: 4px;
		padding: 0.22rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
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
		margin-bottom: 1rem;
	}

	.filter-group {
		display: grid;
		gap: 0.45rem;
		flex: 1 1 520px;
	}

	.sort-group {
		display: grid;
		gap: 0.45rem;
		flex: 0 1 210px;
		min-width: 180px;
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

	.section-explainer {
		margin: 0.2rem 0 0;
		padding: 0.45rem 0.75rem;
		background: var(--mpc-body-light);
		border-left: 3px solid var(--explainer-accent, var(--mpc-btn-orange));
		border-radius: 4px;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--mpc-silkscreen);
	}

	.results-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.9rem;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--mpc-silkscreen-muted);
	}

	.results-count strong {
		color: var(--mpc-silkscreen);
	}

	.reset-link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-weight: 700;
		color: var(--mpc-accent-red);
		text-decoration: underline;
		cursor: pointer;
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

	@media (max-width: 640px) {
		.hero-inner {
			width: calc(100% - 1.25rem);
		}

		.hero-band {
			padding: 0.75rem 0 0.95rem;
			margin-bottom: 0.95rem;
		}

		.hero-screen {
			padding: 0.75rem 0.85rem;
			gap: 0.75rem;
		}

		.hero-headline {
			font-size: 1.15rem;
		}

		.hero-stats {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.4rem;
		}

		.stat-box {
			min-width: 0;
			padding: 0.32rem 0.45rem;
		}

		.stat-box dd,
		.stat-val.cyan {
			font-size: 0.82rem;
			white-space: nowrap;
		}

		.hero-search-bar {
			padding-top: 0.6rem;
			gap: 0.35rem;
		}

		.search-input-wrap input[type='search'] {
			padding: 0.45rem 0.65rem;
			font-size: 0.88rem;
		}

		.filter-bar {
			padding: 0.65rem 0.75rem;
			gap: 0.65rem;
			margin-bottom: 0.65rem;
		}

		.sort-group {
			flex: 1 1 100%;
		}
	}
</style>
