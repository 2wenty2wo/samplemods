<aside class="wip-band" role="note" aria-label="Work in progress">
	<div class="wip-inner">
		<span class="wip-badge" aria-hidden="true">
			<span class="wip-dot"></span>
			STATUS · WIP
		</span>
		<div class="wip-copy">
			<p class="wip-heading">Work in progress</p>
			<p class="wip-text">
				This site is still growing, so some entries may be incomplete or out of date. We'd appreciate
				any corrections. Please open an
				<a href="https://github.com/2wenty2wo/samplemods/issues/new" target="_blank" rel="noopener noreferrer"
					>issue</a
				>
				or
				<a href="https://github.com/2wenty2wo/samplemods/pulls" target="_blank" rel="noopener noreferrer"
					>pull request</a
				>
				on GitHub.
			</p>
		</div>
	</div>
</aside>

<style>
.wip-band {
		width: min(1200px, 100% - 2rem);
		margin: -0.5rem auto 1.25rem;
	}

.wip-inner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.85rem;
		background:
			linear-gradient(90deg, rgb(255 138 30 / 0.07) 0%, transparent 45%),
			var(--mpc-screen-bg);
		border: 2px solid #252934;
		border-left: 4px solid var(--mpc-btn-orange);
		border-radius: 6px;
		box-shadow:
			inset 0 2px 6px rgb(0 0 0 / 0.75),
			0 2px 0 var(--mpc-bezel-black);
	}

.wip-badge {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.22rem 0.5rem;
		border-radius: 4px;
		background: #141821;
		border: 1px solid #2c3242;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mpc-screen-yellow);
		line-height: 1;
	}

.wip-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--mpc-btn-orange);
		box-shadow: 0 0 6px var(--mpc-btn-orange);
	}

.wip-copy {
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.15rem 0.55rem;
	}

.wip-heading {
		margin: 0;
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		color: var(--mpc-screen-yellow);
		text-transform: uppercase;
		white-space: nowrap;
	}

.wip-text {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: var(--mpc-screen-text);
	}

.wip-text a {
		color: var(--mpc-screen-cyan);
		font-weight: 700;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.16em;
	}

.wip-text a:hover {
		color: var(--mpc-screen-yellow);
	}

@media (max-width: 640px) {
.wip-band {
			width: calc(100% - 1.25rem);
			margin: -0.35rem auto 0.95rem;
		}

.wip-inner {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.4rem;
			padding: 0.55rem 0.7rem;
		}

.wip-heading {
			font-size: 0.74rem;
		}

.wip-text {
			font-size: 0.78rem;
		}
	}
</style>
