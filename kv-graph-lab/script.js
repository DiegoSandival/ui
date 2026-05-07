const stage = document.querySelector("#stage");
const viewport = document.querySelector("#viewport");
const menuShell = document.querySelector('[data-role="menu-shell"]');
const resetButton = document.querySelector('[data-command="reset"]');
const upButton = document.querySelector('[data-command="up"]');
const viewButton = document.querySelector('[data-command="view"]');
const currentKeyLabel = document.querySelector('[data-role="current-key"]');
const editor = document.querySelector('[data-role="editor"]');
const keyInput = document.querySelector('[data-field="key"]');
const xInput = document.querySelector('[data-field="x"]');
const yInput = document.querySelector('[data-field="y"]');
const typeSelect = document.querySelector('[data-field="type"]');
const valueInput = document.querySelector('[data-field="value"]');
const paragraphInput = document.querySelector('[data-field="paragraph"]');
const saveButton = document.querySelector('[data-command="save"]');
const deleteButton = document.querySelector('[data-command="delete"]');

const db = {
  root: [
    ["idea", -220, -80],
    ["sistema", 0, -160],
    ["ui", 220, -70],
    ["datos", -170, 120],
    ["flujo", 190, 140]
  ],
  idea: [
    ["nota", -120, 40],
    ["boceto", 120, 10]
  ],
  sistema: [
    ["api", -150, 90],
    ["worker", 0, 130],
    ["cache", 150, 90]
  ],
  ui: [
    ["header", -110, 80],
    ["panel", 0, 140],
    ["canvas", 130, 40]
  ],
  datos: [
    ["kv", -100, 80],
    ["indice", 110, 60]
  ],
  flujo: [
    ["paso1", -120, 70],
    ["paso2", 0, 120],
    ["paso3", 120, 70]
  ],
  kv: [
    ["par", -90, 70],
    ["valor", 100, 70]
  ]
};

const nodeData = {
  root: { type: "string", value: "" },
  idea: { type: "string", value: "" },
  sistema: { type: "string", value: "" },
  ui: { type: "string", value: "" },
  datos: { type: "string", value: "" },
  flujo: { type: "string", value: "" },
  nota: { type: "paragraph", value: "" },
  boceto: { type: "string", value: "" },
  api: { type: "string", value: "" },
  worker: { type: "string", value: "" },
  cache: { type: "number", value: 0 },
  header: { type: "string", value: "" },
  panel: { type: "string", value: "" },
  canvas: { type: "string", value: "" },
  kv: { type: "string", value: "" },
  indice: { type: "number", value: 0 },
  paso1: { type: "string", value: "" },
  paso2: { type: "string", value: "" },
  paso3: { type: "string", value: "" },
  par: { type: "string", value: "" },
  valor: { type: "number", value: 0 }
};

const state = {
  currentKey: "root",
  currentPosition: null,
  homePosition: null,
  selectedChildKey: null,
  path: [],
  camera: {
    x: 0,
    y: 0,
    scale: 1
  }
};

function getStageRect() {
  return stage.getBoundingClientRect();
}

function getStageCenterScreen() {
  const rect = getStageRect();

  return {
    x: rect.width / 2,
    y: rect.height / 2
  };
}

function clonePosition(position) {
  return {
    x: position.x,
    y: position.y
  };
}

function clonePath(path) {
  return path.map((entry) => ({
    key: entry.key,
    position: clonePosition(entry.position)
  }));
}

function ensurePosition() {
  if (!state.currentPosition) {
    const center = getStageCenterScreen();
    state.currentPosition = center;
  }

  if (!state.homePosition) {
    state.homePosition = clonePosition(state.currentPosition);
  }
}

function screenToWorld(clientX, clientY) {
  const rect = getStageRect();

  return {
    x: (clientX - rect.left - state.camera.x) / state.camera.scale,
    y: (clientY - rect.top - state.camera.y) / state.camera.scale
  };
}

function applyCamera() {
  viewport.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.scale})`;
}

function centerViewOn(position, scale = state.camera.scale) {
  const center = getStageCenterScreen();
  state.camera.scale = scale;
  state.camera.x = center.x - position.x * scale;
  state.camera.y = center.y - position.y * scale;
  applyCamera();
}

function ensureChildList(key) {
  if (!Array.isArray(db[key])) {
    db[key] = [];
  }

  return db[key];
}

function ensureNodeData(key) {
  if (!nodeData[key]) {
    nodeData[key] = { type: "string", value: "" };
  }

  return nodeData[key];
}

function getChildren(key) {
  return ensureChildList(key);
}

function openChild(child) {
  ensurePosition();
  state.path.push({
    key: state.currentKey,
    position: clonePosition(state.currentPosition)
  });
  state.currentKey = child.key;
  state.currentPosition = { x: child.x, y: child.y };
  state.selectedChildKey = null;
  render();
  centerViewOn(state.currentPosition);
}

function goRoot() {
  ensurePosition();
  state.currentKey = "root";
  state.currentPosition = clonePosition(state.homePosition);
  state.selectedChildKey = null;
  state.path = [];
  render();
  centerViewOn(state.currentPosition, 1);
}

function goUp() {
  if (state.path.length === 0) {
    return;
  }

  const parent = state.path.pop();
  state.currentKey = parent.key;
  state.currentPosition = clonePosition(parent.position);
  state.selectedChildKey = null;
  render();
  centerViewOn(state.currentPosition);
}

function getSelectedChildIndex() {
  return getChildren(state.currentKey).findIndex(([key]) => key === state.selectedChildKey);
}

function getSelectedChildEntry() {
  const childIndex = getSelectedChildIndex();

  if (childIndex === -1) {
    return null;
  }

  return {
    index: childIndex,
    entry: getChildren(state.currentKey)[childIndex]
  };
}

function countReferences(targetKey) {
  return Object.values(db).reduce((count, children) => {
    if (!Array.isArray(children)) {
      return count;
    }

    return count + children.filter(([key]) => key === targetKey).length;
  }, 0);
}

function renameKeyEverywhere(oldKey, newKey) {
  Object.values(db).forEach((children) => {
    if (!Array.isArray(children)) {
      return;
    }

    children.forEach((child) => {
      if (child[0] === oldKey) {
        child[0] = newKey;
      }
    });
  });

  if (Object.prototype.hasOwnProperty.call(db, oldKey) && oldKey !== newKey) {
    db[newKey] = db[oldKey];
    delete db[oldKey];
  }

  if (Object.prototype.hasOwnProperty.call(nodeData, oldKey) && oldKey !== newKey) {
    nodeData[newKey] = nodeData[oldKey];
    delete nodeData[oldKey];
  }
}

function normalizeKey(value) {
  return value.trim();
}

function parseOffset(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNodeValue(type, value) {
  if (type === "number") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
}

function syncValueFieldVisibility() {
  const paragraphMode = typeSelect.value === "paragraph";
  paragraphInput.classList.toggle("is-hidden", !paragraphMode);
  valueInput.classList.toggle("is-hidden", paragraphMode);
  valueInput.type = typeSelect.value === "number" ? "number" : "text";
  valueInput.placeholder = typeSelect.value === "number" ? "numero" : "valor";
}

function setEditorData(type, value) {
  typeSelect.value = type;
  syncValueFieldVisibility();

  if (type === "paragraph") {
    paragraphInput.value = String(value ?? "");
    valueInput.value = "";
    return;
  }

  valueInput.value = String(value ?? "");
  paragraphInput.value = "";
}

function getEditorNodeData() {
  const type = typeSelect.value;
  const sourceValue = type === "paragraph" ? paragraphInput.value : valueInput.value;

  return {
    type,
    value: parseNodeValue(type, sourceValue)
  };
}

function describeNodeType(key) {
  const meta = ensureNodeData(key);

  if (meta.type === "paragraph") {
    return "parrafo";
  }

  if (meta.type === "number") {
    return "numero";
  }

  return "string";
}

function resetEditorFields() {
  keyInput.value = "";
  xInput.value = "140";
  yInput.value = "0";
  setEditorData("string", "");
}

function syncEditor() {
  const selectedChild = getSelectedChildEntry();

  upButton.disabled = state.path.length === 0;

  if (!selectedChild) {
    saveButton.textContent = "guardar";
    deleteButton.disabled = true;

    if (document.activeElement !== keyInput && document.activeElement !== xInput && document.activeElement !== yInput) {
      resetEditorFields();
    }

    return;
  }

  const [key, x, y] = selectedChild.entry;
  const meta = ensureNodeData(key);
  saveButton.textContent = "actualizar";
  deleteButton.disabled = false;
  keyInput.value = key;
  xInput.value = String(x);
  yInput.value = String(y);
  setEditorData(meta.type, meta.value);
}

function saveChild() {
  const key = normalizeKey(keyInput.value);

  if (!key) {
    return;
  }

  const x = parseOffset(xInput.value);
  const y = parseOffset(yInput.value);
  const meta = getEditorNodeData();
  const selectedChild = getSelectedChildEntry();

  if (!selectedChild) {
    getChildren(state.currentKey).push([key, x, y]);

    if (!Object.prototype.hasOwnProperty.call(db, key)) {
      db[key] = [];
    }

    nodeData[key] = meta;

    state.selectedChildKey = key;
    render();
    return;
  }

  const [previousKey] = selectedChild.entry;
  selectedChild.entry[0] = key;
  selectedChild.entry[1] = x;
  selectedChild.entry[2] = y;

  if (previousKey !== key) {
    renameKeyEverywhere(previousKey, key);
  }

  if (!Object.prototype.hasOwnProperty.call(db, key)) {
    db[key] = [];
  }

  nodeData[key] = meta;

  state.selectedChildKey = key;
  render();
}

function deleteSelectedChild() {
  const selectedChild = getSelectedChildEntry();

  if (!selectedChild) {
    return;
  }

  const [key] = selectedChild.entry;
  getChildren(state.currentKey).splice(selectedChild.index, 1);

  if (countReferences(key) === 0) {
    delete db[key];
    delete nodeData[key];
  }

  state.selectedChildKey = null;
  render();
}

function createLineLayer() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "graph-layer");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function updateEdge(line, from, to) {
  line.setAttribute("x1", String(from.x));
  line.setAttribute("y1", String(from.y));
  line.setAttribute("x2", String(to.x));
  line.setAttribute("y2", String(to.y));
}

function createEdge(layer, from, to) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("class", "graph-edge");
  updateEdge(line, from, to);
  layer.append(line);
  return line;
}

function createNode({ key, x, y, parent = false, selected = false }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "graph-node";
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;

  if (parent) {
    button.classList.add("is-parent");
  }

  if (selected) {
    button.classList.add("is-selected");
  }

  const keyLabel = document.createElement("span");
  keyLabel.className = "graph-node-key";
  keyLabel.textContent = key;
  button.append(keyLabel);

  const metaLabel = document.createElement("span");
  metaLabel.className = "graph-node-meta";
  metaLabel.textContent = describeNodeType(key);
  button.append(metaLabel);
  return button;
}

function trySetPointerCapture(target, pointerId) {
  if (typeof target.setPointerCapture !== "function") {
    return;
  }

  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Synthetic events used in tests may not have an active pointer.
  }
}

function selectOrOpenChild(child) {
  if (state.selectedChildKey === child.key) {
    openChild(child);
    return;
  }

  state.selectedChildKey = child.key;
  render();
}

function enableChildPointerInteraction(node, child, childEntry, edge) {
  node.addEventListener("pointerdown", (event) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const initialDx = childEntry[1];
    const initialDy = childEntry[2];
    let dragged = false;

    trySetPointerCapture(node, event.pointerId);

    const onPointerMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / state.camera.scale;
      const deltaY = (moveEvent.clientY - startY) / state.camera.scale;

      if (!dragged && Math.hypot(deltaX, deltaY) > 4) {
        dragged = true;
      }

      if (!dragged) {
        return;
      }

      const nextDx = Math.round(initialDx + deltaX);
      const nextDy = Math.round(initialDy + deltaY);

      childEntry[1] = nextDx;
      childEntry[2] = nextDy;
      child.x = state.currentPosition.x + nextDx;
      child.y = state.currentPosition.y + nextDy;
      node.style.left = `${child.x}px`;
      node.style.top = `${child.y}px`;
      updateEdge(edge, state.currentPosition, child);

      if (state.selectedChildKey !== child.key) {
        state.selectedChildKey = child.key;
      }

      keyInput.value = child.key;
      xInput.value = String(nextDx);
      yInput.value = String(nextDy);
      setEditorData(ensureNodeData(child.key).type, ensureNodeData(child.key).value);
      saveButton.textContent = "actualizar";
      deleteButton.disabled = false;
    };

    const stopDragging = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      if (dragged) {
        state.selectedChildKey = child.key;
        render();
        return;
      }

      selectOrOpenChild(child);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function render() {
  ensurePosition();

  const parentPosition = state.currentPosition;
  const childEntries = getChildren(state.currentKey);
  const children = childEntries.map(([key, dx, dy]) => ({
    key,
    x: parentPosition.x + dx,
    y: parentPosition.y + dy
  }));

  viewport.replaceChildren();

  const lineLayer = createLineLayer();
  viewport.append(lineLayer);

  const parentNode = createNode({
    key: state.currentKey,
    x: parentPosition.x,
    y: parentPosition.y,
    parent: true
  });
  parentNode.addEventListener("click", () => {
    state.selectedChildKey = null;
    render();
  });
  viewport.append(parentNode);

  children.forEach((child, index) => {
    const edge = createEdge(lineLayer, parentPosition, child);
    const childNode = createNode({
      key: child.key,
      x: child.x,
      y: child.y,
      selected: state.selectedChildKey === child.key
    });

    enableChildPointerInteraction(childNode, child, childEntries[index], edge);
    viewport.append(childNode);
  });

  currentKeyLabel.textContent = state.currentKey;
  syncEditor();
  applyCamera();
}

function enableMenuDragging(shell) {
  const handle = shell.querySelector(".widget-grip");

  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    const shellRect = shell.getBoundingClientRect();
    const offsetX = event.clientX - shellRect.left;
    const offsetY = event.clientY - shellRect.top;

    shell.classList.add("dragging");
    trySetPointerCapture(handle, event.pointerId);

    const onMove = (moveEvent) => {
      const maxX = Math.max(0, window.innerWidth - shell.offsetWidth - 14);
      const maxY = Math.max(0, window.innerHeight - shell.offsetHeight - 14);
      const nextX = Math.min(Math.max(moveEvent.clientX - offsetX, 14), maxX);
      const nextY = Math.min(Math.max(moveEvent.clientY - offsetY, 14), maxY);

      shell.style.left = `${nextX}px`;
      shell.style.top = `${nextY}px`;
    };

    const stopDragging = () => {
      shell.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

viewport.addEventListener("pointerdown", (event) => {
  if (event.target !== viewport) {
    return;
  }

  const startCameraX = state.camera.x;
  const startCameraY = state.camera.y;
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;

  trySetPointerCapture(viewport, event.pointerId);

  const onPointerMove = (moveEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;

    if (!moved && Math.hypot(deltaX, deltaY) > 4) {
      moved = true;
      stage.classList.add("is-panning");
    }

    if (!moved) {
      return;
    }

    state.camera.x = startCameraX + deltaX;
    state.camera.y = startCameraY + deltaY;
    applyCamera();
  };

  const stopPanning = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopPanning);
    window.removeEventListener("pointercancel", stopPanning);
    stage.classList.remove("is-panning");

    if (!moved) {
      state.selectedChildKey = null;
      render();
    }
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopPanning, { once: true });
  window.addEventListener("pointercancel", stopPanning, { once: true });
});

stage.addEventListener("wheel", (event) => {
  event.preventDefault();

  const pointer = screenToWorld(event.clientX, event.clientY);
  const nextScale = Math.min(Math.max(state.camera.scale * (event.deltaY < 0 ? 1.1 : 0.9), 0.35), 2.8);

  state.camera.x = event.clientX - getStageRect().left - pointer.x * nextScale;
  state.camera.y = event.clientY - getStageRect().top - pointer.y * nextScale;
  state.camera.scale = nextScale;
  applyCamera();
}, { passive: false });

resetButton.addEventListener("click", () => {
  goRoot();
});

upButton.addEventListener("click", () => {
  goUp();
});

viewButton.addEventListener("click", () => {
  ensurePosition();
  centerViewOn(state.currentPosition, 1);
});

typeSelect.addEventListener("change", () => {
  syncValueFieldVisibility();
});

editor.addEventListener("submit", (event) => {
  event.preventDefault();
  saveChild();
});

deleteButton.addEventListener("click", () => {
  deleteSelectedChild();
});

window.addEventListener("resize", () => {
  if (state.currentKey === "root" && state.path.length === 0) {
    const center = getStageCenterScreen();
    state.homePosition = center;
    state.currentPosition = center;
  }

  render();
});

state.currentPosition = getStageCenterScreen();
state.homePosition = clonePosition(state.currentPosition);
syncValueFieldVisibility();
enableMenuDragging(menuShell);
centerViewOn(state.currentPosition, 1);
render();