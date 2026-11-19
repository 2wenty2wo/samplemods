<script>
import EntryProse from '$lib/components/EntryProse.svelte';

	/** @type {{
	 *   mod: any,
	 *   isLongReadme: boolean,
	 *   siteHost: string | null,
	 *   readmeExpanded: boolean
	 * }} */
	let { mod, isLongReadme, siteHost, readmeExpanded = $bindable(false) } = $props();
</script>

<section class="detail-section" aria-label="About">
	<h2 class="silk-heading">About</h2>
	{#if mod.readme_html}
		<div class="readme-card" class:is-clamped={isLongReadme}>
			{#if isLongReadme}
				<input
					type="checkbox"
					id="readme-expand-toggle"
					class="readme-toggle-input"
					bind:checked={readmeExpanded}
				/>
			{/if}

			<div class="readme-viewport">
				<EntryProse html={mod.readme_html} className="readme-prose" />
				{#if isLongReadme}
					<div class="readme-fade" aria-hidden="true"></div>
				{/if}
			</div>

			{#if isLongReadme}
				<div class="readme-toggle-bar">
					<label for="readme-expand-toggle" class="hw-action-btn orange readme-toggle-btn">
						<span class="label-more">Read more</span>
						<span class="label-less">Show less</span>
					</label>
				</div>
			{/if}

			{#if mod.repo}
				<div class="readme-footer">
					<a
						href="https://github.com/{mod.repo}#readme"
						target="_blank"
						rel="noopener noreferrer"
					>
						From the project README on GitHub ↗
					</a>
				</div>
			{:else if mod.website}
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
.detail-section {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

.silk-heading {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mpc-silkscreen-muted);
	}

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

.readme-toggle-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1px;
		height: 1px;
	}

.readme-viewport {
		padding: 1.35rem 1.5rem;
		position: relative;
	}

.readme-card.is-clamped .readme-viewport {
		max-height: 600px;
		overflow: hidden;
	}

.readme-card.is-clamped .readme-toggle-input:checked ~ .readme-viewport {
		max-height: none;
		overflow: visible;
	}

.readme-fade {
		position: absolute;
		inset: auto 0 0 0;
		height: 120px;
		background: linear-gradient(180deg, rgb(244 242 239 / 0) 0%, #f4f2ef 90%);
		pointer-events: none;
	}

.readme-card.is-clamped .readme-toggle-input:checked ~ .readme-viewport .readme-fade {
		display: none;
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

.readme-toggle-btn .label-less {
		display: none;
	}

.readme-card.is-clamped .readme-toggle-input:checked ~ .readme-toggle-bar .label-more {
		display: none;
	}

.readme-card.is-clamped .readme-toggle-input:checked ~ .readme-toggle-bar .label-less {
		display: inline;
	}

.readme-toggle-input:focus-visible ~ .readme-toggle-bar .readme-toggle-btn {
		outline: 3px solid var(--mpc-focus-ring);
		outline-offset: 2px;
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
