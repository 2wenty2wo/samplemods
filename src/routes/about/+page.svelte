<script>
	import { base } from '$app/paths';
	import mods from '$lib/data.json';
	import { SITE_NAME } from '$lib/site.js';
</script>

<svelte:head>
	<title>About · {SITE_NAME}</title>
	<meta
		name="description"
		content="About {SITE_NAME}: an unofficial community index of open-source mods, apps, games, and tools."
	/>
</svelte:head>

<section class="page-hero-band">
	<div class="page-hero-inner">
		<a class="back-link" href="{base}/">← All mods</a>
		<div class="page-screen-box">
			<p class="page-kicker">ABOUT THIS PROJECT</p>
			<h1 class="page-title">{SITE_NAME}</h1>
			<p class="page-lead">
				A fast, static, community-curated directory of custom firmware mods, synths, games,
				developer tools, and guides for the portable standalone sampler ecosystem.
			</p>
		</div>
	</div>
</section>

<div class="wrap info-grid">
	<article class="info-card">
		<h2>Unofficial &amp; Independent</h2>
		<p>
			<strong>{SITE_NAME}</strong> is an independent community archive. It is not affiliated with,
			sponsored by, or endorsed by Akai Professional or inMusic Brands. All product names are used
			solely to describe compatibility.
		</p>
	</article>

	<article class="info-card">
		<h2>GitHub-Backed Data &amp; Public JSON API</h2>
		<p>
			The catalog currently indexes <strong>{mods.length} projects</strong> maintained in YAML files
			under <code>data/mods/</code> and automatically enriched with GitHub repository metadata
			(stars, licenses, latest releases, and push timestamps).
		</p>
		<p>
			Need machine-readable data for an installer or companion tool? Fetch the static JSON feed at
			<a href="{base}/catalog.json"><code>/catalog.json</code></a>.
		</p>
		<div class="info-actions">
			<a class="hw-action-btn blue" href="{base}/catalog.json">View /catalog.json</a>
			<a class="hw-action-btn orange" href="{base}/submit/">Submit a Mod</a>
		</div>
	</article>
</div>

<style>
	.page-hero-band {
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		border-bottom: 4px solid var(--mpc-body-recess);
		padding: 1.15rem 0 1.5rem;
		margin-bottom: 1.75rem;
	}

	.page-hero-inner {
		width: min(920px, 100% - 2rem);
		margin-inline: auto;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 0.75rem;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--mpc-screen-cyan);
		text-decoration: none;
	}

	.page-screen-box {
		background: var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-left: 4px solid var(--mpc-btn-blue-light);
		border-radius: 8px;
		padding: 1.25rem;
	}

	.page-kicker {
		margin: 0 0 0.25rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--mpc-screen-cyan);
	}

	.page-title {
		margin: 0 0 0.45rem;
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 850;
		font-stretch: 118%;
		font-variation-settings: 'wdth' 118, 'wght' 850;
		font-size: clamp(1.4rem, 3vw, 2rem);
		color: var(--mpc-screen-yellow);
	}

	.page-lead {
		margin: 0;
		color: var(--mpc-screen-text);
		max-width: 65ch;
	}

	.info-grid {
		width: min(920px, 100% - 2rem);
		display: grid;
		gap: 1.15rem;
	}

	.info-card {
		background: var(--mpc-body-mid);
		border: 2px solid #282b34;
		border-radius: var(--radius);
		padding: 1.25rem;
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			0 4px 0 #1b1d24;
		display: grid;
		gap: 0.6rem;
	}

	.info-card h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.15rem;
	}

	.info-card p {
		margin: 0;
		color: #25272e;
	}

	.info-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding-top: 0.35rem;
	}
</style>
