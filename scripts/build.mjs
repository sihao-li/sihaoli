import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");

const readJson = async (name) =>
  JSON.parse(await readFile(path.join(dataDir, name), "utf8"));

const [profile, publications, talks, teaching, tutorials] =
  await Promise.all([
    readJson("profile.json"),
    readJson("publications.json"),
    readJson("talks.json"),
    readJson("teaching.json"),
    readJson("tutorials.json")
  ]);

const routes = [
  ["index.html", renderHome()],
  ["publications/index.html", renderPublications()],
  ["talks/index.html", renderTalks()],
  ["teaching/index.html", renderTeaching()],
  ["tutorials/index.html", renderTutorials()],
  ["conference/index.html", renderConference()]
];

for (const tutorial of tutorials.filter((item) => item.source)) {
  routes.push([`${tutorial.url.replace(/^\/|\/$/g, "")}/index.html`, await renderTutorialArticle(tutorial)]);
}

for (const tutorial of tutorials.filter((item) => item.dataset || item.externalUrl)) {
  routes.push([`${tutorial.url.replace(/^\/|\/$/g, "")}/index.html`, renderDatavizTutorial(tutorial)]);
}

await Promise.all(
  routes.map(async ([file, html]) => {
    const out = path.join(root, file);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
  })
);

console.log(`Generated ${routes.length} static pages.`);

function layout({ title, description, page, content, bodyClass = "" }) {
  const active = (href) => (href === page ? " aria-current=\"page\"" : "");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} | ${esc(profile.name)}</title>
  <meta name="description" content="${esc(description || profile.description)}">
  <meta name="author" content="${esc(profile.name)}">
  <meta name="theme-color" content="#f7f1e8">
  <meta property="og:title" content="${esc(title)} | ${esc(profile.name)}">
  <meta property="og:description" content="${esc(description || profile.description)}">
  <meta property="og:type" content="website">
  <link rel="canonical" href="${profile.site}${page === "/" ? "/" : page}">
  <link rel="icon" href="/public/favicon.ico">
  <link rel="apple-touch-icon" href="/public/apple-touch-icon.png">
  <link rel="stylesheet" href="/src/styles/base.css">
  <link rel="stylesheet" href="/src/styles/components.css">
  <link rel="stylesheet" href="/src/styles/animations.css">
  ${contentNeedsMath(content) ? mathHead() : ""}
  <script type="importmap">
    {
      "imports": {
        "three": "/public/vendor/three.module.js"
      }
    }
  </script>
</head>
<body data-page="${pageName(page)}" class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <canvas class="webgl-bg" id="webgl-bg" aria-hidden="true"></canvas>
  <header class="site-header" data-site-header>
    <a class="brand" href="/" aria-label="${esc(profile.name)} home">
      <img class="brand-logo" src="/public/images/telecom-paris-logo.svg" alt="Telecom Paris">
      <span>${esc(profile.name)}</span>
    </a>
    <button class="nav-toggle icon-button" type="button" aria-label="Toggle navigation" aria-expanded="false" data-nav-toggle>☰</button>
    <nav class="site-nav" aria-label="Main navigation" data-site-nav>
      <a href="/publications/"${active("/publications/")}>Publications</a>
      <a href="/talks/"${active("/talks/")}>Talks</a>
      <a href="/teaching/"${active("/teaching/")}>Teaching</a>
      <a href="/tutorials/"${active("/tutorials/")}>Tutorials & Data</a>
      <a href="${profile.cv}">CV</a>
      <a class="nav-pill" href="/conference/"${active("/conference/")}>Conference</a>
    </nav>
    <button class="theme-toggle icon-button" type="button" aria-label="Toggle color theme" title="Toggle color theme" data-theme-toggle>◐</button>
  </header>
  <main id="main">
${content}
  </main>
  <footer class="site-footer">
    <p>${esc(profile.name)} · ${esc(profile.title)} · ${esc(profile.affiliation)}</p>
    <p><a href="${profile.links.email}">${esc(profile.emails[0])}</a> · <a href="${profile.links.googleScholar}">Google Scholar</a> · <a href="${profile.links.github}">GitHub</a></p>
  </footer>
  <script type="module" src="/src/js/main.js"></script>
</body>
</html>`;
}

function mathHead() {
  return `<script>
    window.MathJax = {
      tex: {
        inlineMath: [["\\\\(", "\\\\)"]],
        displayMath: [["\\\\[", "\\\\]"]],
        processEscapes: true
      },
      chtml: {
        fontURL: "/public/vendor/mathjax/output/chtml/fonts/woff-v2"
      },
      options: {
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
      }
    };
  </script>
  <script defer src="/public/vendor/mathjax/tex-chtml.js"></script>`;
}

function contentNeedsMath(content) {
  return /\\\(|\\\[|class="math-display"/.test(content);
}

function renderHome() {
  const featured = publications.filter((item) => item.featured).slice(0, 5);
  const latestTalks = talks.slice(0, 3);
  const currentTeaching = teaching.filter((item) => item.status === "Current");
  const content = `
    <section class="hero section-band">
      <div class="hero-copy">
        <p class="eyebrow">Industrial Organization · Digital Economics</p>
        <h1>${esc(profile.name)}</h1>
        <p class="hero-title">${esc(profile.title)} at ${esc(profile.affiliation)}</p>
        <p class="hero-description">${esc(profile.description)}</p>
        <div class="action-row">
          <a class="button primary" href="${profile.cv}">Download CV</a>
          <a class="button" href="${profile.links.googleScholar}">Google Scholar</a>
          <a class="button" href="${profile.links.github}">GitHub</a>
          <a class="button" href="${profile.links.email}">Email</a>
        </div>
      </div>
      <div class="hero-visual" aria-label="Interactive research theme graph">
        <img src="${profile.portrait}" alt="Portrait of ${esc(profile.name)}" width="320" height="320">
        <div id="three-network" class="three-network" data-themes="${esc(JSON.stringify(profile.researchThemes))}">
          <p class="visual-fallback">Research themes: ${profile.researchThemes.map(esc).join(", ")}</p>
        </div>
      </div>
    </section>

    <section class="section-grid intro-grid">
      <div>
        <p class="eyebrow">Research Snapshot</p>
        <h2>Platforms, knowledge, and digital markets.</h2>
      </div>
      <div class="prose">
        ${profile.researchSnapshot.map((item) => `<p>${esc(item)}</p>`).join("")}
      </div>
    </section>

    <section class="section-band compact">
      <div class="section-heading">
        <p class="eyebrow">Research Interests</p>
        <h2>Connected questions, empirical and theoretical tools.</h2>
      </div>
      <div class="tag-cloud" aria-label="Research interests">
        ${profile.researchThemes.map((theme) => `<span>${esc(theme)}</span>`).join("")}
      </div>
    </section>

    <section class="section-grid">
      <div class="section-heading">
        <p class="eyebrow">Featured Papers</p>
        <h2>Current research and selected work.</h2>
        <a class="text-link" href="/publications/">View all publications</a>
      </div>
      <div class="paper-stack">
        ${featured.map(publicationMiniCard).join("")}
      </div>
    </section>

    <section class="section-band split-panel">
      <div>
        <p class="eyebrow">Talks</p>
        <h2>Latest presentations</h2>
        ${latestTalks.map(talkItem).join("")}
      </div>
      <div>
        <p class="eyebrow">Teaching</p>
        <h2>Current teaching</h2>
        ${currentTeaching.map(teachingItem).join("")}
        <canvas id="timeline-canvas" class="timeline-canvas" width="720" height="240" aria-label="Animated publication and talk timeline"></canvas>
      </div>
    </section>

    <section class="contact-strip">
      <div>
        <p class="eyebrow">Contact</p>
        <h2>Research conversations welcome.</h2>
      </div>
      <p>Email <a href="${profile.links.email}">${esc(profile.emails[0])}</a>. Office: ${esc(profile.office)}.</p>
    </section>`;
  return layout({ title: "Home", description: profile.description, page: "/", content });
}

function renderPublications() {
  const stages = [
    ["all", "All"],
    ["working-paper", "Working papers"],
    ["work-in-progress", "Work in progress"],
    ["published", "Published"],
    ["thesis-archive", "Thesis archive"]
  ];
  const groups = [
    ["working-paper", "Working papers", "Projects with abstracts and presentable claims."],
    ["work-in-progress", "Work in progress", "Active projects where the public summary is intentionally brief."],
    ["published", "Published and conference papers", "Articles and shorter public outputs."],
    ["thesis-archive", "Master theses", "Earlier work kept as intellectual background."]
  ];
  const filters = stages
    .map(([stage, label], index) => `<button type="button" class="chip${index === 0 ? " is-active" : ""}" data-filter-value="${stage}">${label}</button>`)
    .join("");
  const counts = groups
    .map(([stage, label]) => `<li><span>${label}</span><strong>${publications.filter((pub) => pub.maturity === stage).length}</strong></li>`)
    .join("");
  const content = `
    <section class="page-hero publication-hero">
      <p class="eyebrow">Research dossier</p>
      <h1>Publications</h1>
      <p>A map of the work rather than a dump of titles: working papers, active projects, published pieces, and earlier theses.</p>
    </section>
    <section class="research-dossier">
      <aside class="dossier-rail" aria-label="Publication navigation">
        <p class="eyebrow">How to read this page</p>
        <h2>Research pipeline</h2>
        <p>Each entry foregrounds the research theme, status, and public outputs before the abstract.</p>
        <ul class="dossier-counts">${counts}</ul>
        <div class="dossier-tools">
          <div class="chip-group" data-filter-group="publications">${filters}</div>
          <label class="search-box">
            <span>Search</span>
            <input type="search" placeholder="Title, author, theme..." data-publication-search>
          </label>
          <button class="button small" type="button" data-export-bibtex>Export BibTeX</button>
        </div>
      </aside>
      <div class="dossier-list" data-publication-list>
        ${groups.map(([stage, title, note]) => {
          const items = publications.filter((pub) => pub.maturity === stage);
          if (!items.length) return "";
          return `<section class="dossier-section" data-stage="${stage}">
            <div class="dossier-section-heading">
              <p class="eyebrow">${items.length} item${items.length > 1 ? "s" : ""}</p>
              <h2>${title}</h2>
              <p>${note}</p>
            </div>
            ${items.map(publicationDossierEntry).join("")}
          </section>`;
        }).join("")}
      </div>
    </section>`;
  return layout({ title: "Publications", description: "Research publications and working papers by Si Hao Li.", page: "/publications/", content });
}

function renderTalks() {
  const content = `
    <section class="page-hero talks-hero">
      <p class="eyebrow">Presentations map</p>
      <h1>Talks</h1>
      <p>Places where I have presented or discussed work. Select a point on the map to see the event.</p>
    </section>
    ${renderWorldMap(talks, { id: "talks-map", title: "Conference and workshop locations" })}`;
  return layout({ title: "Talks", description: "Talks and presentations by Si Hao Li.", page: "/talks/", content });
}

function renderTeaching() {
  const content = `
    <section class="page-hero">
      <p class="eyebrow">Courses</p>
      <h1>Teaching</h1>
      <p>Current and past teaching in microeconomics, macroeconomics, economic thought, industrial organization, and cultural industries.</p>
    </section>
    <section class="card-grid">
      ${teaching.map((course) => `
        <article class="info-card">
          <p class="eyebrow">${esc(course.status)} · ${esc(course.period)}</p>
          <h2>${esc(course.course)}</h2>
          <p>${esc(course.institution)}</p>
          <p>${esc(course.level)}</p>
        </article>`).join("")}
    </section>`;
  return layout({ title: "Teaching", description: "Teaching experience by Si Hao Li.", page: "/teaching/", content });
}

function renderTutorials() {
  const content = `
    <section class="page-hero">
      <p class="eyebrow">Tutorials and Data</p>
      <h1>Tutorials & Data</h1>
      <p>Long-form tutorials, data visualizations, code-oriented notes, and reusable templates for future datasets.</p>
    </section>
    <section class="card-grid">
      ${tutorials.map((tutorial) => `
        <article class="info-card tutorial-card">
          <p class="eyebrow">${esc(tutorial.language)} · ${esc(tutorial.category)} · ${esc(tutorial.date)}</p>
          <h2><a href="${tutorial.url}">${esc(tutorial.title)}</a></h2>
          <p>${esc(tutorial.summary)}</p>
        </article>`).join("")}
    </section>`;
  return layout({ title: "Tutorials and Data", description: "Tutorials and data visualizations by Si Hao Li.", page: "/tutorials/", content });
}

async function renderTutorialArticle(tutorial) {
  const markdown = await readFile(path.join(root, tutorial.source), "utf8");
  const content = `
    <section class="page-hero article-hero">
      <p class="eyebrow">${esc(tutorial.language)} · ${esc(tutorial.category)} · ${esc(tutorial.date)}</p>
      <h1>${esc(tutorial.title)}</h1>
      <p>${esc(tutorial.summary)}</p>
    </section>
    <article class="article-body">
      ${markdownToHtml(markdown)}
    </article>`;
  return layout({ title: tutorial.title.replace(/^\[FR\]\s*/, ""), description: tutorial.summary, page: tutorial.url, content });
}

function renderDatavizTutorial(tutorial) {
  const content = `
    <section class="page-hero article-hero">
      <p class="eyebrow">${esc(tutorial.language)} · ${esc(tutorial.category)} · ${esc(tutorial.date)}</p>
      <h1>${esc(tutorial.title)}</h1>
      <p>${esc(tutorial.summary)}</p>
    </section>
    <section class="dataviz-panel">
      <div class="dataviz-card">
        <h2>What you can do</h2>
        <p>Track term frequency, compare periods, filter by journal, and inspect matching articles without relying on a sleeping external app.</p>
      </div>
      <div class="dataviz-workbench" data-top5-dataviz data-dataset="${esc(tutorial.dataset || tutorial.externalUrl)}">
        <div class="dataviz-controls" aria-label="Top five economics visualization controls">
          <label>
            <span>Search terms</span>
            <input type="search" value="theory" data-dataviz-query>
          </label>
          <label>
            <span>Smoothing</span>
            <input type="range" min="0" max="12" value="2" data-dataviz-smooth>
            <output data-dataviz-smooth-output>2 years</output>
          </label>
          <div class="dataviz-years">
            <label>
              <span>From</span>
              <input type="number" data-dataviz-year-min>
            </label>
            <label>
              <span>To</span>
              <input type="number" data-dataviz-year-max>
            </label>
          </div>
          <div>
            <span class="control-label">Journals</span>
            <div class="journal-options" data-dataviz-journals></div>
          </div>
        </div>
        <div class="dataviz-output">
          <div class="dataviz-metrics" data-dataviz-metrics>
            <p>Loading local dataset...</p>
          </div>
          <canvas class="dataviz-chart" width="980" height="440" data-dataviz-chart aria-label="Term frequency over time"></canvas>
          <p class="dataviz-caption" data-dataviz-caption>Metric: exact token matches in titles and abstracts, divided by total words in the selected corpus.</p>
          <div class="dataviz-results" data-dataviz-results></div>
        </div>
        <noscript>
          <p class="content-note">JavaScript is required for the interactive visualization. The dataset is available at ${esc(tutorial.dataset || tutorial.externalUrl)}.</p>
        </noscript>
      </div>
    </section>`;
  return layout({ title: tutorial.title, description: tutorial.summary, page: tutorial.url, content });
}

function renderCv() {
  const content = `
    <section class="page-hero">
      <p class="eyebrow">Curriculum Vitae</p>
      <h1>CV</h1>
      <p>A readable web summary backed by JSON content, plus a PDF download. The current PDF was migrated from the Hugo site and should be verified before publication.</p>
      <div class="action-row">
        <a class="button primary" href="${profile.cv}">Download PDF</a>
      </div>
    </section>
    <section class="section-grid">
      <div>
        <p class="eyebrow">Profile</p>
        <h2>${esc(profile.name)}</h2>
      </div>
      <div class="prose">
        <p>${esc(profile.description)}</p>
        <p><strong>Office:</strong> ${esc(profile.office)}</p>
        <p><strong>Email:</strong> ${profile.emails.map((email) => `<a href="mailto:${email}">${esc(email)}</a>`).join(" · ")}</p>
      </div>
    </section>
    <section class="section-band compact">
      <h2>Research interests</h2>
      <div class="tag-cloud" aria-label="Research interests">
        ${profile.researchThemes.map((theme) => `<span>${esc(theme)}</span>`).join("")}
      </div>
    </section>`;
  return layout({ title: "CV", description: "CV and profile summary for Si Hao Li.", page: "/cv/", content });
}

function renderConference() {
  const selected = publications.filter((item) => item.conferenceSelected).slice(0, 5);
  const content = `
    <section class="conference-shell">
      <div class="conference-main">
        <p class="eyebrow">Conference Mode</p>
        <h1>${esc(profile.name)}</h1>
        <p>${esc(profile.title)} · ${esc(profile.affiliation)}</p>
        <div class="conference-actions">
          <a class="button primary" href="${profile.cv}">CV</a>
          <a class="button" href="${profile.links.googleScholar}">Scholar</a>
          <a class="button" href="${profile.links.github}">GitHub</a>
          <a class="button" href="${profile.links.email}">Email</a>
        </div>
        <div class="conference-columns">
          <div>
            <h2>Selected work</h2>
            ${selected.map(publicationMiniCard).join("")}
          </div>
          <div>
            <h2>Research agenda</h2>
            <ul class="plain-list">${(profile.conferenceFocus || profile.researchThemes).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            <h2>Contact</h2>
            <p>${esc(profile.emails[0])}<br>${esc(profile.office)}</p>
          </div>
        </div>
        ${renderWorldMap(talks, { id: "conference-map", title: "Presentation map", compact: true })}
      </div>
      <aside class="conference-qr" aria-label="QR code to sihaoli.com">
        <img src="/public/qr-sihaoli.svg" alt="QR code linking to ${esc(profile.site)}">
        <p>${esc(profile.site)}</p>
      </aside>
    </section>`;
  return layout({ title: "Conference", description: "Interactive conference card for Si Hao Li.", page: "/conference/", content, bodyClass: "conference-page" });
}

function publicationMiniCard(pub) {
  return `<article class="mini-paper">
    <p class="eyebrow">${esc(pub.typeLabel)} · ${esc(pub.year)}</p>
    <h3>${linkTitle(pub)}</h3>
    <p>${esc(pub.authors.join(", "))}</p>
  </article>`;
}

function publicationDossierEntry(pub) {
  const searchable = [
    pub.title,
    pub.authors.join(" "),
    pub.year,
    pub.status,
    pub.theme,
    pub.researchQuestion,
    pub.abstract,
    pub.typeLabel
  ].join(" ").toLowerCase();
  const links = Object.entries(pub.links || {})
    .map(([label, url]) => `<a href="${url}">${labelize(label)}</a>`)
    .join("");
  const coauthors = pub.authors.filter((author) => author !== profile.name);
  return `<article class="dossier-paper" data-type="${pub.type}" data-maturity="${pub.maturity}" data-search="${esc(searchable)}">
    <div class="paper-index">
      <span>${esc(pub.year)}</span>
      <strong>${esc(pub.typeLabel)}</strong>
    </div>
    <div class="paper-main">
      <h3>${linkTitle(pub)}</h3>
      <p class="authors">${esc(pub.authors.join(", "))}</p>
      <dl class="paper-brief">
        <div>
          <dt>Theme</dt>
          <dd>${esc(pub.theme || "Theme to specify.")}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${esc(pub.status || pub.typeLabel)}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>${links ? `<span class="pub-links">${links}</span>` : "No public link yet."}</dd>
        </div>
      </dl>
      ${coauthors.length ? `<p class="coauthor-note">With ${esc(coauthors.join(", "))}</p>` : ""}
      ${pub.abstract ? `<details class="paper-abstract"><summary>Read abstract</summary><p>${esc(pub.abstract)}</p></details>` : ""}
      <script type="application/x-bibtex">${esc(bibtex(pub))}</script>
    </div>
    ${pub.image ? `<figure class="paper-figure"><img src="${pub.image}" alt="" loading="lazy"></figure>` : ""}
  </article>`;
}

function renderWorldMap(items, options = {}) {
  const id = options.id || "world-map";
  const projected = items.map((item, index) => {
    const baseX = ((Number(item.lng) + 180) / 360) * 1000;
    const baseY = ((90 - Number(item.lat)) / 180) * 520;
    const duplicatesBefore = items.slice(0, index).filter((other) => other.city === item.city && other.country === item.country).length;
    const offset = duplicatesBefore * 13;
    return { item, index, x: baseX + offset, y: baseY - offset };
  });
  const first = items[0] || {};
  return `<section class="map-block${options.compact ? " compact-map" : ""}" data-world-map data-map-items="${esc(JSON.stringify(items))}" id="${id}">
    <div class="map-copy">
      <p class="eyebrow">World map</p>
      <h2>${esc(options.title || "Presentation locations")}</h2>
      <p>Click a point or use Tab then Enter to inspect a presentation location.</p>
    </div>
    <div class="map-stage">
      <svg class="world-map" viewBox="0 0 1000 520" role="img" aria-label="${esc(options.title || "World map of presentation locations")}">
        <path class="continent" d="M142 174l58-34 72 5 43 29-9 45 47 34-23 49-79 5-43-28-53 18-52-42 10-54z"/>
        <path class="continent" d="M440 120l88-34 86 24 43 45 88 10 76 52-18 59-71-5-40 36-82-18-52 23-78-27-62-70z"/>
        <path class="continent" d="M478 292l70-24 53 25 29 69-34 94-58 19-42-62-49-46z"/>
        <path class="continent" d="M264 305l70-18 49 52-12 85-49 70-43-59-34-55z"/>
        <path class="continent" d="M761 318l75-20 79 38 30 56-58 31-91-13-50-44z"/>
        <path class="continent" d="M381 98l34-28 44 18-20 31z"/>
        ${projected.map(({ item, index, x, y }) => `
          <g class="map-point${index === 0 ? " is-active" : ""}" role="button" tabindex="0" data-talk-map-point="${index}" aria-label="${esc(item.title)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
            <circle r="16"></circle>
            <circle r="5"></circle>
          </g>`).join("")}
      </svg>
      <article class="map-panel" data-map-panel aria-live="polite">
        ${mapPanelContent(first)}
      </article>
    </div>
    <ul class="map-fallback-list">
      ${items.map((item, index) => `<li data-map-list-item="${index}"><strong>${esc(item.city)}, ${esc(item.country)}</strong> · ${esc(item.title)} (${esc(item.year)})</li>`).join("")}
    </ul>
  </section>`;
}

function mapPanelContent(item = {}) {
  return `<p class="eyebrow">${esc(item.eventType || item.type || "Talk")} · ${esc(item.dateLabel || item.year || "")}</p>
    <h3>${item.url ? `<a href="${item.url}">${esc(item.title || "Presentation")}</a>` : esc(item.title || "Presentation")}</h3>
    <p>${esc(item.city || "")}${item.country ? `, ${esc(item.country)}` : ""}</p>
    ${item.paperPresented ? `<p class="map-paper">Presented: ${esc(item.paperPresented)}</p>` : `<p class="map-paper">Presentation: to specify.</p>`}`;
}

function talkItem(talk) {
  return `<article class="compact-item">
    <time>${esc(talk.year)}</time>
    <p><a href="${talk.url}">${esc(talk.title)}</a><br><span>${esc(talk.location)}</span></p>
  </article>`;
}

function teachingItem(course) {
  return `<article class="compact-item">
    <time>${esc(course.period)}</time>
    <p>${esc(course.course)}<br><span>${esc(course.institution)} · ${esc(course.level)}</span></p>
  </article>`;
}

function linkTitle(pub) {
  const href = pub.links?.paper;
  return href ? `<a href="${href}">${esc(pub.title)}</a>` : esc(pub.title);
}

function bibtex(pub) {
  const key = `${pub.authors[0].split(" ").at(-1)}${String(pub.year).match(/\d{4}/)?.[0] || "nd"}${pub.id.split("-")[0]}`.replace(/[^A-Za-z0-9]/g, "");
  const entryType = pub.type === "thesis" || pub.type === "master_thesis" ? "thesis" : pub.type === "journal_article" ? "article" : "misc";
  return `@${entryType}{${key},
  title = {${pub.title}},
  author = {${pub.authors.join(" and ")}},
  year = {${pub.year}},
  note = {${pub.status || pub.typeLabel}}
}`;
}

function markdownToHtml(input) {
  const withoutFrontMatter = normalizeMathBlocks(input.replace(/\r\n/g, "\n").replace(/^---[\s\S]*?---\s*/, "").replace(/<!--[\s\S]*?-->/g, ""));
  const lines = withoutFrontMatter.split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let table = [];
  let inCode = false;
  let code = [];
  let codeLang = "";

  const flushParagraph = () => {
    if (paragraph.length) {
      const text = paragraph.join(" ");
      const displayMath = text.match(/^\$([^$]+)\$$/);
      if (displayMath && looksLikeFormula(displayMath[1].trim())) {
        html.push(`<div class="math-display">\\[${esc(displayMath[1].trim().replace(/\\=/g, "="))}\\]</div>`);
      } else {
        html.push(`<p>${inline(text)}</p>`);
      }
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      html.push(`<blockquote>${quote.map((item) => `<p>${inline(item)}</p>`).join("")}</blockquote>`);
      quote = [];
    }
  };
  const flushTable = () => {
    if (table.length) {
      const rows = table
        .filter((line) => !/^\|\s*:?-{2,}/.test(line))
        .map((line, index) => {
          const cells = line.replace(/^\||\|$/g, "").split("|").map((cell) => inline(cell.trim()));
          const tag = index === 0 ? "th" : "td";
          return `<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`;
        })
        .join("");
      html.push(`<div class="table-wrap"><table>${rows}</table></div>`);
      table = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
    flushTable();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code class="language-${esc(codeLang)}">${esc(code.join("\n"))}</code></pre>`);
        inCode = false;
        code = [];
        codeLang = "";
      } else {
        flushAll();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      code.push(rawLine);
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^\|.*\|$/.test(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      table.push(line);
      continue;
    }
    if (/^<div style="text-align:\s*justify;?">/i.test(line)) {
      continue;
    }
    if (/^<[^>]+>/.test(line)) {
      flushAll();
      html.push(rewriteAssetUrls(line));
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      flushTable();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }
    const bullet = line.match(/^[-+*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushQuote();
      flushTable();
      list.push(bullet[1]);
      continue;
    }
    paragraph.push(line);
  }
  flushAll();
  return html.join("\n");
}

function inline(value) {
  return rewriteAssetUrls(esc(normalizeInlineMath(value)))
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${assetUrl(url)}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^A-Za-z0-9])\*([^*\s][^*]*?[^*\s])\*(?![A-Za-z0-9])/g, "$1<em>$2</em>");
}

function normalizeMathBlocks(markdown) {
  return markdown
    .replace(/\\=/g, "=")
    .replace(/(^|\n)\$\$\s*\n?([\s\S]*?)\n?\$\$(?=\n|$)/g, (_, prefix, body) => {
      const formula = body.trim().replace(/\\=/g, "=").replace(/\s*\n\s*/g, " ");
      return `${prefix}<div class="math-display">\\[${formula}\\]</div>`;
    });
}

function normalizeInlineMath(value) {
  return value.replace(/\$([^$\n]+)\$/g, (match, body) => {
    const trimmed = body.trim();
    if (!looksLikeFormula(trimmed)) return match;
    return `\\(${trimmed.replace(/\\=/g, "=")}\\)`;
  });
}

function looksLikeFormula(value) {
  if (value.length > 320) return false;
  if (/(tokens?|Entrée|Sortie|payante|Open|Source)/i.test(value)) return false;
  if (/^[A-Za-z]$/.test(value)) return true;
  return /[\\_^{}<>]|\\times|\\frac|\\sum|\\beta|\\alpha|\\gamma|\\epsilon|\\Delta|\\le|\\ge|=/.test(value);
}

function rewriteAssetUrls(value) {
  return value
    .replace(/src=&quot;\/([^&]+)&quot;/g, (_, file) => `src="/public/${file}"`)
    .replace(/src="\/([^"]+)"/g, (_, file) => `src="/public/${file}"`);
}

function assetUrl(url) {
  if (url.startsWith("/")) return `/public${url}`;
  return url;
}

function labelize(value) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pageName(page) {
  if (page === "/") return "home";
  return page.replace(/^\/|\/$/g, "").split("/").at(0);
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
