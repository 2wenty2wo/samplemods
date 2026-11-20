<script>
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { SITE_NAME } from '$lib/site.js';
	import catalogMeta from '$lib/catalog-meta.json';
	import LogoMark from '$lib/LogoMark.svelte';
	import StarIcon from '$lib/StarIcon.svelte';
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/600.css';
	import '@fontsource/inter/700.css';
	import '@fontsource/michroma/latin-400.css';
	import '@fontsource-variable/archivo/wdth.css';
	import '@fontsource-variable/archivo/wdth-italic.css';
	import '../app.css';

	let { children } = $props();

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
	<link
		rel="alternate"
		type="application/rss+xml"
		title="Sample Mods: latest releases"
		href="{base}/releases.xml"
	/>
</svelte:head>

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

<main class="site-main">
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
