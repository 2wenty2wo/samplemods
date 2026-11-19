<script>
	import { base } from '$app/paths';
	import { sectionGlow, initials } from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	/** @type {{ releases: any[] }} */
	let { releases } = $props();

	/** @param {string | number | null | undefined} value */
	function formatShortDate(value) {
		if (!value) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	}
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

			<div class="release-chip-scroll-wrap">
				<ul class="release-chip-list">
					{#each releases as rel (rel.key)}
						{@const thumbSrc = assetUrl(rel.thumb?.src)}
						{@const shortDate = formatShortDate(rel.published_at)}
						<li class="release-chip-item">
							<a
								class="hw-band-chip release-chip"
								href="{base}{rel.entryPath}#releases"
								style="--chip-accent: {sectionGlow(rel.section)}"
								title="{rel.entryName} — {rel.tag}{shortDate ? ` (${shortDate})` : ''}"
							>
								<div class="bezel-screen release-chip-bezel">
									{#if thumbSrc}
										<img
											class="screen-img"
											class:is-logo={rel.thumb?.kind === 'logo'}
											src={thumbSrc}
											alt=""
											loading="lazy"
										/>
									{:else}
										<span class="chip-initials">{initials(rel.entryName)}</span>
									{/if}
								</div>

								<span class="release-chip-name">{rel.entryName}</span>
								<span class="release-chip-tag">{rel.tag}</span>
								{#if shortDate}
									<time class="release-chip-date" datetime={rel.published_at ?? ''}>
										{shortDate}
									</time>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>
{/if}

<style>
	.latest-releases-band {
		margin-bottom: 1rem;
	}

	.release-chip-scroll-wrap {
		position: relative;
		min-width: 0;
	}

	.release-chip-scroll-wrap::after {
		content: '';
		position: absolute;
		top: 0;
		right: -2px;
		bottom: 0;
		width: 28px;
		pointer-events: none;
		background: linear-gradient(90deg, transparent 0%, var(--mpc-pad-card) 92%);
	}

	.release-chip-list {
		list-style: none;
		margin: 0;
		padding: 0 1.25rem 2px 0;
		display: flex;
		flex-wrap: nowrap;
		gap: 0.55rem;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		scrollbar-width: none;
		-ms-overflow-style: none;
		-webkit-overflow-scrolling: touch;
	}

	.release-chip-list::-webkit-scrollbar {
		display: none;
	}

	.release-chip-item {
		flex: 0 0 auto;
		scroll-snap-align: start;
		display: flex;
	}

	.release-chip {
		gap: 0.42rem;
		padding: 0.25rem 0.65rem 0.25rem 0.28rem;
		white-space: nowrap;
	}

	.release-chip-bezel {
		width: 37px;
		height: 28px;
		flex-shrink: 0;
		border-width: 1.5px;
		border-radius: 4px;
	}

	.chip-initials {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.68rem;
		color: var(--mpc-screen-yellow);
	}

	.release-chip-name {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--mpc-pad-text);
		max-width: 24ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.release-chip-tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--mpc-screen-cyan);
		background: var(--mpc-screen-bg);
		border: 1px solid #282d3a;
		border-radius: 3px;
		padding: 0.08rem 0.36rem;
		max-width: 16ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.release-chip-date {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--mpc-silkscreen-muted);
		padding-left: 0.05rem;
		flex-shrink: 0;
	}

	@media (max-width: 640px) {
		.latest-releases-band {
			margin-bottom: 0.85rem;
		}
	}
</style>
