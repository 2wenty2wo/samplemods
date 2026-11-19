import { absoluteUrl } from './seo.js';
import { SITE_NAME } from './site.js';

export const RSS_TITLE = `${SITE_NAME}: latest releases`;
export const RSS_FEED_PATH = '/releases.xml';
export const RSS_CHANNEL_LINK = '/releases/';
export const RSS_ITEM_LIMIT = 50;
/** Entry pages include `<section id="releases">` for deep links. */
export const RSS_ENTRY_RELEASES_HASH = '#releases';

/**
 * @param {string | null | undefined} value
 */
export function escapeXml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Wrap text in a CDATA section, splitting on any embedded `]]>`.
 * @param {string | null | undefined} value
 */
export function cdata(value) {
	const text = String(value ?? '');
	return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

/**
 * RFC 822 / RSS pubDate (UTC).
 * @param {string | null | undefined} iso
 */
export function formatRssDate(iso) {
	if (!iso) return null;
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) return null;
	return new Date(ms).toUTCString();
}

/**
 * Absolute samplemods.com entry URL for an RSS item (never GitHub).
 * @param {{ entryPath: string }} release
 * @param {string} [base='']
 */
export function releaseItemUrl(release, base = '') {
	return `${absoluteUrl(release.entryPath, base)}${RSS_ENTRY_RELEASES_HASH}`;
}

/**
 * @param {Array<{
 *   entryId: string,
 *   entryName: string,
 *   entryPath: string,
 *   section: string,
 *   tag: string,
 *   published_at: string | null,
 *   excerpt: string
 * }>} releases newest-first from getAllReleases()
 * @param {string} [base='']
 */
export function buildReleasesRss(releases, base = '') {
	const items = releases.slice(0, RSS_ITEM_LIMIT);
	const newest = items.find((item) => item.published_at)?.published_at ?? null;
	const lastBuild = formatRssDate(newest) ?? new Date().toUTCString();
	const selfHref = absoluteUrl(RSS_FEED_PATH, base);
	const channelLink = absoluteUrl(RSS_CHANNEL_LINK, base);

	const body = items
		.map((item) => {
			const link = releaseItemUrl(item, base);
			const title = `${item.entryName} ${item.tag}`.trim();
			const excerpt = item.excerpt?.trim() ?? '';
			// RSS descriptions are HTML: escape the plain-text excerpt and make the call-out a real link.
			const readMore = `<p><a href="${escapeXml(link)}">Read the full notes on ${SITE_NAME} →</a></p>`;
			const description = excerpt ? `<p>${escapeXml(excerpt)}</p>${readMore}` : readMore;
			const pub = formatRssDate(item.published_at);
			return [
				'    <item>',
				`      <title>${escapeXml(title)}</title>`,
				`      <link>${escapeXml(link)}</link>`,
				`      <guid isPermaLink="false">${escapeXml(`${item.entryId}@${item.tag}`)}</guid>`,
				pub ? `      <pubDate>${pub}</pubDate>` : null,
				`      <category>${escapeXml(item.section)}</category>`,
				`      <description>${cdata(description)}</description>`,
				'    </item>'
			]
				.filter(Boolean)
				.join('\n');
		})
		.join('\n');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'  <channel>',
		`    <title>${escapeXml(RSS_TITLE)}</title>`,
		`    <link>${escapeXml(channelLink)}</link>`,
		`    <description>${escapeXml(`Newest firmware mods, apps, games and tool releases across the ${SITE_NAME} catalog for the Akai MPC Sample.`)}</description>`,
		'    <language>en</language>',
		`    <lastBuildDate>${lastBuild}</lastBuildDate>`,
		`    <atom:link href="${escapeXml(selfHref)}" rel="self" type="application/rss+xml"/>`,
		body,
		'  </channel>',
		'</rss>',
		''
	].join('\n');
}
