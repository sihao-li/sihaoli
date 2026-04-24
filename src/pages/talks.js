export function initTalksPage() {
  document.querySelectorAll(".timeline-item").forEach((item, index) => {
    item.style.setProperty("--item-index", String(index));
  });
}
