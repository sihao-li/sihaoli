export function initWorldMaps() {
  document.querySelectorAll("[data-world-map]").forEach((map) => {
    const items = JSON.parse(map.dataset.mapItems || "[]");
    const points = [...map.querySelectorAll("[data-talk-map-point]")];
    const panel = map.querySelector("[data-map-panel]");
    if (!items.length || !points.length || !panel) return;

    const activate = (index) => {
      const item = items[index];
      if (!item) return;
      points.forEach((point, pointIndex) => {
        point.classList.toggle("is-active", pointIndex === index);
        point.setAttribute("aria-pressed", String(pointIndex === index));
      });
      panel.innerHTML = panelHtml(item);
    };

    points.forEach((point, index) => {
      point.setAttribute("aria-pressed", String(index === 0));
      point.addEventListener("click", () => activate(index));
      point.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(index);
        }
      });
    });
  });
}

function panelHtml(item) {
  const title = escapeHtml(item.title || "Presentation");
  const titleHtml = item.url ? `<a href="${escapeAttribute(item.url)}">${title}</a>` : title;
  const paper = item.paperPresented
    ? `Presented: ${escapeHtml(item.paperPresented)}`
    : "Presentation: to specify.";

  return `<p class="eyebrow">${escapeHtml(item.eventType || item.type || "Talk")} · ${escapeHtml(item.dateLabel || item.year || "")}</p>
    <h3>${titleHtml}</h3>
    <p>${escapeHtml(item.city || "")}${item.country ? `, ${escapeHtml(item.country)}` : ""}</p>
    <p class="map-paper">${paper}</p>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}
