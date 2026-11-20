<script>
import { base } from '$app/paths';
	import { entryPath, priceFact, sourceFact } from '$lib/categories.js';

	/** @type {{
	 *   mod: any,
	 *   byId: Record<string, any>,
	 *   runsOnText: string,
	 *   install: string | null,
	 *   audienceText: string,
	 *   latestRelease: any,
	 *   latestReleaseUrl: string | null,
	 *   updatedDate: string | null,
	 *   formatUpdated: (value: string | number | null | undefined) => string | null
	 * }} */
	let {
		mod,
		byId,
		runsOnText,
		install,
		audienceText,
		latestRelease,
		latestReleaseUrl,
		updatedDate,
		formatUpdated
	} = $props();
</script>

<section class="detail-section quick-facts-section" aria-label="Quick facts">
	<h2 class="silk-heading">Quick facts</h2>
	<dl class="spec-dl">
		{#if runsOnText}
			<dt>Runs on</dt>
			<dd>{runsOnText}</dd>
		{/if}

		{#if install}
			<dt>Install</dt>
			<dd>{install}</dd>
		{/if}

		{#if audienceText}
			<dt>For</dt>
			<dd>{audienceText}</dd>
		{/if}

		<dt>Price</dt>
		<dd>{priceFact(mod.price, mod.price_note)}</dd>

		<dt>Source</dt>
		<dd>{sourceFact(mod.source)}</dd>

		{#if mod.requires?.length}
			<dt>Needs</dt>
			<dd>
				{#each mod.requires as reqId, idx}
					{#if idx > 0}, {/if}
					{#if byId[reqId]}
						<a href="{base}{entryPath(byId[reqId])}">{byId[reqId].name}</a>
					{:else}
						<code>{reqId}</code>
					{/if}
				{/each}
			</dd>
		{/if}

		{#if mod.firmware}
			<dt>Firmware</dt>
			<dd><code>{mod.firmware}</code></dd>
		{/if}

		{#if mod.license}
			<dt>Licence</dt>
			<dd>{mod.license}</dd>
		{/if}

		{#if latestRelease?.tag && latestReleaseUrl}
			<dt>Latest release</dt>
			<dd>
				<a href={latestReleaseUrl} rel="noopener noreferrer" target="_blank">
					{latestRelease.label ?? latestRelease.tag}
				</a>
				{#if formatUpdated(latestRelease.published_at)}
					<span class="release-date">· {formatUpdated(latestRelease.published_at)}</span>
				{/if}
			</dd>
		{/if}

		{#if updatedDate}
			<dt>Updated</dt>
			<dd>{updatedDate}</dd>
		{/if}

		{#if mod.contributors != null}
			<dt>Contributors</dt>
			<dd>{mod.contributors}</dd>
		{/if}

		{#if mod.open_issues != null && mod.repo}
			<dt>Open issues &amp; PRs</dt>
			<dd>
				<a
					href="https://github.com/{mod.repo}/issues"
					rel="noopener noreferrer"
					target="_blank"
				>
					{mod.open_issues}
				</a>
			</dd>
		{/if}
	</dl>
</section>

<style>
/* —— Screen-Styled Quick Facts Readout —— */

.spec-dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		margin: 0;
		background: var(--mpc-screen-bg);
		border: 2px solid #262930;
		border-left: 4px solid var(--pad-glow, var(--mpc-screen-yellow));
		border-radius: 6px;
		overflow: hidden;
		font-family: var(--font-mono);
		box-shadow: inset 0 2px 6px rgb(0 0 0 / 0.65);
	}

.spec-dl dt,
	.spec-dl dd {
		margin: 0;
		padding: 0.55rem 0.85rem;
		border-bottom: 1px solid #1a1d24;
		font-size: 0.82rem;
		line-height: 1.4;
	}

.spec-dl dt {
		color: var(--mpc-screen-cyan);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.7rem;
		font-weight: 700;
		background: #10131a;
		display: flex;
		align-items: center;
	}

.spec-dl dd {
		color: var(--mpc-screen-yellow);
		min-width: 0;
		overflow-wrap: anywhere;
	}

.spec-dl > :nth-last-child(-n + 2) {
		border-bottom: none;
	}

.spec-dl dd a {
		color: var(--mpc-screen-cyan);
	}

.spec-dl code {
		font-family: var(--font-mono);
		font-size: 0.92em;
		color: var(--mpc-screen-text);
	}

.release-date {
		color: var(--mpc-screen-text);
		opacity: 0.75;
	}
</style>
