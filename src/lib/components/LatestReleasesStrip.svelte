<script>
	import { base } from '$app/paths';
	import ReleaseRow from '$lib/components/ReleaseRow.svelte';

	/** @type {{ releases: any[] }} */
	let { releases } = $props();
</script>

{#if releases.length}
	<section
		class="hw-band latest-releases-band"
		style="--band-led: var(--mpc-btn-orange)"
		aria-label="Latest releases"
	>
		<div class="hw-band-inner">
			<div class="hw-band-head">
				<h2 class="silk-heading hw-band-title">Latest releases</h2>
				<p class="hw-band-sub">
					{releases.length} newest ·
					<a href="{base}/releases/">See all releases →</a>
					·
					<a href="{base}/releases.xml">RSS</a>
				</p>
			</div>
			<ul class="latest-releases-list">
				{#each releases as rel (rel.key)}
					<li>
						<ReleaseRow {rel} compact={true} />
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<style>
	.latest-releases-band {
		margin-bottom: 0.85rem;
	}

	.latest-releases-band .hw-band-inner {
		gap: 0.45rem;
		padding: 0.6rem 0.9rem 0.65rem;
	}

	.latest-releases-band .hw-band-head {
		padding-bottom: 0.4rem;
	}

	.latest-releases-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.22rem;
	}

	@media (max-width: 640px) {
		.latest-releases-band {
			margin-bottom: 0.75rem;
		}

		.latest-releases-band .hw-band-inner {
			padding: 0.55rem 0.7rem 0.6rem;
			gap: 0.4rem;
		}

		.latest-releases-band .hw-band-head {
			padding-bottom: 0.35rem;
		}
	}
</style>
