<script>
	import ExternalIcon from '$lib/ExternalIcon.svelte';
/** @type {{ editOnGithubUrl: string, reportProblemUrl: string }} */
	let { editOnGithubUrl, reportProblemUrl } = $props();
</script>

<div class="suggest-edit-bar">
	<div class="suggest-edit-copy">
		<p>Something wrong or missing on this page?</p>
		<p class="suggest-edit-hint">
			Opens GitHub's editor; your change becomes a pull request and you're credited as a
			contributor.
		</p>
	</div>
	<div class="suggest-edit-actions">
		<a
			class="hw-action-btn grey"
			href={editOnGithubUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			<span>Edit this entry on GitHub&nbsp;<ExternalIcon /></span>
		</a>
		<a
			class="suggest-edit-secondary"
			href={reportProblemUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			or report a problem
		</a>
	</div>
</div>

<style>
.suggest-edit-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--mpc-body-recess);
	}

.suggest-edit-copy {
		display: grid;
		gap: 0.35rem;
		max-width: 42rem;
	}

.suggest-edit-bar p {
		margin: 0;
		color: var(--mpc-silkscreen-muted);
	}

.suggest-edit-hint {
		font-size: 0.88rem;
		line-height: 1.45;
	}

.suggest-edit-actions {
		display: grid;
		justify-items: end;
		gap: 0.45rem;
	}

.suggest-edit-secondary {
		font-size: 0.82rem;
		color: var(--mpc-silkscreen);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

.suggest-edit-secondary:hover {
		color: var(--mpc-accent-red);
	}
</style>
