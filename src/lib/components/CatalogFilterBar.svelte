<script>
import {
		SECTIONS,
		sectionGlow,
		sectionLabel,
		sectionExplainer
	} from '$lib/categories.js';

	/** @type {{
	 *   section: string,
	 *   sort: string,
	 *   totalMods: number,
	 *   sectionCounts: Record<string, number>,
	 *   filteredCount: number,
	 *   query: string,
	 *   selectSection: (next: string) => void
	 * }} */
	let {
		section,
		sort = $bindable('name'),
		totalMods,
		sectionCounts,
		filteredCount,
		query = $bindable(''),
		selectSection
	} = $props();
</script>

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
		Showing <strong>{filteredCount}</strong> of {totalMods} entries
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

<style>
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

@media (max-width: 640px) {
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
