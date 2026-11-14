import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const badge = /(?:shields\.io|badgen\.net|badge\.fury\.io|codecov\.io|coveralls\.io|travis-ci\.|\/badge(?:s)?[/.]|\/workflows\/[^?]*badge)/i;
const titleKey = (text) => text.replace(/\s+v?\d+(?:\.\d+)+(?:[-\w.]*)?\s*$/i, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function renderMarkdown(markdown, { repo, branch = 'main', readmePath = 'README.md', name = '' }) {
	const ref = encodeURIComponent(branch);
	const linkBase = `https://github.com/${repo}/blob/${ref}/`;
	const imageBase = `https://raw.githubusercontent.com/${repo}/${ref}/`;
	function absolute(value, image = false) {
		if (!value) return '';
		const base = image ? imageBase : linkBase;
		if (value.startsWith('//')) return `https:${value}`;
		try {
			return value.startsWith('/') ? new URL(value.slice(1), base).href : new URL(value, new URL(readmePath, base)).href;
		} catch { return ''; }
	}
	return sanitizeHtml(marked.parse(markdown ?? '', { gfm: true, async: false }), {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
		allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'], code: ['class'] },
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedSchemesByTag: { img: ['http', 'https'] },
		allowProtocolRelative: false,
		nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe', 'svg'],
		transformTags: {
			a: (tagName, attribs) => {
				const href = absolute(attribs.href);
				return { tagName, attribs: { ...attribs, href, target: '_blank', rel: 'noopener nofollow' } };
			},
			img: (tagName, attribs) => ({ tagName, attribs: badge.test(attribs.src ?? '') ? {} : {
				...attribs, src: absolute(attribs.src, true), loading: 'lazy', decoding: 'async'
			} })
		},
		exclusiveFilter: (frame) => (frame.tag === 'img' && !frame.attribs.src)
			|| (frame.tag === 'h1' && name && titleKey(frame.text) === titleKey(name))
	});
}
