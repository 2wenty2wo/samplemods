<script>
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/site.js';
</script>

<svelte:head>
	<title>Submit an Entry · {SITE_NAME}</title>
	<meta
		name="description"
		content="How to submit or update an entry in the {SITE_NAME} community catalog via pull request."
	/>
</svelte:head>

<section class="page-hero-band">
	<div class="page-hero-inner">
		<a class="back-link" href="{base}/">← All entries</a>
		<div class="page-screen-box">
			<p class="page-kicker">CONTRIBUTING GUIDE</p>
			<h1 class="page-title">How to Add or Update an Entry</h1>
			<p class="page-lead">
				Every entry in {SITE_NAME} is a tiny YAML file and an optional media folder in Git. Open a
				pull request and CI validates everything automatically.
			</p>
		</div>
	</div>
</section>

<div class="wrap info-grid">
	<article class="info-card">
		<span class="step-badge">STEP 1</span>
		<h2>Add a YAML entry in <code>data/&lt;section&gt;/&lt;id&gt;/&lt;type&gt;.yaml</code></h2>
		<p>
			Pick mods, apps, games, tools, guides, or dev. Use mod.yaml, app.yaml, game.yaml, tool.yaml, guide.yaml, or dev.yaml respectively. The folder supplies the section and the unique entry ID; omit section from YAML. Only a
			few fields are required; GitHub stars, latest release tags, and push dates are enriched
			automatically.
		</p>
		<pre class="code-screen"><code>name: SampQOL OS
description: 'Free SD-card mod for the Akai MPC Sample (firmware 1.3.0)'
repo: snarebes/SampQOL-OS
author: snarebes
firmware: 1.3.0
install: sd-card
status: beta
tags:
  - os
  - qol</code></pre>
	</article>

	<article class="info-card">
		<span class="step-badge">STEP 2</span>
		<h2>Drop screenshots or a logo in <code>data/&lt;section&gt;/&lt;id&gt;/</code></h2>
		<p>
			No YAML changes are needed for images—<code>scripts/build-data.js</code> discovers them
			automatically on build:
		</p>
		<ul class="info-list">
			<li>
				<code>data/&lt;section&gt;/&lt;id&gt;/screenshots/01-splash.png</code> — 4:3 device screen captures
				(<code>320×240</code> renders crisp with <code>image-rendering: pixelated</code>) or
				hardware photos (<code>.png</code>, <code>.webp</code>, <code>.jpg</code>,
				<code>.gif</code>).
			</li>
			<li>
				<code>data/&lt;section&gt;/&lt;id&gt;/logo.svg</code> (or <code>.png</code> / <code>.webp</code>) —
				optional logo displayed when no screenshots are present.
			</li>
			<li>
				Record the upstream source URL and license for any images in
				<code>data/media-sources.json</code>, keep individual files under <strong>500 KB</strong>,
				and run <code>npm test</code>.
			</li>
		</ul>
	</article>

	<article class="info-card">
		<span class="step-badge">STEP 3</span>
		<h2>Run <code>npm test</code> and open a Pull Request</h2>
		<p>
			<code>npm test</code> validates your YAML against the JSON schema, checks dependency links
			(<code>requires</code> / <code>required_by</code>), and verifies every media folder matches a
			valid entry ID.
		</p>
		<div class="info-actions">
			<a
				class="hw-action-btn blue"
				href="https://github.com/2wenty2wo/samplemods"
				target="_blank"
				rel="noopener noreferrer"
			>
				Open GitHub Repository ↗
			</a>
			<a
				class="hw-action-btn orange"
				href="https://github.com/2wenty2wo/samplemods/blob/main/CONTRIBUTING.md"
				target="_blank"
				rel="noopener noreferrer"
			>
				Read CONTRIBUTING.md ↗
			</a>
			<a class="hw-action-btn grey" href="{base}/">Back to Catalog</a>
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
		border-left: 4px solid var(--mpc-btn-orange);
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

	.step-badge {
		justify-self: start;
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-yellow);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
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

	.info-list {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.4rem;
		color: #25272e;
	}

	.code-screen {
		margin: 0.25rem 0 0;
		padding: 0.85rem 1rem;
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-yellow);
		border: 2px solid #252934;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		overflow-x: auto;
	}

	.info-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		padding-top: 0.35rem;
	}
</style>
