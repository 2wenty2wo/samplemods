<script>
/** @type {{
	 *   totalMods: number,
	 *   totalAuthors: number,
	 *   latestUpdateLabel: string | null,
	 *   query: string
	 * }} */
	let { totalMods, totalAuthors, latestUpdateLabel, query = $bindable('') } = $props();
</script>

<section class="hero-band" aria-label="Search and catalog overview">
	<div class="hero-inner">
		<div class="hero-screen">
			<div class="hero-top-row">
				<div class="hero-title-group">
					<p class="hero-kicker">COMMUNITY CATALOG FOR THE AKAI MPC SAMPLE</p>
					<h1 class="hero-headline">
						Custom firmware, synths, games &amp; tools for the <span class="hero-accent">Akai MPC Sample</span>.
					</h1>
				</div>

				<dl class="hero-stats" aria-label="Catalog statistics">
					<div class="stat-box">
						<dt>ENTRIES</dt>
						<dd class="stat-val amber">{totalMods}</dd>
					</div>
					<div class="stat-box">
						<dt>AUTHORS</dt>
						<dd class="stat-val white">{totalAuthors}</dd>
					</div>
					<div class="stat-box">
						<dt>LATEST PUSH</dt>
						<dd class="stat-val cyan">{latestUpdateLabel ?? '—'}</dd>
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

/* Hero styled after the stock MPC Sample firmware screen: pure black,
	   off-white text, amber accent, inverted tab, thin grey outlines. */

.hero-screen {
		background: #000;
		border: 1px solid #404048;
		border-radius: 8px;
		padding: 1.25rem 1.35rem;
		box-shadow: 0 1px 0 rgb(255 255 255 / 0.06);
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

/* Inverted like the selected soft-key tab (Trim | Tune | Filter). */

.hero-kicker {
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

.hero-headline {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-variation-settings: 'wdth' 100, 'wght' 600;
		font-size: clamp(1.4rem, 2.8vw, 2rem);
		line-height: 1.15;
		color: var(--mpc-screen-white);
		letter-spacing: -0.01em;
	}

.hero-accent {
		color: var(--mpc-screen-amber);
	}

.hero-stats {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

.stat-box {
		background: #181818;
		border: 1px solid #404048;
		border-radius: 2px;
		padding: 0.45rem 0.75rem;
		min-width: 92px;
	}

.stat-box dt {
		font-family: var(--font-screen);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--mpc-screen-grey);
		margin-bottom: 0.1rem;
	}

.stat-box dd {
		margin: 0;
		font-family: var(--font-screen);
		font-size: 1.05rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

.stat-val.amber {
		color: var(--mpc-screen-amber);
	}

.stat-val.white {
		color: var(--mpc-screen-white);
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
		border-top: 1px solid #282830;
	}

.search-label {
		font-family: var(--font-screen);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--mpc-screen-grey);
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
		background: #000;
		border: 1px solid #585860;
		border-radius: 2px;
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
			font-size: 1.4rem;
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
	}
</style>
