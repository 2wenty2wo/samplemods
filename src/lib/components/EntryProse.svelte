<script>
/** @type {{ html: string, className?: string }} */
	let { html, className = '' } = $props();
</script>

<div class="prose {className}">{@html html}</div>

<style>
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

.prose.release-prose {
		font-size: 0.88rem;
	}
</style>
