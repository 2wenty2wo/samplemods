<script>
/** @type {{
	 *   lightbox: HTMLDialogElement | undefined,
	 *   lightboxSrc: string | null,
	 *   lightboxAlt: string,
	 *   pixelatedUrls: Record<string, boolean>,
	 *   closeLightbox: () => void
	 * }} */
	let {
		lightbox = $bindable(),
		lightboxSrc = $bindable(null),
		lightboxAlt,
		pixelatedUrls,
		closeLightbox
	} = $props();
</script>

<dialog
	bind:this={lightbox}
	class="lightbox"
	onclick={(e) => {
		if (e.target === lightbox) closeLightbox();
	}}
	onclose={() => {
		lightboxSrc = null;
	}}
>
	{#if lightboxSrc}
		<div class="bezel-screen lightbox-screen">
			<img
				class="screen-img"
				class:pixelated={pixelatedUrls[lightboxSrc]}
				src={lightboxSrc}
				alt={lightboxAlt}
			/>
		</div>
	{/if}
	<form method="dialog" class="lightbox-actions">
		<button type="submit" class="hw-action-btn orange">Close</button>
	</form>
</dialog>

<style>
.lightbox {
		border: 2px solid #262930;
		border-radius: 8px;
		padding: 1rem;
		background: var(--mpc-bezel-black);
		color: var(--mpc-screen-text);
		width: min(860px, 94vw);
	}

.lightbox::backdrop {
		background: rgb(0 0 0 / 0.76);
	}

.lightbox-screen {
		margin-bottom: 0.85rem;
	}

.lightbox-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
