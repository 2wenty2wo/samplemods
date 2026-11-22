<script>
	import ExternalIcon from '$lib/ExternalIcon.svelte';
	import { base } from '$app/paths';
	import mods from '$lib/data.json';
	import { SITE_NAME } from '$lib/site.js';
	import SeoHead from '$lib/SeoHead.svelte';
	import { absoluteUrl, defaultShareImage } from '$lib/seo.js';

	const title = `About · ${SITE_NAME}`;
	const description = `About ${SITE_NAME}: an unofficial community index of mods, apps, games, and tools — mostly open source on GitHub, with some independent or paid releases.`;
</script>

<SeoHead title={title} description={description} url={absoluteUrl('/about/', base)} image={defaultShareImage(base)} />

<section class="page-hero-band">
	<div class="page-hero-inner">
		<a class="back-link" href="{base}/">← All entries</a>
		<div class="page-screen-box">
			<p class="page-kicker">ABOUT THIS PROJECT</p>
			<h1 class="page-title">{SITE_NAME}</h1>
			<p class="page-lead">
				A fast, static, community-curated directory of custom firmware mods, synths, games,
				developer tools, and guides for the Akai MPC Sample standalone sampler.
			</p>
		</div>
	</div>
</section>

<div class="wrap info-grid">
	<article class="info-card">
		<h2>Unofficial, Independent &amp; At Your Own Risk</h2>
		<p>
			<strong>{SITE_NAME}</strong> is an independent community archive. It is not affiliated with,
			sponsored by, or endorsed by Akai Professional, inMusic Brands, or any maker listed here.
		</p>
		<p>
			<strong>A listing is not a recommendation.</strong> We don't make, test, host or support the
			mods, apps, games and tools in the catalog. Links go to sites run by others, and we're not
			responsible for their content.
		</p>
		<p>
			<strong>Install at your own risk.</strong> Installing mods or custom firmware can void your
			warranty, erase your projects or stop your MPC Sample working. {SITE_NAME} accepts no liability
			for any loss or damage.
		</p>
		<p>
			Versions, dates and links are refreshed automatically but may be out of date. Check the original
			source before installing anything. READMEs, screenshots and logos shown here belong to their
			authors.
		</p>
		<p>
			Akai, Akai Professional and MPC are trademarks of inMusic Brands, Inc. Other names belong to
			their owners and are used only to describe compatibility.
		</p>
	</article>

	<article class="info-card">
		<h2>Catalog Data &amp; Public JSON API</h2>
		<p>
			The catalog currently indexes <strong>{mods.length} entries</strong> maintained in YAML files
			under <code>data/&lt;section&gt;/&lt;id&gt;/</code>. Most are open source on GitHub (preferred —
			stars, README, and releases power the detail page); a few paid or closed releases are linked
			to the maker’s site instead. GitHub-backed entries are enriched with repository metadata
			(stars, licenses, latest releases, and push timestamps), refreshed every 6 hours.
		</p>
		<p>
			Need machine-readable data for an installer or companion tool? Fetch the static JSON feed at
			<a href="{base}/catalog.json"><code>/catalog.json</code></a>.
		</p>
		<div class="info-actions">
			<a class="hw-action-btn blue" href="{base}/catalog.json">View /catalog.json</a>
			<a class="hw-action-btn orange" href="{base}/submit/">Submit an Entry</a>
		</div>
	</article>

	<article class="info-card">
		<h2>Project Authors &amp; Takedown / Edit Requests</h2>
		<p>
			Made one of these projects? Want your listing, description or images changed or removed? Prefer
			<strong>Edit this entry on GitHub</strong> on the entry page (opens a pull request). Or
			<a
				href="https://github.com/2wenty2wo/samplemods/issues/new?template=change-entry.yml"
				target="_blank"
				rel="noopener noreferrer"
			>
				open an issue
			</a>
			and we'll apply it (still needs a GitHub account; issues don't count as contributions).
		</p>
		<div class="info-actions">
			<a class="hw-action-btn orange" href="{base}/submit/">How to contribute</a>
			<a
				class="hw-action-btn grey"
				href="https://github.com/2wenty2wo/samplemods/issues/new?template=change-entry.yml"
				target="_blank"
				rel="noopener noreferrer"
			>
				<span>Issue form&nbsp;<ExternalIcon /></span>
			</a>
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
		display: inline-block;
		margin: 0 0 0.7rem;
		padding: 0.2rem 0.6rem;
		border-radius: 1px;
		background: var(--mpc-screen-white);
		color: #000;
		font-family: var(--font-screen);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.page-title {
		margin: 0 0 0.45rem;
		font-family: var(--font-display);
		font-weight: 600;
		font-variation-settings: 'wdth' 100, 'wght' 600;
		font-size: clamp(1.4rem, 3vw, 2rem);
		color: var(--mpc-screen-white);
		letter-spacing: -0.01em;
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
