import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html",
  "publications/index.html",
  "talks/index.html",
  "teaching/index.html",
  "tutorials/index.html",
  "conference/index.html",
  "public/vendor/three.module.js",
  "public/vendor/mathjax/tex-chtml.js",
  "public/data/top5-econ.csv",
  "public/qr-sihaoli.svg",
  "src/js/main.js",
  "src/js/dataviz.js",
  "src/styles/base.css",
  "src/data/publications.json"
];

for (const file of required) {
  await access(path.join(root, file));
}

for (const file of ["profile.json", "publications.json", "talks.json", "teaching.json", "tutorials.json"]) {
  JSON.parse(await readFile(path.join(root, "src", "data", file), "utf8"));
}

const index = await readFile(path.join(root, "index.html"), "utf8");
const publicationsPage = await readFile(path.join(root, "publications", "index.html"), "utf8");
const conferencePage = await readFile(path.join(root, "conference", "index.html"), "utf8");
const datavizPage = await readFile(path.join(root, "tutorials", "top-five-econ-dataviz", "index.html"), "utf8");
const mathTutorial = await readFile(path.join(root, "tutorials", "antitrust-econometrics-cartels", "index.html"), "utf8");
const talksPage = await readFile(path.join(root, "talks", "index.html"), "utf8");
if (!index.includes("/public/vendor/three.module.js")) {
  throw new Error("Import map does not reference vendored Three.js.");
}

if (index.includes("/public/vendor/mathjax/tex-chtml.js")) {
  throw new Error("MathJax should not be loaded on non-math pages.");
}

if (!mathTutorial.includes("/public/vendor/mathjax/tex-chtml.js")) {
  throw new Error("Math tutorial pages do not load vendored MathJax.");
}

if (index.includes("/resources/") || index.includes("/past/")) {
  throw new Error("Removed public sections are still linked from the homepage.");
}

if (publicationsPage.includes("<dt>Method</dt>") || publicationsPage.includes("<dt>Question</dt>")) {
  throw new Error("Publications page should expose themes, not Method/Question fields.");
}

if (publicationsPage.includes("Accepted for presentation") || publicationsPage.includes("Forthcoming at Venture Capital")) {
  throw new Error("Publication statuses were not updated.");
}

if (!publicationsPage.includes("Published in Venture Capital (2026)") || !publicationsPage.includes("10.1080/13691066.2026.2630741")) {
  throw new Error("Venture Capital publication metadata/link is missing.");
}

if (!publicationsPage.includes("Lukasz Grzybowski, Marc Bourreau, Si Hao Li")) {
  throw new Error("Mobile Money authors are not in the requested order.");
}

if (conferencePage.includes("Currently working on") || !conferencePage.includes("Research agenda") || !conferencePage.includes("EARIE, August 2026")) {
  throw new Error("Conference focus copy was not updated.");
}

if (conferencePage.includes("Fast Estimation of BLP Demand")) {
  throw new Error("Conference selected work still includes Fast BLP.");
}

if (!conferencePage.includes("Mobile Money, Interoperability and Competition") || !conferencePage.includes("Second-Degree Price Discrimination") || !conferencePage.includes("Co-invention and knowledge transfer")) {
  throw new Error("Conference selected work does not match the requested papers.");
}

if (conferencePage.includes("Infrastructure sharing") || conferencePage.includes("Science-industry collaboration and recombinant novelty")) {
  throw new Error("Old research agenda copy is still present.");
}

if (!index.includes('href="/public/cv.pdf"')) {
  throw new Error("Top navigation should link directly to the CV PDF.");
}

if (talksPage.includes("timeline-item") || talksPage.includes("presentation-bullets") || talksPage.includes("talk-ledger")) {
  throw new Error("Talks page still includes the removed presentation list.");
}

if (datavizPage.includes("streamlit.app") || !datavizPage.includes("data-top5-dataviz")) {
  throw new Error("Data Viz page should use the self-hosted static visualization.");
}

console.log("Static checks passed.");
