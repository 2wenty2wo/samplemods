<script>
	import { base } from '$app/paths';
	import { SITE_NAME, SITE_ORIGIN } from '$lib/site.js';
	import {
		sectionGlow,
		sectionLabel,
		sectionSingular,
		sectionSingularLabel,
		entryPath,
		installLabel,
		runsOnLabel,
		audienceLabel,
		initials,
		hostnameOf,
		priceBadge,
		priceFact,
		sourceFact
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';

	let { data } = $props();
	const mod = $derived(data.mod ?? {});
	const byId = $derived(Object.fromEntries((data.mods ?? []).map((m) => [m.id, m])));
	const logoSrc = $derived(assetUrl(mod.logo));
	const shots = $derived((mod.screenshots ?? []).map((p) => assetUrl(p)).filter(Boolean));
	const install = $derived(installLabel(mod.install));
	const glow = $derived(sectionGlow(mod.section));
	const priceChip = $derived(priceBadge(mod.price));
	const siteHost = $derived(hostnameOf(mod.website));
	const imageCreditHost = $derived(siteHost ?? hostnameOf(mod.author_url));

	const runsOnText = $derived(
		(mod.runs_on ?? []).map((r) => runsOnLabel(r)).filter(Boolean).join(', ')
	);
	const audienceText = $derived(
		(mod.audience ?? []).map((a) => audienceLabel(a)).filter(Boolean).join(', ')
	);
	const releases = $derived((mod.releases ?? []).slice(0, 3));
	const latestRelease = $derived(releases[0] ?? mod.latest_release ?? null);
	const latestReleaseUrl = $derived(
		releases[0]?.html_url ??
			(mod.repo && mod.latest_release?.tag
				? `https://github.com/${mod.repo}/releases/tag/${mod.latest_release.tag}`
				: null)
	);
	const updatedDate = $derived(formatUpdated(mod.last_commit_at ?? mod.pushed_at));
	const isLongReadme = $derived((mod.readme_html?.length ?? 0) > 1600);

	let readmeExpanded = $state(false);

	// Reset readmeExpanded when navigating between entries
	$effect(() => {
		mod.id;
		readmeExpanded = false;
	});

	const heroMedia = $derived.by(() => {
		if (shots.length) return { kind: 'shot', src: shots[0] };
		if (logoSrc) return { kind: 'logo', src: logoSrc };
		return { kind: 'splash', src: null };
	});
	// The hero already shows the first screenshot; don't repeat it in the gallery.
	const galleryShots = $derived(heroMedia.kind === 'shot' ? shots.slice(1) : shots);

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

	/** @param {{ logo?: string | null, screenshots?: string[] }} entry */
	function miniCardMedia(entry) {
		if (entry.screenshots?.length) {
			return { kind: 'shot', src: assetUrl(entry.screenshots[0]) };
		}
		if (entry.logo) {
			return { kind: 'logo', src: assetUrl(entry.logo) };
		}
		return { kind: 'splash', src: null };
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
								<span class="screen-badge stars">★ {mod.stars}</span>
							{/if}
							{#if latestRelease?.tag}
								<span class="screen-badge date">{latestRelease.tag}</span>
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
							{#if mod.repo}
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

						<div class="hero-actions">
							{#if mod.repo}
								<a
									class="hw-action-btn blue"
									href="https://github.com/{mod.repo}"
									target="_blank"
									rel="noopener noreferrer"
								>
									View on GitHub ↗
								</a>
							{:else if mod.website && siteHost}
								<a
									class="hw-action-btn blue"
									href={mod.website}
									target="_blank"
									rel="noopener noreferrer"
								>
									Get it on {siteHost} ↗
								</a>
							{/if}

							{#if latestReleaseUrl}
								<a
									class="hw-action-btn orange"
									href={latestReleaseUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									<span>Download latest release{latestRelease?.tag ? ` (${latestRelease.tag})` : ''}</span>
								</a>
							{/if}

							{#if mod.website && mod.repo}
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

		<div class="wrap detail-grid">
			<!-- Right Sidebar on Desktop / Top Panel on Mobile: Quick Facts & Dependencies -->
			<aside class="detail-side-col" aria-label="Quick facts and related entries">
				<section class="detail-section quick-facts-section" aria-label="Quick facts">
					<h2 class="silk-heading">Quick facts</h2>
					<dl class="spec-dl">
						{#if runsOnText}
							<dt>Runs on</dt>
							<dd>{runsOnText}</dd>
						{/if}

						{#if install}
							<dt>Install</dt>
							<dd>{install}</dd>
						{/if}

						{#if audienceText}
							<dt>For</dt>
							<dd>{audienceText}</dd>
						{/if}

						<dt>Price</dt>
						<dd>{priceFact(mod.price, mod.price_note)}</dd>

						<dt>Source</dt>
						<dd>{sourceFact(mod.source)}</dd>

						{#if mod.requires?.length}
							<dt>Needs</dt>
							<dd>
								{#each mod.requires as reqId, idx}
									{#if idx > 0}, {/if}
									{#if byId[reqId]}
										<a href="{base}{entryPath(byId[reqId])}">{byId[reqId].name}</a>
									{:else}
										<code>{reqId}</code>
									{/if}
								{/each}
							</dd>
						{/if}

						{#if mod.firmware}
							<dt>Firmware</dt>
							<dd><code>{mod.firmware}</code></dd>
						{/if}

						{#if mod.license}
							<dt>Licence</dt>
							<dd>{mod.license}</dd>
						{/if}

						{#if latestRelease?.tag && latestReleaseUrl}
							<dt>Latest release</dt>
							<dd>
								<a href={latestReleaseUrl} rel="noopener noreferrer" target="_blank">
									{latestRelease.tag}
								</a>
								{#if formatUpdated(latestRelease.published_at)}
									<span class="release-date">· {formatUpdated(latestRelease.published_at)}</span>
								{/if}
							</dd>
						{/if}

						{#if updatedDate}
							<dt>Updated</dt>
							<dd>{updatedDate}</dd>
						{/if}

						{#if mod.contributors != null}
							<dt>Contributors</dt>
							<dd>{mod.contributors}</dd>
						{/if}

						{#if mod.open_issues != null && mod.repo}
							<dt>Open issues &amp; PRs</dt>
							<dd>
								<a
									href="https://github.com/{mod.repo}/issues"
									rel="noopener noreferrer"
									target="_blank"
								>
									{mod.open_issues}
								</a>
							</dd>
						{/if}
					</dl>
				</section>

				{#if mod.requires?.length}
					<section class="detail-section">
						<h2 class="silk-heading">Requires</h2>
						<ul class="mini-card-list">
							{#each mod.requires as id}
								{@const rel = byId[id]}
								<li>
									{#if rel}
										{@const media = miniCardMedia(rel)}
										<a
											class="pad-card mini-pad-card"
											href="{base}{entryPath(rel)}"
											style="--pad-glow: {sectionGlow(rel.section)}"
										>
											<div class="bezel-screen mini-bezel">
												{#if media.src}
													<img
														class="screen-img"
														class:is-logo={media.kind === 'logo'}
														src={media.src}
														alt=""
														loading="lazy"
													/>
												{:else}
													<span class="mini-initials">{initials(rel.name)}</span>
												{/if}
											</div>
											<div class="mini-card-info">
												<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
												<p class="mini-card-title">{rel.name}</p>
											</div>
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
										{@const media = miniCardMedia(rel)}
										<a
											class="pad-card mini-pad-card"
											href="{base}{entryPath(rel)}"
											style="--pad-glow: {sectionGlow(rel.section)}"
										>
											<div class="bezel-screen mini-bezel">
												{#if media.src}
													<img
														class="screen-img"
														class:is-logo={media.kind === 'logo'}
														src={media.src}
														alt=""
														loading="lazy"
													/>
												{:else}
													<span class="mini-initials">{initials(rel.name)}</span>
												{/if}
											</div>
											<div class="mini-card-info">
												<span class="chip chip-category">{sectionSingularLabel(rel.section)}</span>
												<p class="mini-card-title">{rel.name}</p>
											</div>
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
			</aside>

			<!-- Main Column: Screenshots, About (README), Recent Releases -->
			<div class="detail-main-col">
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

				<!-- About / README Section -->
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
								<div class="prose readme-prose">
									{@html mod.readme_html}
								</div>
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

				<!-- Recent Releases Section -->
				{#if releases.length}
					<section class="detail-section" aria-label="Recent releases">
						<h2 class="silk-heading">Recent releases</h2>
						<ul class="release-list">
							{#each releases as rel, i (rel.tag)}
								<li class="release-card">
									<div class="release-header">
										<div class="release-title-group">
											<a
												class="screen-badge date release-tag-link"
												href={rel.html_url}
												target="_blank"
												rel="noopener noreferrer"
											>
												{rel.tag}
											</a>
											{#if rel.name && rel.name !== rel.tag}
												<span class="release-title">{rel.name}</span>
											{/if}
											{#if formatUpdated(rel.published_at)}
												<span class="release-pub-date">{formatUpdated(rel.published_at)}</span>
											{/if}
										</div>
										<a
											class="release-ext-link"
											href={rel.html_url}
											target="_blank"
											rel="noopener noreferrer"
										>
											Release on GitHub ↗
										</a>
									</div>

									{#if rel.body_html?.trim()}
										<details class="release-details" open={i === 0}>
											<summary class="release-summary">
												<span class="release-summary-label">
													<span class="release-caret" aria-hidden="true"></span>
													<span>Release notes</span>
												</span>
												{#if rel.truncated}
													<span class="trunc-badge">Truncated</span>
												{/if}
											</summary>
											<div class="release-notes-box">
												<div class="prose release-prose">
													{@html rel.body_html}
												</div>
											</div>
											{#if rel.truncated}
												<p class="release-truncated-note">
													Truncated,
													<a href={rel.html_url} target="_blank" rel="noopener noreferrer">
														see full notes on GitHub ↗
													</a>
												</p>
											{/if}
										</details>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
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

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding-top: 0.25rem;
	}

	/* Two-column layout: Main (72ch prose + gallery + releases) & Right Hardware Readout Sidebar */
	.detail-grid {
		display: grid;
		grid-template-columns: minmax(0, 74ch) minmax(300px, 1fr);
		gap: 2rem;
		align-items: start;
	}

	.detail-main-col {
		grid-column: 1;
		grid-row: 1;
		display: grid;
		gap: 2rem;
		min-width: 0;
	}

	.detail-side-col {
		grid-column: 2;
		grid-row: 1;
		display: grid;
		gap: 1.5rem;
		min-width: 0;
	}

	.detail-section {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
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

	/* —— Screen-Styled Quick Facts Readout —— */
	.spec-dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		margin: 0;
		background: var(--mpc-screen-bg);
		border: 2px solid #262930;
		border-left: 4px solid var(--pad-glow, var(--mpc-screen-yellow));
		border-radius: 6px;
		overflow: hidden;
		font-family: var(--font-mono);
		box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.65);
	}

	.spec-dl dt,
	.spec-dl dd {
		margin: 0;
		padding: 0.55rem 0.85rem;
		border-bottom: 1px solid #1a1d24;
		font-size: 0.82rem;
		line-height: 1.4;
	}

	.spec-dl dt {
		color: var(--mpc-screen-cyan);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.7rem;
		font-weight: 700;
		background: #10131a;
		display: flex;
		align-items: center;
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
		font-size: 0.92em;
		color: var(--mpc-screen-text);
	}

	.release-date {
		color: var(--mpc-screen-text);
		opacity: 0.75;
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

	/* Shared Prose Formatting (README & Release Notes) */
	.prose {
		font-family: var(--font-sans);
		font-size: 0.94rem;
		line-height: 1.62;
		color: #1e2028;
		overflow-wrap: anywhere;
	}

	.prose > :global(:first-child) {
		margin-top: 0;
	}

	.prose > :global(:last-child) {
		margin-bottom: 0;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3),
	.prose :global(h4),
	.prose :global(h5),
	.prose :global(h6) {
		font-family: var(--font-display);
		font-weight: 800;
		color: #12141a;
		line-height: 1.25;
		margin: 1.35em 0 0.5em;
	}

	.prose :global(h1),
	.prose :global(h2) {
		font-size: 1.16rem;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid #dad6d0;
	}

	.prose :global(h3) {
		font-size: 1.02rem;
	}

	.prose :global(h4),
	.prose :global(h5),
	.prose :global(h6) {
		font-size: 0.94rem;
	}

	.prose :global(p),
	.prose :global(ul),
	.prose :global(ol),
	.prose :global(blockquote),
	.prose :global(pre),
	.prose :global(table) {
		margin: 0 0 0.9rem;
	}

	.prose :global(ul),
	.prose :global(ol) {
		padding-left: 1.4rem;
	}

	.prose :global(li + li) {
		margin-top: 0.25rem;
	}

	.prose :global(code) {
		font-family: var(--font-mono);
		font-size: 0.84em;
		background: #e3dfd9;
		color: #181a20;
		padding: 0.14em 0.36em;
		border-radius: 4px;
	}

	.prose :global(pre) {
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-text);
		border: 1.5px solid #262932;
		border-radius: 6px;
		padding: 0.85rem 1rem;
		overflow-x: auto;
		max-width: 100%;
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.prose :global(pre code) {
		background: none;
		color: inherit;
		padding: 0;
		font-size: inherit;
	}

	.prose :global(blockquote) {
		border-left: 3px solid var(--mpc-btn-orange);
		background: #eae6e0;
		padding: 0.55rem 0.9rem;
		border-radius: 0 5px 5px 0;
		color: #2c2f3a;
	}

	.prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 6px;
		display: inline-block;
	}

	.prose :global(table) {
		display: block;
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.prose :global(th),
	.prose :global(td) {
		border: 1px solid #c9c5be;
		padding: 0.42rem 0.65rem;
		text-align: left;
	}

	.prose :global(th) {
		background: #e3dfd9;
		font-weight: 700;
	}

	.prose :global(tr:nth-child(even) td) {
		background: #ece9e4;
	}

	.prose :global(hr) {
		border: none;
		border-top: 1px solid #d4d0c9;
		margin: 1.25rem 0;
	}

	/* —— Recent Releases Section —— */
	.release-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.85rem;
		max-width: 72ch;
	}

	.release-card {
		background: var(--mpc-body-mid);
		border: 2px solid #282b34;
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 3px 0 #1b1d24;
		padding: 0.9rem 1.1rem;
		display: grid;
		gap: 0.65rem;
	}

	.release-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.release-title-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.release-tag-link {
		text-decoration: none;
	}

	.release-title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.98rem;
		color: var(--mpc-pad-text);
	}

	.release-pub-date {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--mpc-silkscreen-muted);
	}

	.release-ext-link {
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--mpc-accent-red);
	}

	.release-details {
		background: #f4f2ef;
		border: 1.5px solid #b8b4ad;
		border-radius: 5px;
		overflow: hidden;
	}

	.release-summary {
		list-style: none;
		padding: 0.5rem 0.85rem;
		background: #e8e5e0;
		font-family: var(--font-sans);
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--mpc-silkscreen);
		cursor: pointer;
		user-select: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		transition: background 120ms ease, color 120ms ease;
	}

	.release-summary::-webkit-details-marker {
		display: none;
	}

	.release-summary:hover {
		background: #dedad3;
		color: var(--mpc-pad-text);
	}

	.release-summary-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.release-caret::before {
		content: '▸';
		display: inline-block;
		font-size: 0.85rem;
		line-height: 1;
		color: var(--mpc-accent-red);
	}

	.release-details[open] .release-caret::before {
		content: '▾';
	}

	.release-details[open] .release-summary {
		border-bottom: 1px solid #c9c5be;
	}

	.trunc-badge {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		padding: 0.1rem 0.38rem;
		border-radius: 3px;
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-yellow);
	}

	.release-notes-box {
		padding: 0.9rem 1rem;
		max-height: 320px;
		overflow-y: auto;
	}

	.release-prose {
		font-size: 0.88rem;
	}

	.release-truncated-note {
		margin: 0;
		padding: 0.55rem 1rem;
		background: #e6e2dc;
		border-top: 1px solid #c9c5be;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--mpc-silkscreen);
	}

	/* —— Related Mini-Cards (Requires / Required by) —— */
	.mini-card-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.65rem;
	}

	.mini-pad-card {
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		padding: 0.65rem 0.75rem;
		gap: 0.75rem;
	}

	.mini-bezel {
		width: 72px;
		flex-shrink: 0;
		border-width: 2px;
	}

	.mini-initials {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.9rem;
		color: var(--mpc-screen-yellow);
	}

	.mini-card-info {
		display: grid;
		gap: 0.28rem;
		min-width: 0;
		justify-items: start;
	}

	.mini-card-title {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-stretch: 110%;
		font-variation-settings: 'wdth' 110, 'wght' 800;
		font-size: 0.95rem;
		line-height: 1.2;
		color: var(--mpc-pad-text);
		overflow-wrap: anywhere;
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

	@media (max-width: 960px) {
		.detail-grid {
			grid-template-columns: 1fr;
			gap: 1.65rem;
		}

		.detail-side-col {
			grid-column: 1;
			grid-row: 1;
		}

		.detail-main-col {
			grid-column: 1;
			grid-row: 2;
		}

		.readme-card,
		.release-list {
			max-width: 100%;
		}
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

		.readme-viewport {
			padding: 1rem 1.05rem;
		}

		.readme-footer {
			padding: 0.55rem 1.05rem;
		}
	}
</style>
