import * as THREE from "three";

export function initThreeNetwork() {
  const container = document.querySelector("#three-network");
  if (!container) return;

  const themes = JSON.parse(container.dataset.themes || "[]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  container.append(renderer.domElement);
  container.querySelector(".visual-fallback")?.setAttribute("hidden", "");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const group = new THREE.Group();
  scene.add(group);

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x6f3a2f });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: 0x7b2532 });
  const nodes = themes.map((theme, index) => {
    const angle = (index / themes.length) * Math.PI * 2;
    const radius = index % 2 ? 2.1 : 2.75;
    const geometry = new THREE.SphereGeometry(index === 0 ? 0.12 : 0.085, 20, 20);
    const mesh = new THREE.Mesh(geometry, index % 3 === 0 ? accentMaterial : nodeMaterial);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.15) * 1.35, Math.sin(angle) * 1.65);
    mesh.userData.theme = theme;
    group.add(mesh);
    return mesh;
  });

  const linePositions = [];
  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i].position;
    const next = nodes[(i + 1) % nodes.length].position;
    const skip = nodes[(i + 3) % nodes.length].position;
    linePositions.push(current.x, current.y, current.z, next.x, next.y, next.z);
    if (i % 2 === 0) linePositions.push(current.x, current.y, current.z, skip.x, skip.y, skip.z);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8f7a62, transparent: true, opacity: 0.3 });
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  const labels = themes.map((theme, index) => {
    const label = document.createElement("span");
    label.className = "node-label";
    label.textContent = theme;
    label.style.position = "absolute";
    label.style.fontSize = "0.72rem";
    label.style.color = "var(--muted)";
    label.style.pointerEvents = "none";
    label.dataset.index = String(index);
    container.append(label);
    return label;
  });

  let pointerX = 0;
  let pointerY = 0;
  container.addEventListener("pointermove", (event) => {
    const rect = container.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });

  const resize = () => {
    const rect = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  };

  const updateLabels = () => {
    const rect = container.getBoundingClientRect();
    nodes.forEach((node, index) => {
      const vector = node.position.clone().applyMatrix4(group.matrixWorld).project(camera);
      labels[index].style.left = `${(vector.x * 0.5 + 0.5) * rect.width}px`;
      labels[index].style.top = `${(-vector.y * 0.5 + 0.5) * rect.height}px`;
    });
  };

  const animate = (now) => {
    resize();
    if (!reducedMotion) {
      group.rotation.y = now * 0.00016 + pointerX * 0.28;
      group.rotation.x = pointerY * 0.18;
      nodes.forEach((node, index) => {
        node.scale.setScalar(1 + Math.sin(now * 0.0012 + index) * 0.08);
      });
    }
    renderer.render(scene, camera);
    updateLabels();
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}
