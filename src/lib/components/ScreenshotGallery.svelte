<script>
/** @type {{
	 *   mod: any,
	 *   shots: string[],
	 *   galleryShots: string[],
	 *   logoSrc: string | null,
	 *   imageCreditHost: string | null,
	 *   pixelatedUrls: Record<string, boolean>,
	 *   onScreenImageLoad: (e: Event, src: string | null) => void,
	 *   openLightbox: (src: string, alt: string) => void
	 * }} */
	let {
		mod,
		shots,
		galleryShots,
		logoSrc,
		imageCreditHost,
		pixelatedUrls,
		onScreenImageLoad,
		openLightbox
	} = $props();
</script>

{#if shots.length}
	<section class="detail-section" aria-label="Screenshots">
		<div class="section-header">
			{#if galleryShots.length}
				<h2 class="silk-heading">Screenshots ({galleryShots.length})</h2>
			{/if}
			<p class="image-credit">
				{#if mod.repo}
					Images: from
					<a href="https://github.com/{mod.repo}" target="_blank" rel="noopener noreferrer">
						{mod.repo}
					</a>
				{:else if imageCreditHost}
					Images: from {imageCreditHost}
				{/if}
			</p>
		</div>

		<ul class="shot-grid" hidden={!galleryShots.length}>
			{#each galleryShots as src, i}
				<li>
					<button
						type="button"
						class="bezel-screen shot-thumb-btn"
						onclick={() => openLightbox(src, `${mod.name} screenshot ${i + 1}`)}
					>
						<img
							class="screen-img"
							class:pixelated={pixelatedUrls[src]}
							src={src}
							alt="{mod.name} screenshot {i + 1}"
							onload={(e) => onScreenImageLoad(e, src)}
						/>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{:else if logoSrc}
	<p class="image-credit standalone-credit">
		{#if mod.repo}
			Images: from
			<a href="https://github.com/{mod.repo}" target="_blank" rel="noopener noreferrer">
				{mod.repo}
			</a>
		{:else if imageCreditHost}
			Images: from {imageCreditHost}
		{/if}
	</p>
{/if}

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

.section-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

.image-credit {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--mpc-silkscreen-muted);
	}

.standalone-credit {
		margin-bottom: -1rem;
	}

.shot-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
		gap: 0.85rem;
	}

.shot-thumb-btn {
		width: 100%;
		padding: 0;
		cursor: zoom-in;
		transition: border-color 120ms ease, box-shadow 120ms ease;
	}

.shot-thumb-btn:hover {
		border-color: var(--pad-glow, var(--mpc-btn-orange));
		box-shadow: 0 0 12px color-mix(in srgb, var(--pad-glow, var(--mpc-btn-orange)) 65%, transparent);
	}
</style>
