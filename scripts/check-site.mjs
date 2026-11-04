import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', ...fs.readdirSync(path.join(root, 'projects'))
  .filter((name) => name.endsWith('.html')).map((name) => `projects/${name}`)];
const idsByPage = new Map();
const placeholderPages = [];
const voidElements = new Set(['meta', 'link', 'br', 'img', 'input', 'hr', 'source']);

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  if (/class="[^"]*(?:media-placeholder|draft-notice)/.test(html)) {
    placeholderPages.push(page);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: duplicate IDs`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: expected one h1`);
  idsByPage.set(page, new Set(ids));
  const stack = [];
  for (const [, closing, tag] of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    if (voidElements.has(tag)) continue;
    if (closing) assert.equal(stack.pop(), tag, `${page}: mismatched ${tag}`);
    else stack.push(tag);
  }
  assert.equal(stack.length, 0, `${page}: unclosed tags`);
  for (const [image] of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]*"/.test(image), `${page}: image needs alt text`);
    assert(/\bwidth="\d+"/.test(image) && /\bheight="\d+"/.test(image),
      `${page}: image needs explicit dimensions`);
  }
}

let checkedLinks = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(raw)) continue;
    const url = new URL(raw, `https://portfolio.test/${page}`);
    const local = decodeURIComponent(url.pathname.slice(1));
    assert(fs.existsSync(path.join(root, local)), `${page}: missing ${local}`);
    if (/\.(css|js)$/.test(local)) {
      const expectedVersion = createHash('sha256')
        .update(fs.readFileSync(path.join(root, local))).digest('hex').slice(0, 10);
      assert.equal(url.searchParams.get('v'), expectedVersion,
        `${page}: stale ${local}; run node scripts/build-projects.mjs`);
    }
    if (url.hash && idsByPage.has(local)) {
      assert(idsByPage.get(local).has(decodeURIComponent(url.hash.slice(1))),
        `${page}: missing anchor ${raw}`);
    }
    checkedLinks++;
  }
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sections = [...home.matchAll(/<section\b[^>]*id="([^"]+)"/g)].map((m) => m[1]);
const navigation = home.match(/<div class="links" id="navigation-links">([\s\S]*?)<\/div>/)[1];
const navigationIds = [...navigation.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(navigationIds, sections.slice(1), 'Navigation must follow section order');
assert(home.includes('Project Butterfly'), 'Keep the approved experiment entry');
assert(!home.includes('Dark Matter'), 'Dark Matter remains excluded');
assert(home.includes('Technical Game Designer'), 'Missing professional identity');
assert(home.includes('Awaiting assessment'), 'Preserve Honours status');
console.log(`Passed: ${pages.length} pages, ${checkedLinks} local links/assets, HTML structure, image attributes and content checks.`);
if (placeholderPages.length) {
  console.log(`Development placeholders remain in: ${placeholderPages.join(', ')}`);
  if (process.argv.includes('--release')) {
    console.error('Not ready to publish: replace or remove development placeholders first.');
    process.exitCode = 1;
  }
}
