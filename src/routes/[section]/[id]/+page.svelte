<script>
	import { base } from '$app/paths';
	import { SITE_NAME, SITE_ORIGIN } from '$lib/site.js';
	import {
		sectionGlow,
		sectionLabel,
		sectionSingular,
		sectionSingularLabel,
		entryPath,
		installLabel
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	let { data } = $props();
	const mod = $derived(data.mod ?? {});
	const byId = $derived(Object.fromEntries((data.mods ?? []).map((m) => [m.id, m])));
	const logoSrc = $derived(assetUrl(mod.logo));
	const shots = $derived((mod.screenshots ?? []).map((p) => assetUrl(p)).filter(Boolean));
	const install = $derived(installLabel(mod.install));
	const glow = $derived(sectionGlow(mod.section));

	const heroMedia = $derived.by(() => {
		if (shots.length) return { kind: 'shot', src: shots[0] };
		if (logoSrc) return { kind: 'logo', src: logoSrc };
		return { kind: 'splash', src: null };
	});

	/** Track image URLs whose naturalWidth <= 400 so 320×240 captures render pixelated */
	let pixelatedUrls = $state(/** @type {Record<string, boolean>} */ ({}));

	/** @type {HTMLDialogElement | undefined} */
	let lightbox = $state();
	let lightboxSrc = $state(/** @type {string | null} */ (null));
	let lightboxAlt = $state('');

	$effect(() => {
		if (data.redirectTo && typeof window !== 'undefined') {
			window.location.replace(`${base}${data.redirectTo}`);
		}
	});

	/** @param {string | number | null | undefined} value */
	function formatUpdated(value) {
		if (!value) return null;
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	/** @param {Event} e @param {string | null} src */
	function onScreenImageLoad(e, src) {
		if (!src) return;
		const img = /** @type {HTMLImageElement} */ (e.currentTarget);
		if (img.naturalWidth > 0 && img.naturalWidth <= 400) {
			pixelatedUrls[src] = true;
		}
	}

	/** @param {string} src @param {string} alt */
	function openLightbox(src, alt) {
		lightboxSrc = src;
		lightboxAlt = alt;
		lightbox?.showModal();
	}

	function closeLightbox() {
		lightbox?.close();
		lightboxSrc = null;
	}
</script>

<svelte:head>
	{#if data.redirectTo}
		<title>Redirecting · {SITE_NAME}</title>
		<link rel="canonical" href="{SITE_ORIGIN}{base}{data.redirectTo}" />
		<meta http-equiv="refresh" content="0; url={base}{data.redirectTo}" />
		<meta name="robots" content="noindex" />
	{:else}
		<title>{mod.name} · {SITE_NAME}</title>
		<meta name="description" content={mod.description} />
		<link rel="canonical" href="{SITE_ORIGIN}{base}{data.canonicalPath}" />
	{/if}
</svelte:head>

{#if data.redirectTo}
	<div class="wrap redirect-stub">
		<div class="pad-card redirect-card" style="--pad-glow: {glow}">
			<p class="silk-label">ENTRY MOVED</p>
			<h1 class="redirect-title">Redirecting {data.id}…</h1>
			<p class="redirect-copy">
				This entry now lives at
				<a href="{base}{data.redirectTo}"><code>{base}{data.redirectTo}</code></a>.
			</p>
		</div>
	</div>
{:else}
	<article class="detail" style="--pad-glow: {glow}">
		<!-- Black Screen-Styled Hero Band -->
		<section class="detail-hero-band">
			<div class="detail-hero-inner">
				<nav class="breadcrumbs" aria-label="Breadcrumb">
					<a class="crumb-link" href="{base}/">All</a>
					<span class="crumb-sep" aria-hidden="true">›</span>
					<a class="crumb-link" href="{base}/?section={sectionSingular(mod.section)}">
						{sectionLabel(mod.section)}
					</a>
					<span class="crumb-sep" aria-hidden="true">›</span>
					<span class="crumb-current" aria-current="page">{mod.name}</span>
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

					<!-- Mod Info & Hardware Action Buttons -->
					<div class="hero-info-col">
						<div class="hero-badges">
							<span class="chip chip-category">{sectionSingularLabel(mod.section)}</span>
							{#if install}
								<span class="chip chip-install">{install}</span>
							{/if}
							{#if mod.status}
								<span class="badge-status {mod.status}">{mod.status}</span>
							{/if}
							{#if mod.stars != null}
								<span class="screen-badge stars">★ {mod.stars}</span>
							{/if}
							{#if mod.latest_release?.tag}
								<span class="screen-badge date">{mod.latest_release.tag}</span>
							{/if}
						</div>

						<h1 class="detail-title">{mod.name}</h1>
						<p class="detail-lead">{mod.description}</p>

						<div class="hero-actions">
							<a
								class="hw-action-btn blue"
								href="https://github.com/{mod.repo}"
								target="_blank"
								rel="noopener noreferrer"
							>
								View on GitHub ↗
							</a>

							{#if mod.latest_release?.tag}
								<a
									class="hw-action-btn orange"
									href="https://github.com/{mod.repo}/releases/tag/{mod.latest_release.tag}"
									target="_blank"
									rel="noopener noreferrer"
								>
									Latest release ({mod.latest_release.tag})
								</a>
							{/if}

							{#if mod.website}
								<a
									class="hw-action-btn grey"
									href={mod.website}
									target="_blank"
									rel="noopener noreferrer"
								>
									Website ↗
								</a>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</section>

		<div class="wrap detail-body">
			{#if shots.length}
				<section class="detail-section" aria-label="Screenshots">
					<div class="section-header">
						<h2 class="silk-heading">Screenshots ({shots.length})</h2>
						<p class="image-credit">
							Images: from
							<a href="https://github.com/{mod.repo}" target="_blank" rel="noopener noreferrer">
								{mod.repo}
							</a>
						</p>
					</div>

					<ul class="shot-grid">
						{#each shots as src, i}
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
										loading="lazy"
										onload={(e) => onScreenImageLoad(e, src)}
									/>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{:else if logoSrc}
				<p class="image-credit standalone-credit">
					Images: from
					<a href="https://github.com/{mod.repo}" target="_blank" rel="noopener noreferrer">
						{mod.repo}
					</a>
				</p>
			{/if}

			<!-- Technical Specifications Readout -->
			<section class="detail-section" aria-label="Specifications">
				<h2 class="silk-heading">Specifications</h2>
				<dl class="spec-dl">
					<dt>Section</dt>
					<dd>
						<a href="{base}/?section={sectionSingular(mod.section)}">{sectionLabel(mod.section)}</a>
					</dd>

					<dt>Author</dt>
					<dd>{mod.author}</dd>

					<dt>Repository</dt>
					<dd>
						<a href="https://github.com/{mod.repo}" rel="noopener noreferrer" target="_blank">
							{mod.repo}
						</a>
					</dd>

					{#if mod.firmware}
						<dt>Firmware</dt>
						<dd><code>{mod.firmware}</code></dd>
					{/if}

					{#if install}
						<dt>Install method</dt>
						<dd>{install}</dd>
					{/if}

					{#if mod.status}
						<dt>Status</dt>
						<dd>{mod.status}</dd>
					{/if}

					{#if mod.tags?.length}
						<dt>Tags</dt>
						<dd>{mod.tags.join(', ')}</dd>
					{/if}

					{#if mod.license}
						<dt>License</dt>
						<dd>{mod.license}</dd>
					{/if}

					{#if mod.stars != null}
						<dt>Stars</dt>
						<dd>★ {mod.stars}</dd>
					{/if}

					{#if mod.latest_release?.tag}
						<dt>Latest release</dt>
						<dd>
							<a
								href="https://github.com/{mod.repo}/releases/tag/{mod.latest_release.tag}"
								rel="noopener noreferrer"
								target="_blank"
							>
								{mod.latest_release.tag}
							</a>
							{#if formatUpdated(mod.latest_release.published_at)}
								<span class="release-date">· {formatUpdated(mod.latest_release.published_at)}</span>
							{/if}
						</dd>
					{/if}

					{#if formatUpdated(mod.pushed_at)}
						<dt>Updated</dt>
						<dd>{formatUpdated(mod.pushed_at)}</dd>
					{/if}
				</dl>
			</section>

			<!-- Dependency Mini-Cards: Requires / Required by -->
			{#if mod.requires?.length || mod.required_by?.length}
				<div class="dep-columns">
					{#if mod.requires?.length}
						<section class="detail-section">
							<h2 class="silk-heading">Requires</h2>
							<ul class="mini-card-list">
								{#each mod.requires as id}
									{@const rel = byId[id]}
									<li>
										{#if rel}
											<a
												class="pad-card mini-pad-card"
												href="{base}{entryPath(rel)}"
												style="--pad-glow: {sectionGlow(rel.section)}"
											>
												<div class="mini-card-top">
													<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
													{#if rel.stars != null}
														<span class="screen-badge stars">★ {rel.stars}</span>
													{/if}
												</div>
												<p class="mini-card-title">{rel.name}</p>
												<p class="mini-card-desc">{rel.description}</p>
											</a>
										{:else}
											<div class="pad-card mini-pad-card">
												<code>{id}</code>
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}

					{#if mod.required_by?.length}
						<section class="detail-section">
							<h2 class="silk-heading">Required by</h2>
							<ul class="mini-card-list">
								{#each mod.required_by as id}
									{@const rel = byId[id]}
									<li>
										{#if rel}
											<a
												class="pad-card mini-pad-card"
												href="{base}{entryPath(rel)}"
												style="--pad-glow: {sectionGlow(rel.section)}"
											>
												<div class="mini-card-top">
													<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
													{#if rel.stars != null}
														<span class="screen-badge stars">★ {rel.stars}</span>
													{/if}
												</div>
												<p class="mini-card-title">{rel.name}</p>
												<p class="mini-card-desc">{rel.description}</p>
											</a>
										{:else}
											<div class="pad-card mini-pad-card">
												<code>{id}</code>
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</section>
					{/if}
				</div>
			{/if}
		</div>
	</article>

	<dialog
		bind:this={lightbox}
		class="lightbox"
		onclick={(e) => {
			if (e.target === lightbox) closeLightbox();
		}}
		onclose={() => {
			lightboxSrc = null;
		}}
	>
		{#if lightboxSrc}
			<div class="bezel-screen lightbox-screen">
				<img
					class="screen-img"
					class:pixelated={pixelatedUrls[lightboxSrc]}
					src={lightboxSrc}
					alt={lightboxAlt}
				/>
			</div>
		{/if}
		<form method="dialog" class="lightbox-actions">
			<button type="submit" class="hw-action-btn orange">Close</button>
		</form>
	</dialog>
{/if}

<style>
	.redirect-stub {
		padding-top: 2.5rem;
	}

	.redirect-card {
		max-width: 540px;
		margin-inline: auto;
		padding: 1.5rem;
	}

	.redirect-title {
		margin: 0.25rem 0;
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 800;
	}

	.redirect-copy {
		margin: 0;
	}

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
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.9rem;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
	}

	.crumb-link {
		color: var(--mpc-screen-cyan);
		text-decoration: none;
	}

	.crumb-link:hover {
		color: var(--mpc-screen-yellow);
	}

	.crumb-sep {
		color: #6b7284;
	}

	.crumb-current {
		color: var(--mpc-screen-yellow);
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

	.hero-bezel.is-clickable {
		cursor: zoom-in;
	}

	.hero-info-col {
		display: grid;
		gap: 0.75rem;
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
		font-style: italic;
		font-weight: 850;
		font-stretch: 118%;
		font-variation-settings: 'wdth' 118, 'wght' 850;
		font-size: clamp(1.5rem, 3.2vw, 2.2rem);
		line-height: 1.12;
		color: var(--mpc-screen-yellow);
		letter-spacing: 0.01em;
		overflow-wrap: anywhere;
	}

	.detail-lead {
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.5;
		color: var(--mpc-screen-text);
		max-width: 68ch;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding-top: 0.25rem;
	}

	.detail-body {
		display: grid;
		gap: 2rem;
	}

	.detail-section {
		display: grid;
		gap: 0.75rem;
	}

	.section-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.silk-heading {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mpc-silkscreen-muted);
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
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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

	.spec-dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		margin: 0;
		background: var(--mpc-screen-bg);
		border: 2px solid #262930;
		border-radius: 6px;
		overflow: hidden;
		font-family: var(--font-mono);
		box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.65);
	}

	.spec-dl dt,
	.spec-dl dd {
		margin: 0;
		padding: 0.6rem 0.95rem;
		border-bottom: 1px solid #1a1d24;
		font-size: 0.875rem;
	}

	.spec-dl dt {
		color: var(--mpc-screen-cyan);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.74rem;
		font-weight: 700;
		background: #10131a;
	}

	.spec-dl dd {
		color: var(--mpc-screen-yellow);
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.spec-dl > :nth-last-child(-n + 2) {
		border-bottom: none;
	}

	.spec-dl dd a {
		color: var(--mpc-screen-cyan);
	}

	.spec-dl code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		color: var(--mpc-screen-text);
	}

	.release-date {
		color: var(--mpc-screen-text);
		opacity: 0.75;
	}

	.dep-columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
		gap: 1.5rem;
	}

	.mini-card-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.mini-pad-card {
		padding: 0.85rem;
		gap: 0.4rem;
	}

	.mini-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.mini-card-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-stretch: 110%;
		font-variation-settings: 'wdth' 110, 'wght' 800;
		font-size: 1rem;
		color: var(--mpc-pad-text);
	}

	.mini-card-desc {
		margin: 0;
		font-size: 0.82rem;
		color: #2c2e36;
	}

	.lightbox {
		border: 2px solid #262930;
		border-radius: 8px;
		padding: 1rem;
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		width: min(860px, 94vw);
	}

	.lightbox::backdrop {
		background: rgb(0 0 0 / 0.76);
	}

	.lightbox-screen {
		margin-bottom: 0.85rem;
	}

	.lightbox-actions {
		display: flex;
		justify-content: flex-end;
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

		.spec-dl {
			grid-template-columns: 1fr;
		}

		.spec-dl dt {
			padding-bottom: 0.2rem;
			border-bottom: none;
		}

		.spec-dl dd {
			padding-top: 0.2rem;
		}
	}
</style>
