import assert from 'node:assert/strict';
import { renderMarkdown } from './render-markdown.js';

const options = { repo: 'owner/project', branch: 'feature/docs', readmePath: 'docs/README.md', name: 'Project' };
const html = renderMarkdown(`# Project v1.2.3

## Install
[guide](install.md) [root](/LICENSE) [section](#install) [external](https://example.com)
![screen](images/screen.png) ![root screen](/screen.png)
![build](https://img.shields.io/badge/build-passing-green) ![CI](https://github.com/owner/project/actions/workflows/test.yml/badge.svg)
<h1>Project</h1><script>alert('script')</script><style>body{display:none}</style><iframe src="https://example.com">frame</iframe>
<img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)" onclick="alert(1)">bad</a>
<img src="data:image/svg+xml,evil"><img src="http://[invalid">
<svg><a href="javascript:alert(1)">svg</a></svg>
<details><summary>More</summary><b>Details</b></details>
`, options);
assert.doesNotMatch(html, /<h1|<script|<style|<iframe|<svg|javascript:|onclick|onerror|data:image|shields\.io|badge\.svg|display:none/);
assert.match(html, /https:\/\/github.com\/owner\/project\/blob\/feature%2Fdocs\/docs\/install.md/);
assert.match(html, /https:\/\/github.com\/owner\/project\/blob\/feature%2Fdocs\/LICENSE/);
assert.match(html, /docs\/README.md#install/);
assert.match(html, /https:\/\/raw.githubusercontent.com\/owner\/project\/feature%2Fdocs\/docs\/images\/screen.png/);
assert.match(html, /https:\/\/raw.githubusercontent.com\/owner\/project\/feature%2Fdocs\/screen.png/);
assert.match(html, /href="https:\/\/example.com\/" target="_blank" rel="noopener nofollow"/);
assert.match(html, /<details><summary>More<\/summary><b>Details<\/b><\/details>/);
assert.equal(renderMarkdown('', options), '');
assert.match(renderMarkdown('# Different title', options), /<h1>Different title<\/h1>/);
console.log('Markdown checks passed: safe HTML, relative URLs, external links, badges and duplicate titles.');
