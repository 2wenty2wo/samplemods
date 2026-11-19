<script>
	import { base } from '$app/paths';
	import ReleaseRow from '$lib/components/ReleaseRow.svelte';

	/** @type {{ releases: any[] }} */
	let { releases } = $props();
</script>

{#if releases.length}
	<section class="latest-releases-band" aria-label="Latest releases">
		<div class="latest-releases-head">
			<h2 class="silk-label latest-releases-title">LATEST RELEASES</h2>
			<a class="see-all-link" href="{base}/releases/">See all releases →</a>
		</div>
		<ul class="latest-releases-list">
			{#each releases as rel (rel.key)}
				<li>
					<ReleaseRow {rel} compact={true} />
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.latest-releases-band {
		width: min(1200px, 100% - 2rem);
		margin: 0 auto 0.85rem;
		display: grid;
		gap: 0.38rem;
	}

	.latest-releases-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.latest-releases-title {
		margin: 0;
		font-size: 0.74rem;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--mpc-silkscreen);
	}

	.latest-releases-title::before {
		content: '';
		width: 10px;
		height: 4px;
		border-radius: 2px;
		background: var(--mpc-btn-orange);
		box-shadow: 0 0 6px rgb(255 138 30 / 0.55);
	}

	.see-all-link {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--mpc-accent-red);
	}

	.latest-releases-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.28rem;
	}

	@media (max-width: 640px) {
		.latest-releases-band {
			width: calc(100% - 1.25rem);
			margin-bottom: 1rem;
		}
	}
</style>
