import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * @fontsource ships font-display: swap. Rewrite to optional so slow loads keep
 * metric fallbacks for the page view instead of mid-paint glyph swaps.
 * Touches only @fontsource / @fontsource-variable CSS; survives package updates.
 * @returns {import('vite').Plugin}
 */
function fontsourceDisplayOptional() {
	return {
		name: 'fontsource-display-optional',
		transform(code, id) {
			if (!/[\\/]node_modules[\\/]@fontsource/.test(id)) return;
			if (!id.includes('.css')) return;
			if (!code.includes('font-display: swap')) return;
			return {
				code: code.replace(/font-display:\s*swap/g, 'font-display: optional'),
				map: null
			};
		}
	};
}

export default defineConfig({
	plugins: [fontsourceDisplayOptional(), sveltekit()]
});
