const TOKEN_RE = (() => {
  try {
    return new RegExp("\\p{L}{2,}", "gu");
  } catch {
    return /[A-Za-zÀ-ÿ]{2,}/g;
  }
})();

export function initDataviz() {
  const root = document.querySelector("[data-top5-dataviz]");
  if (!root) return;

  const els = {
    query: root.querySelector("[data-dataviz-query]"),
    smooth: root.querySelector("[data-dataviz-smooth]"),
    smoothOutput: root.querySelector("[data-dataviz-smooth-output]"),
    yearMin: root.querySelector("[data-dataviz-year-min]"),
    yearMax: root.querySelector("[data-dataviz-year-max]"),
    journals: root.querySelector("[data-dataviz-journals]"),
    metrics: root.querySelector("[data-dataviz-metrics]"),
    chart: root.querySelector("[data-dataviz-chart]"),
    caption: root.querySelector("[data-dataviz-caption]"),
    results: root.querySelector("[data-dataviz-results]")
  };

  const state = {
    rows: [],
    journals: [],
    years: []
  };

  fetch(root.dataset.dataset)
    .then((response) => {
      if (!response.ok) throw new Error(`Dataset returned ${response.status}`);
      return response.text();
    })
    .then((text) => {
      state.rows = prepareRows(parseCsv(text));
      state.journals = [...new Set(state.rows.map((row) => row.journal).filter(Boolean))].sort();
      state.years = [...new Set(state.rows.map((row) => row.year))].sort((a, b) => a - b);
      hydrateControls(root, els, state);
      bindControls(root, els, state);
      update(root, els, state);
    })
    .catch((error) => {
      els.metrics.innerHTML = `<p>Unable to load the local dataset.</p>`;
      els.results.innerHTML = `<p class="content-note">${escapeHtml(error.message)}</p>`;
    });
}

function hydrateControls(root, els, state) {
  const firstYear = state.years[0] || "";
  const lastYear = state.years.at(-1) || "";
  els.yearMin.value = firstYear;
  els.yearMax.value = lastYear;
  els.yearMin.min = firstYear;
  els.yearMin.max = lastYear;
  els.yearMax.min = firstYear;
  els.yearMax.max = lastYear;
  els.journals.innerHTML = state.journals
    .map((journal) => `
      <label class="journal-chip">
        <input type="checkbox" value="${escapeHtml(journal)}" checked>
        <span>${escapeHtml(journal)}</span>
      </label>`)
    .join("");
  root.classList.add("is-ready");
}

function bindControls(root, els, state) {
  const updateNow = () => update(root, els, state);
  els.query.addEventListener("input", updateNow);
  els.smooth.addEventListener("input", updateNow);
  els.yearMin.addEventListener("change", updateNow);
  els.yearMax.addEventListener("change", updateNow);
  els.journals.addEventListener("change", updateNow);
}

function update(root, els, state) {
  const query = els.query.value.trim();
  const smooth = Number(els.smooth.value || 0);
  const selectedJournals = new Set(
    [...els.journals.querySelectorAll("input:checked")].map((input) => input.value)
  );
  const yearMin = Number(els.yearMin.value || state.years[0]);
  const yearMax = Number(els.yearMax.value || state.years.at(-1));
  const low = Math.min(yearMin, yearMax);
  const high = Math.max(yearMin, yearMax);

  els.smoothOutput.textContent = `${smooth} year${smooth === 1 ? "" : "s"}`;

  if (query.length < 2 || !selectedJournals.size) {
    drawChart(els.chart, []);
    els.metrics.innerHTML = `<p>Enter a term and keep at least one journal selected.</p>`;
    els.results.innerHTML = "";
    return;
  }

  const parsed = parseQuery(query);
  const filtered = state.rows.filter((row) =>
    row.year >= low && row.year <= high && selectedJournals.has(row.journal)
  );
  const yearly = computeYearly(filtered, parsed);
  const series = smoothSeries(yearly, smooth);
  const matches = filtered
    .filter((row) => countInTokens(row.tokens, parsed) > 0)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));

  drawChart(els.chart, series);
  renderMetrics(els.metrics, {
    articles: filtered.length,
    matches: matches.length,
    years: `${low}-${high}`,
    journals: selectedJournals.size
  });
  els.caption.textContent = captionFor(parsed, smooth);
  renderResults(els.results, matches);
}

function prepareRows(rows) {
  return rows
    .map((row) => {
      const title = row.title || "";
      const abstract = row.abstract || "";
      const year = Number(row.year);
      const journal = row.journal || "";
      return {
        title,
        abstract,
        year,
        journal,
        tokens: tokenize(`${title} ${abstract}`)
      };
    })
    .filter((row) => Number.isFinite(row.year) && row.journal && row.tokens.length);
}

function parseQuery(query) {
  const q = normalizeText(query);
  if (q.includes("&")) {
    return { mode: "phrase", terms: q.split("&").flatMap(tokenize).filter(Boolean) };
  }
  if (q.includes("+")) {
    return { mode: "or", terms: q.split("+").flatMap(tokenize).filter(Boolean) };
  }
  const terms = tokenize(q);
  return terms.length > 1 ? { mode: "phrase", terms } : { mode: "single", terms };
}

function computeYearly(rows, parsed) {
  const byYear = new Map();
  rows.forEach((row) => {
    const entry = byYear.get(row.year) || { year: row.year, words: 0, count: 0 };
    entry.words += row.tokens.length;
    entry.count += countInTokens(row.tokens, parsed);
    byYear.set(row.year, entry);
  });
  return [...byYear.values()]
    .map((entry) => ({
      year: entry.year,
      frequency: entry.words ? entry.count / entry.words : 0,
      count: entry.count
    }))
    .sort((a, b) => a.year - b.year);
}

function countInTokens(tokens, parsed) {
  if (!parsed.terms.length) return 0;
  if (parsed.mode === "single") {
    const term = parsed.terms[0];
    return tokens.reduce((sum, token) => sum + (token === term ? 1 : 0), 0);
  }
  if (parsed.mode === "or") {
    const terms = new Set(parsed.terms);
    return tokens.reduce((sum, token) => sum + (terms.has(token) ? 1 : 0), 0);
  }
  const phrase = parsed.terms;
  let count = 0;
  for (let i = 0; i <= tokens.length - phrase.length; i += 1) {
    let ok = true;
    for (let j = 0; j < phrase.length; j += 1) {
      if (tokens[i + j] !== phrase[j]) {
        ok = false;
        break;
      }
    }
    if (ok) count += 1;
  }
  return count;
}

function smoothSeries(series, windowSize) {
  if (windowSize <= 1) return series;
  const radius = Math.floor(windowSize / 2);
  return series.map((point, index) => {
    const slice = series.slice(Math.max(0, index - radius), Math.min(series.length, index + radius + 1));
    const frequency = slice.reduce((sum, item) => sum + item.frequency, 0) / slice.length;
    return { ...point, frequency };
  });
}

function drawChart(canvas, series) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(720, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(440 * dpr);
  ctx.scale(dpr, dpr);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const pad = { top: 26, right: 24, bottom: 46, left: 62 };
  const styles = getComputedStyle(document.documentElement);
  const ink = styles.getPropertyValue("--ink").trim() || "#1f2428";
  const muted = styles.getPropertyValue("--muted").trim() || "#626b72";
  const line = styles.getPropertyValue("--line").trim() || "#d8cfc1";
  const accent = styles.getPropertyValue("--accent").trim() || "#7b2532";
  const warm = styles.getPropertyValue("--warm").trim() || "#8f5b36";

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  ctx.fillStyle = muted;

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const years = series.map((point) => point.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const maxY = Math.max(...series.map((point) => point.frequency * 10000), 0.01);

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + plotH * (i / 4);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    const label = ((maxY * (1 - i / 4))).toFixed(maxY < 1 ? 2 : 1);
    ctx.fillText(label, 12, y + 4);
  }

  if (!series.length) {
    ctx.fillStyle = muted;
    ctx.fillText("No data for this selection.", pad.left, pad.top + 28);
    return;
  }

  const xFor = (year) => pad.left + ((year - minYear) / Math.max(1, maxYear - minYear)) * plotW;
  const yFor = (value) => pad.top + plotH - ((value * 10000) / maxY) * plotH;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  series.forEach((point, index) => {
    const x = xFor(point.year);
    const y = yFor(point.frequency);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = warm;
  series.forEach((point) => {
    const x = xFor(point.year);
    const y = yFor(point.frequency);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = muted;
  ctx.textAlign = "center";
  const ticks = [...new Set([minYear, Math.round((minYear + maxYear) / 2), maxYear])];
  ticks.forEach((year) => ctx.fillText(String(year), xFor(year), height - 18));
  ctx.save();
  ctx.translate(18, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = ink;
  ctx.fillText("matches per 10,000 words", 0, 0);
  ctx.restore();
  ctx.textAlign = "left";
}

function renderMetrics(target, metrics) {
  target.innerHTML = `
    <article><span>Articles</span><strong>${metrics.articles.toLocaleString()}</strong></article>
    <article><span>Matches</span><strong>${metrics.matches.toLocaleString()}</strong></article>
    <article><span>Years</span><strong>${escapeHtml(metrics.years)}</strong></article>
    <article><span>Journals</span><strong>${metrics.journals}</strong></article>`;
}

function renderResults(target, matches) {
  if (!matches.length) {
    target.innerHTML = `<p class="content-note">No matching article in this selection.</p>`;
    return;
  }
  const rows = matches.slice(0, 80).map((row) => `
    <tr>
      <td>${row.year}</td>
      <td>${escapeHtml(row.journal)}</td>
      <td>${escapeHtml(row.title)}</td>
    </tr>`).join("");
  target.innerHTML = `
    <h2>Matching documents</h2>
    <p>${matches.length.toLocaleString()} document${matches.length === 1 ? "" : "s"} found. Showing the first ${Math.min(80, matches.length)}.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Year</th><th>Journal</th><th>Title</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function captionFor(parsed, smooth) {
  const terms = parsed.terms.join(parsed.mode === "phrase" ? " " : ", ");
  const mode = parsed.mode === "or" ? "any of" : parsed.mode === "phrase" ? "phrase" : "exact token";
  const smoothing = smooth > 1 ? ` Smoothed with a ${smooth}-year centered window.` : "";
  return `Metric: ${mode} "${terms}", counted in titles and abstracts per 10,000 words.${smoothing}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);

  const headers = rows.shift() || [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function tokenize(value) {
  return normalizeText(value).match(TOKEN_RE) || [];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
