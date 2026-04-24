export function initNavigation() {
  const header = document.querySelector("[data-site-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  if (!header || !toggle) return;

  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

export function initTheme() {
  const button = document.querySelector("[data-theme-toggle]");
  const stored = localStorage.getItem("sihaoli-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = initial;

  button?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sihaoli-theme", next);
  });
}
