import { initDrag } from "./drag-module.js";
import { createNodeByType, createShowcaseNodes, styleLibrary } from "./tipos/index.js";

const canvas = document.querySelector("#canvas");

if (canvas) {
  const nodes = createShowcaseNodes();
  canvas.replaceChildren(...nodes);
  initDrag(canvas);
}

window.organismoTypes = styleLibrary;
window.createOrganismoNode = createNodeByType;