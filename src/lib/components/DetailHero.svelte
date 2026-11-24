<script>
	import ExternalIcon from '$lib/ExternalIcon.svelte';
import { base } from '$app/paths';
	import StarIcon from '$lib/StarIcon.svelte';
	import {
		entryPath,
		sectionLabel,
		sectionSingular,
		sectionSingularLabel
	} from '$lib/categories.js';

	/** @type {{
	 *   mod: any,
	 *   install: string | null,
	 *   priceChip: string | null,
	 *   heroMedia: { kind: string, src: string | null },
	 *   pixelatedUrls: Record<string, boolean>,
	 *   latestRelease: any,
	 *   latestReleaseUrl: string | null,
	 *   siteHost: string | null,
	 *   releasesLength: number,
	 *   onScreenImageLoad: (e: Event, src: string | null) => void,
	 *   openLightbox: (src: string, alt: string) => void
	 * }} */
	let {
		mod,
		install,
		priceChip,
		heroMedia,
		pixelatedUrls,
		latestRelease,
		latestReleaseUrl,
		siteHost,
		releasesLength,
		onScreenImageLoad,
		openLightbox
	} = $props();
</script>

<section class="detail-hero-band">
	<div class="detail-hero-inner">
		<nav class="breadcrumbs" aria-label="Breadcrumb">
			<ol>
				<li>
					<a class="crumb-link" href="{base}/">All</a>
				</li>
				<li>
					<a class="crumb-link" href="{base}/?section={sectionSingular(mod.section)}">
						{sectionLabel(mod.section)}
					</a>
				</li>
				<li>
					<a class="crumb-current" href="{base}{entryPath(mod)}" aria-current="page">{mod.name}</a>
				</li>
			</ol>
		</nav>

		<div class="detail-screen-panel">
			<!-- 4:3 Glossy Black Bezel Frame -->
			<div class="hero-screen-col">
				<button
					type="button"
					class="bezel-screen hero-bezel"
					class:is-clickable={!!heroMedia.src}
					disabled={!heroMedia.src}
					onclick={() => heroMedia.src && openLightbox(heroMedia.src, `${mod.name} preview`)}
					aria-label={heroMedia.src ? `Enlarge ${mod.name} preview` : undefined}
				>
					{#if heroMedia.src}
						<img
							class="screen-img"
							class:is-logo={heroMedia.kind === 'logo'}
							class:pixelated={heroMedia.kind === 'shot' && pixelatedUrls[heroMedia.src]}
							src={heroMedia.src}
							alt="{mod.name} screen capture"
							width="320"
							height="240"
							fetchpriority="high"
							decoding="async"
							onload={(e) => onScreenImageLoad(e, heroMedia.src)}
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
				</button>
			</div>

			<!-- Entry Info & Hardware Action Buttons -->
			<div class="hero-info-col">
				<div class="hero-badges">
					<span class="chip chip-category">{sectionSingularLabel(mod.section)}</span>
					{#if install}
						<span class="chip chip-install">{install}</span>
					{/if}
					{#if priceChip}
						<span class="chip chip-price">{priceChip}</span>
					{/if}
					{#if mod.status}
						<span class="badge-status {mod.status}">{mod.status}</span>
					{/if}
					{#if mod.stars != null}
						<span class="screen-badge stars">
							<StarIcon />{mod.stars}<span class="visually-hidden">
								{mod.stars === 1 ? ' star' : ' stars'}</span
							>
						</span>
					{/if}
					{#if latestRelease?.tag}
						<span class="screen-badge date">{latestRelease.label ?? latestRelease.tag}</span>
					{/if}
				</div>

				<h1 class="detail-title">{mod.name}</h1>
				<p class="detail-byline">
					by
					{#if mod.author_url}
						<a href={mod.author_url} target="_blank" rel="noopener noreferrer">
							{mod.author}
						</a>
					{:else if mod.repo}
						<a
							href="https://github.com/{mod.author}"
							target="_blank"
							rel="noopener noreferrer"
						>
							{mod.author}
						</a>
					{:else}
						{mod.author}
					{/if}
					{#if mod.repo && mod.status !== 'removed'}
						<span class="byline-sep">·</span>
						<a
							href="https://github.com/{mod.repo}"
							target="_blank"
							rel="noopener noreferrer"
						>
							{mod.repo}
						</a>
					{/if}
				</p>
				<p class="detail-lead">{mod.description}</p>
				{#if mod.status === 'removed'}
					<p class="detail-removed-note">
						The author deleted the source repository. Details are as last captured.
					</p>
				{/if}

				<div class="hero-actions">
					{#if mod.repo && mod.status !== 'removed'}
						<a
							class="hw-action-btn blue"
							href="https://github.com/{mod.repo}"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>View on GitHub&nbsp;<ExternalIcon /></span>
						</a>
					{:else if mod.website && siteHost}
						<a
							class="hw-action-btn blue"
							href={mod.website}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>Get it on <span class="ext-keep">{siteHost}&nbsp;<ExternalIcon /></span></span>
						</a>
					{/if}

					{#if (mod.repo || releasesLength) && latestReleaseUrl && mod.status !== 'removed'}
						<a
							class="hw-action-btn orange"
							href={latestReleaseUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>Download latest release{latestRelease?.tag ? ` (${latestRelease.label ?? latestRelease.tag})` : ''}</span>
						</a>
					{/if}

					{#if mod.website && mod.repo && mod.status !== 'removed'}
						<a
							class="hw-action-btn grey"
							href={mod.website}
							target="_blank"
							rel="noopener noreferrer"
						>
							<span>Website&nbsp;<ExternalIcon /></span>
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<style>
.detail-hero-band {
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		border-bottom: 4px solid var(--mpc-body-recess);
		padding: 1.15rem 0 1.65rem;
		margin-bottom: 1.75rem;
	}

.detail-hero-inner {
		width: min(1200px, 100% - 2rem);
		margin-inline: auto;
	}

.breadcrumbs {
		margin-bottom: 0.9rem;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
	}

.breadcrumbs ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

.breadcrumbs li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

.breadcrumbs li + li::before {
		content: '›' / '';
		color: #6b7284;
	}

.crumb-link {
		color: var(--mpc-screen-cyan);
		text-decoration: none;
	}

.crumb-link:hover {
		color: var(--mpc-screen-yellow);
	}

.crumb-current {
		color: var(--mpc-screen-yellow);
		text-decoration: none;
	}

.detail-screen-panel {
		background:
			linear-gradient(180deg, rgb(232 200 17 / 0.04) 0%, transparent 65%),
			var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-left: 4px solid var(--pad-glow, var(--mpc-screen-yellow));
		border-radius: 8px;
		padding: 1.25rem;
		box-shadow:
			inset 0 2px 10px rgb(0 0 0 / 0.85),
			0 1px 0 rgb(255 255 255 / 0.07);
		display: grid;
		grid-template-columns: minmax(260px, 360px) 1fr;
		gap: 1.5rem;
		align-items: center;
	}

.hero-bezel {
		width: 100%;
		padding: 0;
		cursor: default;
	}

/* A <button> doesn't resolve height: 100% for its child, so pin the image to the 4:3 frame. */

.hero-bezel .screen-img {
		position: absolute;
		inset: 0;
	}

.hero-bezel.is-clickable {
		cursor: zoom-in;
	}

.hero-info-col {
		display: grid;
		gap: 0.65rem;
		min-width: 0;
	}

.hero-badges {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

.detail-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-variation-settings: 'wdth' 100, 'wght' 600;
		font-size: clamp(1.5rem, 3.2vw, 2.2rem);
		line-height: 1.12;
		color: var(--mpc-screen-white);
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}

.detail-byline {
		margin: -0.2rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: #9ba3b4;
	}

.detail-byline a {
		color: var(--mpc-screen-cyan);
		text-decoration: none;
	}

.detail-byline a:hover {
		text-decoration: underline;
	}

.byline-sep {
		margin-inline: 0.35rem;
		opacity: 0.6;
	}

.detail-lead {
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.5;
		color: var(--mpc-screen-text);
		max-width: 68ch;
	}

.detail-removed-note {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: #9ba3b4;
	}

.hero-actions:empty {
		display: none;
	}

.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding-top: 0.25rem;
	}

.ext-keep {
		white-space: nowrap;
	}

@media (max-width: 720px) {
.detail-hero-inner {
			width: calc(100% - 1.25rem);
		}

.detail-screen-panel {
			grid-template-columns: 1fr;
			padding: 0.95rem;
			gap: 1rem;
		}
	}
</style>
