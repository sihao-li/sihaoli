export async function initCanvasTimeline() {
  const canvas = document.querySelector("#timeline-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const [publications, talks] = await Promise.all([
    fetch("/src/data/publications.json").then((res) => res.json()).catch(() => []),
    fetch("/src/data/talks.json").then((res) => res.json()).catch(() => [])
  ]);
  const years = [...publications, ...talks]
    .map((item) => String(item.year || "").match(/\d{4}/)?.[0])
    .filter(Boolean)
    .map(Number);
  const min = Math.min(...years, 2024);
  const max = Math.max(...years, 2026);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const draw = (now = 0) => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = canvas.clientWidth || canvas.width;
    const height = width / 3;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = css("--line-strong");
    ctx.beginPath();
    ctx.moveTo(36, height * 0.58);
    ctx.lineTo(width - 24, height * 0.58);
    ctx.stroke();

    const items = [
      ...publications.map((item) => ({ kind: "paper", year: Number(String(item.year).match(/\d{4}/)?.[0] || max), title: item.title })),
      ...talks.map((item) => ({ kind: "talk", year: Number(item.year), title: item.title }))
    ].filter((item) => item.year);

    items.forEach((item, index) => {
      const x = 36 + ((item.year - min) / Math.max(1, max - min)) * (width - 60);
      const wave = reducedMotion ? 0 : Math.sin(now * 0.002 + index) * 4;
      const y = height * 0.58 + (item.kind === "paper" ? -20 : 22) + wave;
      ctx.fillStyle = item.kind === "paper" ? css("--accent") : css("--accent-2");
      ctx.beginPath();
      ctx.arc(x, y, item.kind === "paper" ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = css("--muted");
    ctx.font = "12px system-ui";
    for (let year = min; year <= max; year++) {
      const x = 36 + ((year - min) / Math.max(1, max - min)) * (width - 60);
      ctx.fillText(String(year), x - 14, height * 0.58 + 48);
    }

    if (!reducedMotion) requestAnimationFrame(draw);
  };

  draw();
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
