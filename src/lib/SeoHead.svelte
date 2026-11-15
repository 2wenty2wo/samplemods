<script>
	import { SITE_NAME } from '$lib/site.js';

	/**
	 * @typedef {{ url: string, width?: number, height?: number, alt?: string }} ShareImage
	 */

	/** @type {{
	 *   title: string,
	 *   description: string,
	 *   url: string,
	 *   image: ShareImage,
	 *   type?: 'website' | 'article',
	 *   noindex?: boolean,
	 *   refreshTo?: string | null
	 * }} */
	let {
		title,
		description,
		url,
		image,
		type = 'website',
		noindex = false,
		refreshTo = null
	} = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
	{#if refreshTo}
		<meta http-equiv="refresh" content="0; url={refreshTo}" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image.url} />
	{#if image.width}
		<meta property="og:image:width" content={String(image.width)} />
	{/if}
	{#if image.height}
		<meta property="og:image:height" content={String(image.height)} />
	{/if}
	{#if image.alt}
		<meta property="og:image:alt" content={image.alt} />
	{/if}

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image.url} />
</svelte:head>
