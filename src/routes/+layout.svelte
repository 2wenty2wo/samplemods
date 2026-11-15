<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/site.js';
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
	let repoStars = $state(/** @type {string | null} */ (null));

	const STAR_CACHE_KEY = 'samplemods_gh_stars';

	/** @param {number} n */
	function formatCompactStars(n) {
		if (n >= 1000) {
			return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
		}
		return String(n);
	}

	onMount(async () => {
		try {
			const cached = sessionStorage.getItem(STAR_CACHE_KEY);
			if (cached !== null) {
				const parsed = Number(cached);
				if (Number.isFinite(parsed) && parsed > 0) {
					repoStars = formatCompactStars(parsed);
					return;
				}
			}
		} catch {
			// Ignore sessionStorage errors
		}

		try {
			const res = await fetch('https://api.github.com/repos/2wenty2wo/samplemods', {
				headers: { Accept: 'application/vnd.github+json' }
			});
			if (!res.ok) return;
			const data = await res.json();
			const count = data?.stargazers_count;
			if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
				repoStars = formatCompactStars(count);
				try {
					sessionStorage.setItem(STAR_CACHE_KEY, String(count));
				} catch {
					// Ignore sessionStorage errors
				}
			}
		} catch {
			// Leave repoStars as null on network or rate-limit failure
		}
	});
</script>

<header class="site-topbar">
	<div class="site-topbar-inner">
		<a class="brand-lockup" href="{base}/">
			<LogoMark class="brand-mark" />
			<span class="wordmark">{SITE_NAME}</span>
		</a>

		<nav class="site-nav" aria-label="Primary">
			<a class="nav-link" href="{base}/submit/">Submit</a>
			<a class="nav-link" href="{base}/about/">About</a>
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
				inMusic Brands.
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
