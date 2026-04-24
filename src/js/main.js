import { initNavigation, initTheme } from "./router.js";
import { initWebGLBackground } from "./webgl-background.js";
import { initThreeNetwork } from "./three-network.js";
import { initCanvasTimeline } from "./canvas-timeline.js";
import { initWorldMaps } from "./world-map.js";
import { initDataviz } from "./dataviz.js";
import { initPublicationsPage } from "../pages/publications.js";
import { initTalksPage } from "../pages/talks.js";
import { initTeachingPage } from "../pages/teaching.js";
import { initConferencePage } from "../pages/conference.js";

initTheme();
initNavigation();
initWebGLBackground();
initThreeNetwork();
initCanvasTimeline();
initWorldMaps();
initDataviz();

const page = document.body.dataset.page;
const pageInitializers = {
  publications: initPublicationsPage,
  talks: initTalksPage,
  teaching: initTeachingPage,
  conference: initConferencePage
};

pageInitializers[page]?.();
