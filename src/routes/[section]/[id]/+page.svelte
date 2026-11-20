<script>
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/site.js';
	import SeoHead from '$lib/SeoHead.svelte';
	import { absoluteUrl, defaultShareImage, entryShareImage } from '$lib/seo.js';
	import {
		sectionGlow,
		githubEditEntryUrl,
		githubChangeEntryIssueUrl,
		installLabel,
		runsOnLabel,
		audienceLabel,
		hostnameOf,
		priceBadge
	} from '$lib/categories.js';
	import { assetUrl } from '$lib/media.js';
	import DetailHero from '$lib/components/DetailHero.svelte';
	import EntryQuickFacts from '$lib/components/EntryQuickFacts.svelte';
	import RelatedEntries from '$lib/components/RelatedEntries.svelte';
	import ScreenshotGallery from '$lib/components/ScreenshotGallery.svelte';
	import AboutReadme from '$lib/components/AboutReadme.svelte';
	import ReleasesList from '$lib/components/ReleasesList.svelte';
	import SuggestEditBar from '$lib/components/SuggestEditBar.svelte';
	import EntryLightbox from '$lib/components/EntryLightbox.svelte';

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
	const shareImage = $derived(
		data.redirectTo ? defaultShareImage(base) : entryShareImage(mod, base)
	);
	const detailTitle = $derived(`${mod.name} · ${SITE_NAME}`);
	const detailUrl = $derived(
		absoluteUrl(data.redirectTo ? data.redirectTo : data.canonicalPath, base)
	);
	const editOnGithubUrl = $derived(
		mod.id && mod.section ? githubEditEntryUrl({ id: mod.id, section: mod.section }) : '#'
	);
	const reportProblemUrl = $derived(githubChangeEntryIssueUrl(detailUrl));

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
			mod.latest_release?.html_url ??
			(mod.repo && mod.latest_release?.tag
				? `https://github.com/${mod.repo}/releases/tag/${mod.latest_release.tag}`
				: null)
	);
	const updatedDate = $derived(formatUpdated(mod.last_commit_at ?? mod.pushed_at));
	const readmeFold = $derived(splitReadmeHtml(mod.readme_html));
	const isLongReadme = $derived(readmeFold.tail.length > 0);
	const readmeHeadHtml = $derived(readmeFold.head);
	const readmeTailHtml = $derived(readmeFold.tail);
	// Skip entries already shown via Requires / Required by (e.g. LoopPad requires Boot Thingy).
	const compatibleIds = $derived(
		(mod.compatible ?? []).filter((id) => !(mod.required_by ?? []).includes(id))
	);
	const launcherIds = $derived(
		(mod.launchers ?? []).filter((id) => !(mod.requires ?? []).includes(id))
	);

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
		const raw = String(value);
		// Date-only YYYY-MM-DD: keep the calendar day (avoid UTC midnight shift).
		if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
			const [y, m, d] = raw.split('-').map(Number);
			return new Date(y, m - 1, d).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		}
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

	/**
	 * Split sanitized README HTML at a top-level block boundary so below-the-fold
	 * content can live inside a `hidden="until-found"` disclosure container.
	 * @param {string | null | undefined} html
	 */
	function splitReadmeHtml(html) {
		const raw = (html ?? '').trim();
		if (raw.length <= 1600) return { head: raw, tail: '' };
		const tokenRe = /<(\/?)([a-z0-9]+)(?:\s[^>]*)?>/gi;
		const voidTags = new Set([
			'area',
			'base',
			'br',
			'col',
			'embed',
			'hr',
			'img',
			'input',
			'link',
			'meta',
			'param',
			'source',
			'track',
			'wbr'
		]);
		let depth = 0;
		let textCount = 0;
		let blockCount = 0;
		let lastIdx = 0;
		let splitIdx = -1;
		let m;
		while ((m = tokenRe.exec(raw)) !== null) {
			textCount += raw.slice(lastIdx, m.index).replace(/\s+/g, ' ').length;
			const isClose = m[1] === '/';
			const tag = m[2].toLowerCase();
			const isSelfClose = voidTags.has(tag) || m[0].endsWith('/>');
			if (tag === 'img') textCount += 160;
			if (!isSelfClose) {
				if (isClose) depth = Math.max(0, depth - 1);
				else depth++;
			}
			lastIdx = tokenRe.lastIndex;
			if (depth === 0) {
				blockCount++;
				if ((textCount >= 620 || blockCount >= 6) && !/^h[1-6]$/.test(tag)) {
					splitIdx = lastIdx;
					break;
				}
			}
		}
		if (splitIdx === -1 || splitIdx >= raw.length) {
			return { head: raw, tail: '' };
		}
		const head = raw.slice(0, splitIdx).trim();
		const tail = raw.slice(splitIdx).trim();
		if (tail.replace(/<[^>]*>/g, '').trim().length < 200) {
			return { head: raw, tail: '' };
		}
		return { head, tail };
	}
</script>

<SeoHead
	title={data.redirectTo ? `Redirecting · ${SITE_NAME}` : detailTitle}
	description={data.redirectTo ? `This entry moved to ${data.redirectTo}.` : mod.description}
	url={detailUrl}
	image={shareImage}
	type={data.redirectTo ? 'website' : 'article'}
	noindex={!!data.redirectTo}
	refreshTo={data.redirectTo ? `${base}${data.redirectTo}` : null}
/>

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
		<DetailHero
			{mod}
			{install}
			{priceChip}
			{heroMedia}
			{pixelatedUrls}
			{latestRelease}
			{latestReleaseUrl}
			{siteHost}
			releasesLength={releases.length}
			{onScreenImageLoad}
			{openLightbox}
		/>

		<div class="wrap detail-grid">
			<aside class="detail-side-col" aria-label="Quick facts and related entries">
				<EntryQuickFacts
					{mod}
					{byId}
					{runsOnText}
					{install}
					{audienceText}
					{latestRelease}
					{latestReleaseUrl}
					{updatedDate}
					{formatUpdated}
				/>
				<RelatedEntries {mod} {byId} {compatibleIds} {launcherIds} />
			</aside>

			<div class="detail-main-col">
				<ScreenshotGallery
					{mod}
					{shots}
					{galleryShots}
					{logoSrc}
					{imageCreditHost}
					{pixelatedUrls}
					{onScreenImageLoad}
					{openLightbox}
				/>
				<AboutReadme
					{mod}
					{isLongReadme}
					{readmeHeadHtml}
					{readmeTailHtml}
					{siteHost}
					bind:readmeExpanded
				/>
				<ReleasesList {mod} {releases} {formatUpdated} />
				<SuggestEditBar {editOnGithubUrl} {reportProblemUrl} />
			</div>
		</div>
	</article>

	<EntryLightbox
		bind:lightbox
		bind:lightboxSrc
		{lightboxAlt}
		{pixelatedUrls}
		{closeLightbox}
	/>
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
	}
</style>
