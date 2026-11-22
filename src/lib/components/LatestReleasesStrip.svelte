<script>
	import { base } from '$app/paths';
	import ReleaseRow from '$lib/components/ReleaseRow.svelte';
	import RssIcon from '$lib/RssIcon.svelte';

	/** @type {{ releases: any[], newEntries?: any[] }} */
	let { releases, newEntries = [] } = $props();
</script>

{#if releases.length || newEntries.length}
	<div class="hw-band top-strips-grid" class:is-paired={releases.length > 0 && newEntries.length > 0}>
		{#if releases.length}
			<section
				class="strip-panel latest-releases-band"
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
							<a
								class="rss-link"
								href="{base}/releases.xml"
								aria-label="RSS feed of latest releases"
								title="RSS feed"
							><RssIcon /></a>
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

		{#if newEntries.length}
			<section
				class="strip-panel new-entries-band"
				style="--band-led: var(--mpc-btn-green)"
				aria-label="New in the catalog"
			>
				<div class="hw-band-inner">
					<div class="hw-band-head">
						<h2 class="silk-heading hw-band-title">New in the catalog</h2>
						<p class="hw-band-sub">{newEntries.length} newest</p>
					</div>
					<ul class="latest-releases-list">
						{#each newEntries as rel (rel.key)}
							<li>
								<ReleaseRow {rel} compact={true} showVersion={false} hrefHash="" />
							</li>
						{/each}
					</ul>
				</div>
			</section>
		{/if}
	</div>
{/if}

<style>
	.top-strips-grid {
		margin-bottom: 0.85rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.85rem;
		align-items: stretch;
	}

	.top-strips-grid.is-paired {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.strip-panel {
		min-width: 0;
		display: flex;
	}

	.strip-panel .hw-band-inner {
		width: 100%;
		gap: 0.45rem;
		padding: 0.6rem 0.9rem 0.65rem;
		align-content: start;
	}

	.strip-panel .hw-band-head {
		padding-bottom: 0.4rem;
	}

	.latest-releases-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.22rem;
	}

	.rss-link {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		vertical-align: middle;
		text-decoration: none;
	}

	.rss-link::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 24px;
		height: 24px;
		transform: translate(-50%, -50%);
	}

	.rss-link:hover,
	.rss-link:focus-visible {
		text-decoration: none;
	}

	@media (max-width: 900px) {
		.top-strips-grid.is-paired {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.top-strips-grid {
			margin-bottom: 0.75rem;
			gap: 0.75rem;
		}

		.strip-panel .hw-band-inner {
			padding: 0.55rem 0.7rem 0.6rem;
			gap: 0.4rem;
		}

		.strip-panel .hw-band-head {
			padding-bottom: 0.35rem;
		}
	}
</style>
