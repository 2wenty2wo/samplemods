<script>
	import ExternalIcon from '$lib/ExternalIcon.svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { SITE_NAME } from '$lib/site.js';
	import catalogMeta from '$lib/catalog-meta.json';
	import LogoMark from '$lib/LogoMark.svelte';
	import StarIcon from '$lib/StarIcon.svelte';
	import WarningIcon from '$lib/WarningIcon.svelte';
	import interLatin400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
	import interLatin600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
	import interLatin700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
	import michromaLatin400 from '@fontsource/michroma/files/michroma-latin-400-normal.woff2?url';
	import archivoLatinWdth from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
	import archivoLatinWdthItalic from '@fontsource-variable/archivo/files/archivo-latin-wdth-italic.woff2?url';
	import jetbrainsLatinWght from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/600.css';
	import '@fontsource/inter/700.css';
	import '@fontsource/michroma/latin-400.css';
	import '@fontsource-variable/archivo/wdth.css';
	import '@fontsource-variable/archivo/wdth-italic.css';
	import '@fontsource-variable/jetbrains-mono/wght.css';
	import '$lib/font-fallbacks.css';
	import '../app.css';

	let { children } = $props();

	const fontPreloads = [
		interLatin400,
		interLatin600,
		interLatin700,
		michromaLatin400,
		archivoLatinWdth,
		archivoLatinWdthItalic,
		jetbrainsLatinWght
	];

	/** @param {string} path */
	function navCurrent(path) {
		const current = page.url.pathname.replace(/\/+$/, '') || '/';
		const target = `${base}${path}`.replace(/\/+$/, '') || '/';
		return current === target ? 'page' : undefined;
	}

	/** @param {number} n */
	function formatCompactStars(n) {
		if (n >= 1000) {
			return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
		}
		return String(n);
	}

	const repoStars =
		typeof catalogMeta?.stars === 'number' && catalogMeta.stars > 0
			? formatCompactStars(catalogMeta.stars)
			: null;
</script>

<svelte:head>
	{#each fontPreloads as href}
		<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" {href} />
	{/each}
	<link
		rel="alternate"
		type="application/rss+xml"
		title="Sample Mods: latest releases"
		href="{base}/releases.xml"
	/>
</svelte:head>

<a class="skip-link" href="#main-content">Skip to content</a>

<header class="site-topbar">
	<div class="site-topbar-inner">
		<a class="brand-lockup" href="{base}/" aria-current={navCurrent('/')}>
			<LogoMark class="brand-mark" />
			<span class="wordmark">{SITE_NAME}</span>
		</a>

		<nav class="site-nav" aria-label="Primary">
			<a class="nav-link" href="{base}/releases/" aria-current={navCurrent('/releases')}>Releases</a>
			<a class="nav-link" href="{base}/submit/" aria-current={navCurrent('/submit')}>Submit</a>
			<a class="nav-link" href="{base}/about/" aria-current={navCurrent('/about')}>About</a>
			<a
				class="nav-btn-blue"
				href="https://github.com/2wenty2wo/samplemods"
				target="_blank"
				rel="noopener noreferrer"
			>
				GitHub
			</a>
		</nav>
	</div>
</header>

<aside class="site-notice" aria-label="Firmware notice" data-nosnippet>
	<div class="site-notice-inner">
		<WarningIcon />
		<strong class="site-notice-lead">Unreleased firmware 1.4 breaks many current mods and apps.</strong>
		<span>Stay on 1.3.0.12 until the ones you use are updated.</span>
		<a class="site-notice-link" href="https://www.reddit.com/r/mpcsample/comments/1y2hryp/akai_mpc_sample_14_firmware_is_live/" target="_blank" rel="noopener noreferrer">Read the Reddit thread&nbsp;<ExternalIcon /></a>
	</div>
</aside>

<main id="main-content" class="site-main" tabindex="-1">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="site-footer-inner">
		<div class="footer-col">
			<div class="footer-brand">
				<LogoMark class="footer-mark" />
				<p class="wordmark footer-wordmark">{SITE_NAME}</p>
			</div>
			<p class="footer-copy">
				An independent, community-maintained index of mods, apps, games, tools and
				guides for the Akai MPC Sample. Not affiliated with or endorsed by Akai Professional /
				inMusic Brands. Installing mods or firmware is at your
				<a href="{base}/about/">own risk</a>.
			</p>
		</div>

		<div class="footer-col">
			<p class="footer-heading">Explore &amp; Contribute</p>
			<div class="footer-actions">
				<a
					class="hw-action-btn orange"
					href="https://github.com/2wenty2wo/samplemods"
					target="_blank"
					rel="noopener noreferrer"
				>
					<span><StarIcon />Star on GitHub{repoStars ? ` · ${repoStars}` : ''}</span>
				</a>
				<a
					class="hw-action-btn blue"
					href="https://github.com/2wenty2wo/samplemods/blob/main/CONTRIBUTING.md"
					target="_blank"
					rel="noopener noreferrer"
				>
					Contribute on GitHub
				</a>
			</div>
			<p class="footer-copy">
				<a href="{base}/submit/">How to submit an entry</a> ·
				<a href="{base}/about/">About this catalog</a> ·
				<a href="{base}/catalog.json">Public JSON feed</a>
			</p>
		</div>
	</div>
</footer>
