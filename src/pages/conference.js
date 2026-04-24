export function initConferencePage() {
  const shell = document.querySelector(".conference-shell");
  if (!shell || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  shell.addEventListener("pointermove", (event) => {
    const rect = shell.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    shell.style.transform = `perspective(1200px) rotateX(${(-y * 2).toFixed(2)}deg) rotateY(${(x * 2).toFixed(2)}deg)`;
  });

  shell.addEventListener("pointerleave", () => {
    shell.style.transform = "";
  });
}
