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

<section class="contributors-band" aria-label="Contributors">
	<div class="contributors-inner">
		<div class="contributors-head">
			<h2 class="silk-heading contributors-title">Contributors</h2>
			<p class="contributors-sub">
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
						class="contributor-chip"
						href={person.html_url}
						target="_blank"
						rel="noopener noreferrer"
						title="{person.login} — {person.contributions} commit{person.contributions === 1
							? ''
							: 's'}"
					>
						<img
							class="contributor-avatar"
							src={avatarSrc(person.avatar_url)}
							alt=""
							loading="lazy"
						/>
						<span class="contributor-login">{person.login}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
.contributors-band {
		width: min(1200px, 100% - 2rem);
		margin: -1.25rem auto 2.75rem;
	}

.contributors-inner {
		display: grid;
		gap: 0.9rem;
		padding: 1.05rem 1.25rem;
		background: linear-gradient(180deg, #cac7c2 0%, var(--mpc-pad-card) 100%);
		border: 2px solid #282b34;
		border-radius: var(--radius);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.55),
			inset 0 -2px 0 rgb(0 0 0 / 0.1),
			0 4px 0 #1b1d24,
			0 6px 12px rgb(0 0 0 / 0.06);
	}

.contributors-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 1rem;
		padding-bottom: 0.65rem;
		border-bottom: 1px solid rgb(0 0 0 / 0.12);
	}

.contributors-title {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.74rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--mpc-pad-text);
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

.contributors-title::before {
		content: '';
		width: 10px;
		height: 4px;
		border-radius: 2px;
		background: var(--mpc-btn-blue-light);
		box-shadow: 0 0 6px rgb(29 161 219 / 0.55);
	}

.contributors-sub {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--mpc-silkscreen-muted);
	}

.contributors-sub a {
		font-weight: 700;
		color: var(--mpc-accent-red);
	}

.contributor-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

.contributor-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.25rem 0.65rem 0.25rem 0.28rem;
		background: var(--mpc-body-light);
		color: var(--mpc-pad-text);
		border: 1.5px solid #282b34;
		border-bottom: 3px solid var(--mpc-btn-blue-light);
		border-radius: 5px;
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.65),
			0 2px 0 #1b1d24;
		text-decoration: none;
		font-size: 0.8rem;
		font-weight: 700;
		transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
	}

.contributor-chip:hover {
		background: #f2f0ec;
		border-bottom-color: var(--mpc-btn-orange);
		transform: translateY(1px);
		text-decoration: none;
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
			width: calc(100% - 1.25rem);
			margin: -1.25rem auto 2rem;
		}

.contributors-inner {
			padding: 0.85rem 0.95rem;
			gap: 0.7rem;
		}
	}
</style>
