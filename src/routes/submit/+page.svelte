<script>
	import { base } from '$app/paths';
	import CaretIcon from '$lib/CaretIcon.svelte';
	import { SITE_NAME } from '$lib/site.js';
	import SeoHead from '$lib/SeoHead.svelte';
	import { absoluteUrl, defaultShareImage } from '$lib/seo.js';
	import {
		SECTIONS,
		sectionLabel,
		sectionExplainer,
		githubNewEntryUrl,
		githubNewEntryIssueUrl,
		githubChangeEntryIssueUrl
	} from '$lib/categories.js';

	const title = `Submit an Entry · ${SITE_NAME}`;
	const description = `Add or update a catalog entry on GitHub. Your change becomes a pull request and you're credited as a contributor once it's merged.`;
	const newEntryIssueUrl = githubNewEntryIssueUrl();
	const changeEntryIssueUrl = githubChangeEntryIssueUrl();
</script>

<SeoHead title={title} description={description} url={absoluteUrl('/submit/', base)} image={defaultShareImage(base)} />

<section class="page-hero-band">
	<div class="page-hero-inner">
		<a class="back-link" href="{base}/">← All entries</a>
		<div class="page-screen-box">
			<p class="page-kicker">CONTRIBUTING GUIDE</p>
			<h1 class="page-title">Add or update a project</h1>
			<p class="page-lead">
				Everything happens on GitHub (free account needed). Your change becomes a pull request, and
				you're credited as a contributor once it's merged.
			</p>
		</div>
	</div>
</section>

<div class="wrap info-grid">
	<article class="info-card">
		<h2>Add a project</h2>
		<p>Pick the section that fits, then GitHub opens a starter file for you to edit.</p>
		<div class="section-picker">
			{#each SECTIONS as section}
				<a
					class="section-link"
					href={githubNewEntryUrl(section)}
					target="_blank"
					rel="noopener noreferrer"
				>
					<span class="section-name">{sectionLabel(section)}</span>
					<span class="section-hint">{sectionExplainer(section)}</span>
				</a>
			{/each}
		</div>
		<ol class="steps">
			<li>Pick a section — GitHub opens a pre-filled file.</li>
			<li>Change <code>your-id</code> in the file name and fill in the fields.</li>
			<li>Click <strong>Propose changes</strong>, then <strong>Create pull request</strong>.</li>
		</ol>
	</article>

	<article class="info-card">
		<h2>Fix a listing</h2>
		<p>
			Use <strong>Edit this entry on GitHub</strong> at the bottom of any
			<a href="{base}/">entry page</a>.
		</p>
	</article>

	<details class="info-card details-card">
		<summary><CaretIcon /><span>What goes in the file?</span></summary>
		<div class="details-body">
			<pre class="code-screen"><code>name: My Project
description: A concise description of what the project does and where it runs.
repo: owner/repository
# Or omit repo and set website instead:
# website: https://example.com/project
author: owner
install: sd-card
runs_on: [device]
audience: [musician]
# tags: [example]</code></pre>
			<p>
				Screenshots go in <code>data/&lt;section&gt;/&lt;id&gt;/screenshots/</code>; optional
				<code>logo.*</code> beside the YAML. Keep images under 500&nbsp;KB. Full notes in
				<a
					href="https://github.com/2wenty2wo/samplemods/blob/main/CONTRIBUTING.md"
					target="_blank"
					rel="noopener noreferrer">CONTRIBUTING.md</a
				>.
			</p>
		</div>
	</details>

	<details class="info-card details-card">
		<summary><CaretIcon /><span>Prefer to work locally?</span></summary>
		<div class="details-body">
			<ol class="steps">
				<li>Fork <code>2wenty2wo/samplemods</code> on GitHub and clone your fork.</li>
				<li>Run <code>npm ci</code>.</li>
				<li>
					Create <code>data/&lt;section&gt;/&lt;your-id&gt;/&lt;type&gt;.yaml</code> (same fields as
					the starter file); put images in
					<code>data/&lt;section&gt;/&lt;your-id&gt;/screenshots/</code> (<code>logo.*</code>
					optional), ≤500&nbsp;KB each.
				</li>
				<li>Run <code>npm test</code> (validates your YAML, ids and media).</li>
				<li>
					Optional: <code>npm run dev</code> to see your entry at
					<code>/&lt;section-singular&gt;/&lt;your-id&gt;/</code>.
				</li>
				<li>Commit on a branch, push to your fork, open a pull request to <code>main</code>.</li>
			</ol>
			<p>
				Don't edit bot-owned <code>data/github.json</code>, <code>data/readme/**</code>,
				<code>data/contributors.json</code>, or <code>data/watch.json</code> (see
				<a
					href="https://github.com/2wenty2wo/samplemods/blob/main/CONTRIBUTING.md"
					target="_blank"
					rel="noopener noreferrer">CONTRIBUTING.md</a
				>
				for the full protected list).
			</p>
		</div>
	</details>

	<p class="issue-fallback">
		Rather not edit a file? Open an issue and we'll add it for you (still needs a GitHub account;
		issues don't count as contributions).
		<a href={newEntryIssueUrl} target="_blank" rel="noopener noreferrer">Suggest a project</a>
		·
		<a href={changeEntryIssueUrl} target="_blank" rel="noopener noreferrer"
			>Fix or update a listing</a
		>
	</p>
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
		gap: 0.7rem;
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

	.info-card a {
		color: var(--mpc-silkscreen);
		font-weight: 600;
	}

	.section-picker {
		display: grid;
		gap: 0.55rem;
	}

	.section-link {
		display: grid;
		gap: 0.15rem;
		padding: 0.7rem 0.85rem;
		background: var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
	}

	.section-link:hover {
		border-color: var(--mpc-btn-orange);
	}

	.section-name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.95rem;
		color: var(--mpc-screen-white);
	}

	.section-hint {
		font-size: 0.82rem;
		line-height: 1.4;
		color: var(--mpc-screen-text);
	}

	.steps {
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 0.35rem;
		color: #25272e;
	}

	.details-card {
		padding: 0;
	}

	.details-card summary {
		cursor: pointer;
		list-style: none;
		padding: 1.25rem;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.05rem;
		display: flex;
		align-items: flex-start;
		gap: 0.34rem;
	}

	.details-card summary::-webkit-details-marker {
		display: none;
	}

	.details-card summary :global(.caret-icon) {
		width: 0.81rem;
		height: 0.81rem;
		margin-top: 0.37rem;
		color: var(--mpc-silkscreen-muted);
		flex-shrink: 0;
	}

	.details-card[open] summary :global(.caret-icon) {
		transform: rotate(90deg);
	}

	.details-body {
		display: grid;
		gap: 0.7rem;
		padding: 0 1.25rem 1.25rem;
	}

	.details-body p {
		margin: 0;
		color: #25272e;
	}

	.code-screen {
		margin: 0;
		padding: 0.85rem 1rem;
		background: var(--mpc-screen-bg);
		color: var(--mpc-screen-yellow);
		border: 2px solid #252934;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		overflow-x: auto;
	}

	.issue-fallback {
		margin: 0.25rem 0 0.5rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--mpc-silkscreen-muted);
	}

	.issue-fallback a {
		color: var(--mpc-silkscreen);
		font-weight: 600;
	}
</style>
