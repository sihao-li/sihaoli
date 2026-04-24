export function initTeachingPage() {
  document.querySelectorAll(".info-card").forEach((card) => {
    card.setAttribute("tabindex", "0");
  });
}
