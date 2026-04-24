export function initPublicationFilters() {
  const list = document.querySelector("[data-publication-list]");
  if (!list) return;

  const cards = [...list.querySelectorAll(".dossier-paper")];
  const buttons = [...document.querySelectorAll("[data-filter-group='publications'] [data-filter-value]")];
  const search = document.querySelector("[data-publication-search]");
  let active = "all";

  const apply = () => {
    const query = (search?.value || "").trim().toLowerCase();
    cards.forEach((card) => {
      const typeMatches = active === "all" || card.dataset.maturity === active || card.dataset.type === active;
      const queryMatches = !query || (card.dataset.search || "").includes(query);
      card.hidden = !(typeMatches && queryMatches);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.filterValue || "all";
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      apply();
    });
  });
  search?.addEventListener("input", apply);

  document.querySelector("[data-export-bibtex]")?.addEventListener("click", () => {
    const entries = cards
      .filter((card) => !card.hidden)
      .map((card) => card.querySelector('script[type="application/x-bibtex"]')?.textContent.trim())
      .filter(Boolean)
      .join("\n\n");
    const blob = new Blob([entries], { type: "application/x-bibtex" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sihao-li-publications.bib";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}
