<script>
	/** @type {{
	 *   contributors: Array<{ login: string, html_url: string, avatar_url: string, contributions: number }>,
	 *   contributorPeopleLabel: string
	 * }} */
	let { contributors, contributorPeopleLabel } = $props();

	/** @param {string} url */
	function avatarSrc(url) {
		try {
			const parsed = new URL(url);
			parsed.searchParams.set('s', '64');
			return parsed.toString();
		} catch {
			return url;
		}
	}
</script>

<section class="hw-band contributors-band" aria-label="Contributors">
	<div class="hw-band-inner">
		<div class="hw-band-head">
			<h2 class="silk-heading hw-band-title">Contributors</h2>
			<p class="hw-band-sub">
				{contributorPeopleLabel} ·
				<a
					href="https://github.com/2wenty2wo/samplemods/graphs/contributors"
					target="_blank"
					rel="noopener noreferrer"
				>
					on GitHub ↗
				</a>
			</p>
		</div>
		<ul class="contributor-list">
			{#each contributors as person (person.login)}
				<li>
					<a
						class="hw-band-chip contributor-chip"
						href={person.html_url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<img
							class="contributor-avatar"
							src={avatarSrc(person.avatar_url)}
							alt=""
							loading="lazy"
						/>
						<span class="contributor-login">{person.login}</span>
						<span class="visually-hidden">
							— {person.contributions} commit{person.contributions === 1 ? '' : 's'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.contributors-band {
		margin-top: -1.25rem;
		margin-bottom: 2.75rem;
	}

	.contributor-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.contributor-avatar {
		width: 28px;
		height: 28px;
		border-radius: 4px;
		background: #1a1d24;
		border: 1px solid #2a2e38;
		display: block;
	}

	.contributor-login {
		font-family: var(--font-mono);
		letter-spacing: 0.02em;
	}

	@media (max-width: 640px) {
		.contributors-band {
			margin-top: -1.25rem;
			margin-bottom: 2rem;
		}
	}
</style>
