import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8'));
let homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const asset of ['css/style.css', 'js/navigation.js']) {
  const version = createHash('sha256').update(fs.readFileSync(path.join(root, asset)))
    .digest('hex').slice(0, 10);
  const oldReference = new RegExp(asset.replaceAll('.', '\\.') + '(?:\\?v=[^"\\s]+)?');
  homepage = homepage.replace(oldReference, `${asset}?v=${version}`);
}
fs.writeFileSync(path.join(root, 'index.html'), homepage);
const escape = (text) => String(text).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const header = homepage.match(/    <header[\s\S]*?<\/header>/)[0]
  .replace(/href="#([^"]+)"/g, 'href="../index.html#$1"');
const stylesheet = homepage.match(/href="(css\/style.css[^"]*)"/)[1];
const navigation = homepage.match(/src="(js\/navigation.js[^"]*)"/)[1];

fs.mkdirSync(path.join(root, 'projects'), { recursive: true });
for (const project of projects) {
  const facts = Object.entries(project.facts).map(([label, value]) => `          <div>
            <dt>${escape(label)}</dt>
            <dd>${escape(value)}</dd>
          </div>`).join('\n');
  const sections = project.sections.map((section) => `      <section class="case-section">
        <h2>${escape(section.title)}</h2>
${section.paragraphs.map((text) => `        <p>${escape(text)}</p>`).join('\n')}
${section.points ? `        <ul>\n${section.points.map((text) => `          <li>${escape(text)}</li>`).join('\n')}\n        </ul>\n` : ''}      </section>`).join('\n\n');
  const resources = project.resources.length ? `      <section class="case-section">
        <h2>Explore the project</h2>
        <ul class="resource-links">
${project.resources.map((link) => `          <li><a href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${escape(link.label)} ↗</a></li>`).join('\n')}
        </ul>
      </section>\n` : '';
  const image = project.image ? `        <figure class="case-image">
          <a href="../assets/images/${escape(project.image)}" target="_blank" rel="noopener">
            <img src="../assets/images/${escape(project.image)}" width="1260" height="540"
              alt="${escape(project.imageAlt)}">
          </a>
          <figcaption>Original Honours prototype demonstration. Select the image to view it full size.</figcaption>
        </figure>\n` : `        <div class="media-placeholder case-placeholder" role="img"
          aria-label="Development placeholder: ${escape(project.title)} gameplay image pending">
          <span>Development placeholder</span>
          <strong>${escape(project.title)} gameplay</strong>
          <small>Real project screenshot or video to be added</small>
        </div>\n`;
  const pending = project.pending?.length ? `      <aside class="draft-notice">
        <h2>Case-study details to add</h2>
        <p>Development placeholder — this section is being prepared for the portfolio.</p>
        <ul>
${project.pending.map((text) => `          <li>${escape(text)}</li>`).join('\n')}
        </ul>
      </aside>\n\n` : '';
  const related = projects.filter((entry) => entry.slug !== project.slug).map((entry) =>
    `          <a class="btn secondary" href="${entry.slug}.html">${escape(entry.title)} →</a>`).join('\n');
  fs.writeFileSync(path.join(root, 'projects', `${project.slug}.html`), `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0b1120">
    <title>${escape(project.title)} | Holden Phillips</title>
    <meta name="description" content="${escape(project.summary)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escape(project.title)} | Holden Phillips">
    <meta property="og:description" content="${escape(project.summary)}">
    <link rel="stylesheet" href="../${stylesheet}">
    <script src="../${navigation}" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
${header}
    <main id="main-content" class="case-study" tabindex="-1">
      <section class="hero">
        <a class="back-link" href="../index.html#completed">← Back to portfolio</a>
        <div class="eyebrow">${escape(project.category)}</div>
        <h1>${escape(project.title)}</h1>
        <p class="lead">${escape(project.summary)}</p>
        <span class="tag">${escape(project.status)}</span>
        <dl class="project-facts">
${facts}
        </dl>
${image}      </section>

${sections}

${resources}${pending}      <section class="case-section related-projects">
        <h2>More projects</h2>
        <div class="actions">
${related}
        </div>
      </section>
      <footer class="footer">
        <span>© 2026 Holden Phillips · Technical Game Designer</span>
        <a href="mailto:holdenjp1@outlook.com">Contact Holden ↗</a>
      </footer>
    </main>
  </body>
</html>
`);
}
console.log(`Built ${projects.length} project pages.`);
