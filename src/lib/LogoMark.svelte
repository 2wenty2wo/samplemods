<script>
	/** @type {{ class?: string }} */
	let { class: className = '' } = $props();

	const pads = ['#ff4d7d', '#f8b800', '#008cc1']; // pink, amber, blue
	const cells = Array.from({ length: 16 }, (_, i) => {
		const col = i % 4;
		const row = Math.floor(i / 4);
		const d = col + row; // diagonal 0..6, top-left to bottom-right
		return { x: col * 33, y: row * 33, d, pad: pads[d % 3] };
	});
</script>

<svg
	class={className}
	viewBox="0 0 128 128"
	fill="currentColor"
	aria-hidden="true"
	focusable="false"
>
	{#each cells as cell}
		<rect
			class="logo-cell"
			style="--d:{cell.d}; --pad:{cell.pad}"
			x={cell.x}
			y={cell.y}
			width="29"
			height="29"
			rx="7"
		/>
	{/each}
</svg>
