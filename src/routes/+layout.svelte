<script>
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/site.js';
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/600.css';
	import '@fontsource/inter/700.css';
	import '@fontsource-variable/archivo/wdth.css';
	import '@fontsource-variable/archivo/wdth-italic.css';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
	<meta
		name="description"
		content="Community catalog of Akai MPC Sample mods, add-ons, apps, games, tools, and guides."
	/>
</svelte:head>

<header class="site-topbar">
	<div class="site-topbar-inner">
		<a class="brand-lockup" href="{base}/">
			<span class="status-led" aria-hidden="true"></span>
			<span class="wordmark">{SITE_NAME}</span>
		</a>

		<nav class="site-nav" aria-label="Primary">
			<a class="nav-link" href="{base}/">Mods</a>
			<a class="nav-link" href="{base}/submit/">Submit</a>
			<a class="nav-link" href="{base}/about/">About</a>
			<a
				class="nav-btn-blue"
				href="https://github.com/"
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
			<p class="footer-brand">{SITE_NAME}</p>
			<p class="footer-copy">
				An independent, community-maintained index of open-source firmware mods, standalone apps,
				games, tools, and guides for the portable sampler ecosystem. Not affiliated with or
				endorsed by Akai Professional / inMusic Brands.
			</p>
		</div>

		<div class="footer-col">
			<p class="footer-heading">Explore &amp; Contribute</p>
			<p class="footer-copy">
				<a href="{base}/submit/">How to submit a mod</a> ·
				<a href="{base}/about/">About this catalog</a> ·
				<a href="{base}/catalog.json">Public JSON feed (/catalog.json)</a>
			</p>
		</div>
	</div>
</footer>
