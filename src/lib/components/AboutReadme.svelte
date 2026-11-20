<script>
	import EntryProse from '$lib/components/EntryProse.svelte';

	/** @type {{
	 *   mod: any,
	 *   isLongReadme: boolean,
	 *   readmeHeadHtml?: string,
	 *   readmeTailHtml?: string,
	 *   siteHost: string | null,
	 *   readmeExpanded: boolean
	 * }} */
	let {
		mod,
		isLongReadme,
		readmeHeadHtml = '',
		readmeTailHtml = '',
		siteHost,
		readmeExpanded = $bindable(false)
	} = $props();

	/** @type {HTMLDivElement | undefined} */
	let tailEl = $state();

	$effect(() => {
		if (!tailEl) return;
		if (!readmeExpanded) {
			tailEl.setAttribute('hidden', 'until-found');
		} else {
			tailEl.removeAttribute('hidden');
		}
		const handleBeforeMatch = () => {
			readmeExpanded = true;
		};
		tailEl.addEventListener('beforematch', handleBeforeMatch);
		return () => tailEl.removeEventListener('beforematch', handleBeforeMatch);
	});
</script>

<section class="detail-section" aria-label="About">
	<h2 class="silk-heading">About</h2>
	{#if mod.readme_html}
		<div
			class="readme-card"
			class:is-clamped={isLongReadme && !readmeExpanded}
			class:is-expanded={isLongReadme && readmeExpanded}
		>
			<div class="readme-viewport">
				{#if isLongReadme && readmeTailHtml}
					<EntryProse html={readmeHeadHtml} className="readme-prose readme-prose-head" />
					<div
						bind:this={tailEl}
						id="readme-overflow"
						class="readme-tail"
						hidden={!readmeExpanded ? 'until-found' : undefined}
						inert={!readmeExpanded}
					>
						<EntryProse html={readmeTailHtml} className="readme-prose readme-prose-tail" />
					</div>
					{#if !readmeExpanded}
						<div class="readme-fade" aria-hidden="true"></div>
					{/if}
				{:else}
					<EntryProse html={mod.readme_html} className="readme-prose" />
				{/if}
			</div>

			{#if isLongReadme}
				<div class="readme-toggle-bar">
					<button
						type="button"
						class="hw-action-btn orange readme-toggle-btn"
						aria-expanded={readmeExpanded}
						aria-controls="readme-overflow"
						onclick={() => (readmeExpanded = !readmeExpanded)}
					>
						{readmeExpanded ? 'Show less' : 'Read more'}
					</button>
				</div>
			{/if}

			{#if mod.readme_from_repo}
				<div class="readme-footer">
					<a
						href="https://github.com/{mod.repo}#readme"
						target="_blank"
						rel="noopener noreferrer"
					>
						From the project README on GitHub ↗
					</a>
				</div>
			{:else if !mod.repo && mod.website}
				<div class="readme-footer">
					<a href={mod.website} target="_blank" rel="noopener noreferrer">
						From the maker's page ↗
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<div class="readme-card readme-empty">
			{#if mod.repo}
				<p>
					No README yet. See the repository on
					<a href="https://github.com/{mod.repo}" target="_blank" rel="noopener noreferrer">
						GitHub ↗
					</a>.
				</p>
			{:else if mod.website && siteHost}
				<p>
					More details on
					<a href={mod.website} target="_blank" rel="noopener noreferrer">
						{siteHost} ↗
					</a>
				</p>
			{:else}
				<p>No README yet.</p>
			{/if}
		</div>
	{/if}
</section>

<style>
/* —— README / About Card & Prose Styles —— */

.readme-card {
		background: #f4f2ef;
		color: #1c1e24;
		border: 2px solid #282b34;
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.8),
			0 4px 0 #1b1d24;
		overflow: hidden;
		max-width: 72ch;
		width: 100%;
	}

.readme-empty {
		padding: 1.25rem 1.4rem;
		color: var(--mpc-silkscreen-muted);
	}

.readme-empty p {
		margin: 0;
	}

.readme-viewport {
		padding: 1.35rem 1.5rem;
		position: relative;
	}

.readme-card.is-clamped .readme-viewport {
		padding-bottom: 1.75rem;
	}

.readme-tail {
		margin-top: 0.9rem;
	}

.readme-tail[hidden] {
		display: none;
	}

.readme-fade {
		position: absolute;
		inset: auto 0 0 0;
		height: 120px;
		background: linear-gradient(180deg, rgb(244 242 239 / 0) 0%, #f4f2ef 90%);
		pointer-events: none;
	}

.readme-toggle-bar {
		display: flex;
		justify-content: center;
		padding: 0.25rem 1.5rem 1rem;
		background: #f4f2ef;
	}

.readme-toggle-btn {
		user-select: none;
	}

.readme-footer {
		padding: 0.65rem 1.5rem;
		background: var(--mpc-body-mid);
		border-top: 1px solid var(--mpc-body-recess);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		display: flex;
		justify-content: flex-end;
	}

.readme-footer a {
		color: var(--mpc-silkscreen);
		font-weight: 600;
	}

@media (max-width: 960px) {
	.readme-card {
		max-width: 100%;
	}
}

@media (max-width: 720px) {
.readme-viewport {
			padding: 1rem 1.05rem;
		}

.readme-footer {
			padding: 0.55rem 1.05rem;
		}
	}
</style>
