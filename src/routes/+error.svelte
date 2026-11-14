<script>
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { SITE_NAME } from '$lib/site.js';

	const title = $derived(
		page.status === 404 ? 'Page not found' : (page.error?.message ?? 'Something went wrong')
	);
</script>

<svelte:head>
	<title>{page.status} · {SITE_NAME}</title>
</svelte:head>

<section class="error-page">
	<p class="error-code">{page.status}</p>
	<h1>{title}</h1>
	<p class="lead">
		{#if page.status === 404}
			That page isn’t in the catalog. Head back and try a search.
		{:else}
			Something went wrong loading this page.
		{/if}
	</p>
	<p><a class="back" href="{base}/">← All entries</a></p>
</section>
