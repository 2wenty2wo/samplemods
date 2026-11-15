<script>
	/** @type {{ class?: string }} */
	let { class: className = '' } = $props();

	const cells = Array.from({ length: 16 }, (_, i) => ({
		x: (i % 4) * 33,
		y: Math.floor(i / 4) * 33
	}));
</script>

<svg
	class={className}
	viewBox="0 0 128 128"
	fill="currentColor"
	aria-hidden="true"
	focusable="false"
>
	{#each cells as cell}
		<rect x={cell.x} y={cell.y} width="29" height="29" rx="7" />
	{/each}
</svg>
