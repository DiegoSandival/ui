const stage = document.querySelector("#stage");
const viewport = document.querySelector("#viewport");
const menuShell = document.querySelector('[data-role="menu-shell"]');
const resetButton = document.querySelector('[data-command="reset"]');
const upButton = document.querySelector('[data-command="up"]');
const viewButton = document.querySelector('[data-command="view"]');
const currentValueLabel = document.querySelector('[data-role="current-value"]');
const editor = document.querySelector('[data-role="editor"]');
const labelInput = document.querySelector('[data-field="label"]');
const xInput = document.querySelector('[data-field="x"]');
const yInput = document.querySelector('[data-field="y"]');
const typeSelect = document.querySelector('[data-field="type"]');
const valueInput = document.querySelector('[data-field="value"]');
const paragraphInput = document.querySelector('[data-field="paragraph"]');
const idChip = document.querySelector('[data-role="id-chip"]');
const parentsKeyChip = document.querySelector('[data-role="parents-key"]');
const parentsList = document.querySelector('[data-role="parents-list"]');
const saveButton = document.querySelector('[data-command="save"]');
const deleteButton = document.querySelector('[data-command="delete"]');

const graph = {
  rootId: "node-root",
  nodes: {
    "node-root": {
      id: "node-root",
      type: "string",
      label: "raiz",
      value: "root",
      children: [
        { id: "node-idea", x: -220, y: -80 },
        { id: "node-system", x: 0, y: -160 },
        { id: "node-ui", x: 220, y: -70 },
        { id: "node-data", x: -170, y: 120 },
        { id: "node-flow", x: 190, y: 140 }
      ]
    },
    "node-idea": {
      id: "node-idea",
      type: "string",
      label: "tema",
      value: "idea",
      children: [
        { id: "node-note", x: -120, y: 40 },
        { id: "node-sketch", x: 120, y: 10 }
      ]
    },
    "node-system": {
      id: "node-system",
      type: "string",
      label: "bloque",
      value: "sistema",
      children: [
        { id: "node-api", x: -150, y: 90 },
        { id: "node-worker", x: 0, y: 130 },
        { id: "node-cache", x: 150, y: 90 }
      ]
    },
    "node-ui": {
      id: "node-ui",
      type: "string",
      label: "bloque",
      value: "ui",
      children: [
        { id: "node-header", x: -110, y: 80 },
        { id: "node-panel", x: 0, y: 140 },
        { id: "node-canvas", x: 130, y: 40 }
      ]
    },
    "node-data": {
      id: "node-data",
      type: "string",
      label: "bloque",
      value: "datos",
      children: [
        { id: "node-kv", x: -100, y: 80 },
        { id: "node-index", x: 110, y: 60 }
      ]
    },
    "node-flow": {
      id: "node-flow",
      type: "string",
      label: "bloque",
      value: "flujo",
      children: [
        { id: "node-step-1", x: -120, y: 70 },
        { id: "node-step-2", x: 0, y: 120 },
        { id: "node-step-3", x: 120, y: 70 }
      ]
    },
    "node-note": {
      id: "node-note",
      type: "paragraph",
      label: "nota",
      value: "Este nodo ya muestra un parrafo como contenido principal.",
      children: []
    },
    "node-sketch": {
      id: "node-sketch",
      type: "string",
      label: "pieza",
      value: "boceto",
      children: []
    },
    "node-api": {
      id: "node-api",
      type: "string",
      label: "pieza",
      value: "api",
      children: []
    },
    "node-worker": {
      id: "node-worker",
      type: "number",
      label: "hilos",
      value: 4,
      children: []
    },
    "node-cache": {
      id: "node-cache",
      type: "number",
      label: "tamano",
      value: 256,
      children: []
    },
    "node-header": {
      id: "node-header",
      type: "string",
      label: "pieza",
      value: "header",
      children: []
    },
    "node-panel": {
      id: "node-panel",
      type: "paragraph",
      label: "copy",
      value: "Panel principal con informacion corta y accion clara.",
      children: []
    },
    "node-canvas": {
      id: "node-canvas",
      type: "string",
      label: "pieza",
      value: "canvas",
      children: []
    },
    "node-kv": {
      id: "node-kv",
      type: "string",
      label: "estructura",
      value: "key value",
      children: []
    },
    "node-index": {
      id: "node-index",
      type: "number",
      label: "version",
      value: 1,
      children: []
    },
    "node-step-1": {
      id: "node-step-1",
      type: "string",
      label: "paso",
      value: "inicio",
      children: []
    },
    "node-step-2": {
      id: "node-step-2",
      type: "string",
      label: "paso",
      value: "proceso",
      children: []
    },
    "node-step-3": {
      id: "node-step-3",
      type: "string",
      label: "paso",
      value: "salida",
      children: []
    }
  }
};

const state = {
  currentNodeId: graph.rootId,
  currentPosition: null,
  homePosition: null,
  selectedChildId: null,
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

function getStageCenter() {
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

function ensureCurrentPosition() {
  if (!state.currentPosition) {
    state.currentPosition = getStageCenter();
  }

  if (!state.homePosition) {
    state.homePosition = clonePosition(state.currentPosition);
  }
}

function getNode(nodeId) {
  return graph.nodes[nodeId] ?? null;
}

function getCurrentNode() {
  return getNode(state.currentNodeId);
}

function ensureChildren(node) {
  if (!Array.isArray(node.children)) {
    node.children = [];
  }

  return node.children;
}

function ensureParents(node) {
  if (!Array.isArray(node.parents)) {
    node.parents = [];
  }

  return node.parents;
}

function generateNodeId() {
  if (typeof crypto?.randomUUID === "function") {
    return `node-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `node-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNodeName(value) {
  return normalizeText(value).toLowerCase();
}

function getDefaultNodeName(node) {
  if (node.type === "string" && typeof node.value === "string" && normalizeText(node.value)) {
    return normalizeText(node.value);
  }

  if (normalizeText(node.value)) {
    return normalizeText(node.value);
  }

  return node.id.replace(/^node-/, "");
}

function getParentsKey(name) {
  return `padres-${normalizeText(name) || "nuevo"}`;
}

function ensureNodeNames() {
  const usedNames = new Set();

  Object.values(graph.nodes).forEach((node) => {
    const preferredName = normalizeText(node.name || getDefaultNodeName(node)) || node.id;
    let nextName = preferredName;
    let suffix = 2;

    while (usedNames.has(normalizeNodeName(nextName))) {
      nextName = `${preferredName}-${suffix}`;
      suffix += 1;
    }

    node.name = nextName;
    node.parentsKey = getParentsKey(nextName);
    usedNames.add(normalizeNodeName(nextName));
  });
}

function syncParentLinks() {
  Object.values(graph.nodes).forEach((node) => {
    ensureParents(node).length = 0;
    node.parentsKey = getParentsKey(node.name);
  });

  Object.values(graph.nodes).forEach((parentNode) => {
    ensureChildren(parentNode).forEach((childRef) => {
      const childNode = getNode(childRef.id);

      if (!childNode) {
        return;
      }

      ensureParents(childNode).push({
        id: parentNode.id,
        name: parentNode.name,
        value: getDisplayValue(parentNode)
      });
    });
  });
}

function parseOffset(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNodeValue(type, rawValue) {
  if (type === "number") {
    const parsed = Number.parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return String(rawValue ?? "");
}

function getDisplayValue(node) {
  if (node.type === "number") {
    return String(node.value ?? 0);
  }

  const text = normalizeText(node.value);

  if (text) {
    return text;
  }

  return node.id;
}

function getTypeLabel(type) {
  if (type === "paragraph") {
    return "parrafo";
  }

  if (type === "number") {
    return "numero";
  }

  return "string";
}

function getNodeMeta(node) {
  const parts = [];

  if (node.name) {
    parts.push(node.name);
  }

  parts.push(getTypeLabel(node.type));
  return parts.join(" · ");
}

function findNodeByName(name, excludeNodeId = null) {
  const normalizedName = normalizeNodeName(name);

  if (!normalizedName) {
    return null;
  }

  return (
    Object.values(graph.nodes).find((node) => node.id !== excludeNodeId && normalizeNodeName(node.name) === normalizedName) ?? null
  );
}

function findSiblingRefByNodeId(nodeId, excludeIndex = -1) {
  const currentNode = getCurrentNode();

  if (!currentNode) {
    return null;
  }

  return ensureChildren(currentNode).find((childRef, index) => index !== excludeIndex && childRef.id === nodeId) ?? null;
}

function applyCamera() {
  viewport.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.scale})`;
}

function centerViewOn(position, scale = state.camera.scale) {
  const center = getStageCenter();
  state.camera.scale = scale;
  state.camera.x = center.x - position.x * scale;
  state.camera.y = center.y - position.y * scale;
  applyCamera();
}

function screenToWorld(clientX, clientY) {
  const rect = getStageRect();

  return {
    x: (clientX - rect.left - state.camera.x) / state.camera.scale,
    y: (clientY - rect.top - state.camera.y) / state.camera.scale
  };
}

function getSelectedChildIndex() {
  const currentNode = getCurrentNode();

  if (!currentNode) {
    return -1;
  }

  return ensureChildren(currentNode).findIndex((childRef) => childRef.id === state.selectedChildId);
}

function getSelectedChildRef() {
  const currentNode = getCurrentNode();
  const childIndex = getSelectedChildIndex();

  if (!currentNode || childIndex === -1) {
    return null;
  }

  return {
    index: childIndex,
    ref: ensureChildren(currentNode)[childIndex],
    node: getNode(ensureChildren(currentNode)[childIndex].id)
  };
}

function setValueFieldVisibility() {
  const isParagraph = typeSelect.value === "paragraph";
  paragraphInput.classList.toggle("is-hidden", !isParagraph);
  valueInput.classList.toggle("is-hidden", isParagraph);
  valueInput.type = typeSelect.value === "number" ? "number" : "text";
  valueInput.placeholder = typeSelect.value === "number" ? "numero" : "valor";
}

function fillValueFields(type, value) {
  typeSelect.value = type;
  setValueFieldVisibility();

  if (type === "paragraph") {
    paragraphInput.value = String(value ?? "");
    valueInput.value = "";
    return;
  }

  valueInput.value = String(value ?? "");
  paragraphInput.value = "";
}

function getEditorValue() {
  const rawValue = typeSelect.value === "paragraph" ? paragraphInput.value : valueInput.value;

  return {
    type: typeSelect.value,
    value: parseNodeValue(typeSelect.value, rawValue)
  };
}

function resetEditorFields() {
  labelInput.value = "";
  xInput.value = "140";
  yInput.value = "0";
  idChip.textContent = "nuevo";
  parentsKeyChip.textContent = "padres-nuevo";
  parentsList.textContent = "sin padres";
  fillValueFields("string", "");
}

function syncEditor() {
  const selectedChild = getSelectedChildRef();

  upButton.disabled = state.path.length === 0;

  if (!selectedChild || !selectedChild.node) {
    saveButton.textContent = "guardar";
    deleteButton.disabled = true;

    if (
      document.activeElement !== labelInput &&
      document.activeElement !== xInput &&
      document.activeElement !== yInput &&
      document.activeElement !== valueInput &&
      document.activeElement !== paragraphInput
    ) {
      resetEditorFields();
    }

    return;
  }

  saveButton.textContent = "actualizar";
  deleteButton.disabled = false;
  idChip.textContent = selectedChild.node.id;
  parentsKeyChip.textContent = selectedChild.node.parentsKey || getParentsKey(selectedChild.node.name);
  parentsList.textContent = selectedChild.node.parents?.length
    ? selectedChild.node.parents.map((parent) => parent.name).join(", ")
    : "sin padres";
  labelInput.value = selectedChild.node.name ?? "";
  xInput.value = String(selectedChild.ref.x);
  yInput.value = String(selectedChild.ref.y);
  fillValueFields(selectedChild.node.type, selectedChild.node.value);
}

function countIncomingRefs(nodeId) {
  return Object.values(graph.nodes).reduce((count, node) => {
    return count + ensureChildren(node).filter((childRef) => childRef.id === nodeId).length;
  }, 0);
}

function pruneDetachedNode(nodeId) {
  if (nodeId === graph.rootId || countIncomingRefs(nodeId) > 0) {
    return;
  }

  const node = getNode(nodeId);

  if (!node) {
    return;
  }

  const descendantIds = ensureChildren(node).map((childRef) => childRef.id);
  delete graph.nodes[nodeId];

  descendantIds.forEach((childId) => {
    pruneDetachedNode(childId);
  });
}

function createNodeFromEditor() {
  const name = normalizeText(labelInput.value);
  const { type, value } = getEditorValue();

  return {
    id: generateNodeId(),
    name,
    parentsKey: getParentsKey(name),
    parents: [],
    type,
    value,
    children: []
  };
}

function saveChild() {
  const currentNode = getCurrentNode();

  if (!currentNode) {
    return;
  }

  const x = parseOffset(xInput.value);
  const y = parseOffset(yInput.value);
  const name = normalizeText(labelInput.value);
  const { type, value } = getEditorValue();
  const selectedChild = getSelectedChildRef();

  if (!name) {
    return;
  }

  if (!selectedChild) {
    const existingNode = findNodeByName(name);

    if (existingNode) {
      const siblingRef = findSiblingRefByNodeId(existingNode.id);

      if (siblingRef) {
        siblingRef.x = x;
        siblingRef.y = y;
      } else {
        ensureChildren(currentNode).push({ id: existingNode.id, x, y });
      }

      syncParentLinks();
      state.selectedChildId = existingNode.id;
      render();
      return;
    }

    const nextNode = createNodeFromEditor();
    nextNode.name = name;
    nextNode.type = type;
    nextNode.value = value;
    graph.nodes[nextNode.id] = nextNode;
    ensureChildren(currentNode).push({ id: nextNode.id, x, y });
    syncParentLinks();
    state.selectedChildId = nextNode.id;
    render();
    return;
  }

  const targetNode = findNodeByName(name, selectedChild.node.id);

  if (targetNode) {
    const siblingRef = findSiblingRefByNodeId(targetNode.id, selectedChild.index);

    if (siblingRef) {
      siblingRef.x = x;
      siblingRef.y = y;
      ensureChildren(currentNode).splice(selectedChild.index, 1);
    } else {
      selectedChild.ref.id = targetNode.id;
      selectedChild.ref.x = x;
      selectedChild.ref.y = y;
    }

    pruneDetachedNode(selectedChild.node.id);
    syncParentLinks();
    state.selectedChildId = targetNode.id;
    render();
    return;
  }

  selectedChild.ref.x = x;
  selectedChild.ref.y = y;
  selectedChild.node.name = name;
  selectedChild.node.parentsKey = getParentsKey(name);
  selectedChild.node.type = type;
  selectedChild.node.value = value;
  syncParentLinks();
  render();
}

function deleteSelectedChild() {
  const currentNode = getCurrentNode();
  const selectedChild = getSelectedChildRef();

  if (!currentNode || !selectedChild) {
    return;
  }

  ensureChildren(currentNode).splice(selectedChild.index, 1);
  pruneDetachedNode(selectedChild.node.id);
  syncParentLinks();
  state.selectedChildId = null;
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

function createGraphNode(node, position, options = {}) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "graph-node";
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  element.classList.toggle("is-parent", Boolean(options.parent));
  element.classList.toggle("is-selected", Boolean(options.selected));
  element.classList.toggle("is-string", node.type === "string");
  element.classList.toggle("is-paragraph", node.type === "paragraph");
  element.classList.toggle("is-number", node.type === "number");

  const valueNode = document.createElement("p");
  valueNode.className = "graph-node-value";
  valueNode.textContent = getDisplayValue(node);

  const labelNode = document.createElement("span");
  labelNode.className = "graph-node-label";
  labelNode.textContent = node.name || node.id;

  const metaNode = document.createElement("span");
  metaNode.className = "graph-node-meta";
  metaNode.textContent = getTypeLabel(node.type);

  element.append(valueNode, labelNode, metaNode);
  return element;
}

function trySetPointerCapture(target, pointerId) {
  if (typeof target.setPointerCapture !== "function") {
    return;
  }

  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Synthetic events used in validation may not carry an active pointer.
  }
}

function selectOrOpenChild(childRef, worldPosition) {
  if (state.selectedChildId === childRef.id) {
    const currentNode = getCurrentNode();

    if (!currentNode) {
      return;
    }

    state.path.push({
      nodeId: currentNode.id,
      position: clonePosition(state.currentPosition)
    });
    state.currentNodeId = childRef.id;
    state.currentPosition = clonePosition(worldPosition);
    state.selectedChildId = null;
    render();
    centerViewOn(state.currentPosition);
    return;
  }

  state.selectedChildId = childRef.id;
  render();
}

function enableChildDragging(nodeElement, childRef, childNode, edge, worldPosition) {
  nodeElement.addEventListener("pointerdown", (event) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = childRef.x;
    const initialY = childRef.y;
    let dragged = false;

    trySetPointerCapture(nodeElement, event.pointerId);

    const onPointerMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / state.camera.scale;
      const deltaY = (moveEvent.clientY - startY) / state.camera.scale;

      if (!dragged && Math.hypot(deltaX, deltaY) > 4) {
        dragged = true;
      }

      if (!dragged) {
        return;
      }

      childRef.x = Math.round(initialX + deltaX);
      childRef.y = Math.round(initialY + deltaY);
      worldPosition.x = state.currentPosition.x + childRef.x;
      worldPosition.y = state.currentPosition.y + childRef.y;
      nodeElement.style.left = `${worldPosition.x}px`;
      nodeElement.style.top = `${worldPosition.y}px`;
      updateEdge(edge, state.currentPosition, worldPosition);

      if (state.selectedChildId !== childRef.id) {
        state.selectedChildId = childRef.id;
      }

      idChip.textContent = childNode.id;
      parentsKeyChip.textContent = childNode.parentsKey || getParentsKey(childNode.name);
      parentsList.textContent = childNode.parents?.length
        ? childNode.parents.map((parent) => parent.name).join(", ")
        : "sin padres";
      labelInput.value = childNode.name ?? "";
      xInput.value = String(childRef.x);
      yInput.value = String(childRef.y);
      fillValueFields(childNode.type, childNode.value);
      saveButton.textContent = "actualizar";
      deleteButton.disabled = false;
    };

    const stopDragging = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      if (dragged) {
        state.selectedChildId = childRef.id;
        render();
        return;
      }

      selectOrOpenChild(childRef, worldPosition);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function enableStagePanning() {
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".graph-node")) {
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
        state.selectedChildId = null;
        render();
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopPanning, { once: true });
    window.addEventListener("pointercancel", stopPanning, { once: true });
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      const pointer = screenToWorld(event.clientX, event.clientY);
      const nextScale = Math.min(Math.max(state.camera.scale * (event.deltaY < 0 ? 1.1 : 0.9), 0.35), 2.8);
      const rect = getStageRect();

      state.camera.x = event.clientX - rect.left - pointer.x * nextScale;
      state.camera.y = event.clientY - rect.top - pointer.y * nextScale;
      state.camera.scale = nextScale;
      applyCamera();
    },
    { passive: false }
  );
}

function enableMenuDragging(shell) {
  const grip = shell.querySelector(".widget-grip");

  if (!grip) {
    return;
  }

  grip.addEventListener("mousedown", (event) => {
    const shellRect = shell.getBoundingClientRect();
    const offsetX = event.clientX - shellRect.left;
    const offsetY = event.clientY - shellRect.top;

    shell.classList.add("dragging");
    event.preventDefault();

    const onMouseMove = (moveEvent) => {
      const viewportWidth = Math.max(window.innerWidth, document.documentElement.clientWidth, stage.clientWidth);
      const viewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight, stage.clientHeight);
      const shellBounds = shell.getBoundingClientRect();
      const maxX = Math.max(14, viewportWidth - shellBounds.width - 14);
      const maxY = Math.max(14, viewportHeight - shellBounds.height - 14);
      const nextX = Math.min(Math.max(moveEvent.clientX - offsetX, 14), maxX);
      const nextY = Math.min(Math.max(moveEvent.clientY - offsetY, 14), maxY);

      shell.style.left = `${nextX}px`;
      shell.style.top = `${nextY}px`;
    };

    const stopDragging = () => {
      shell.classList.remove("dragging");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDragging, { once: true });
  });
}

function goRoot() {
  ensureCurrentPosition();
  state.currentNodeId = graph.rootId;
  state.currentPosition = clonePosition(state.homePosition);
  state.selectedChildId = null;
  state.path = [];
  render();
  centerViewOn(state.currentPosition, 1);
}

function goUp() {
  if (state.path.length === 0) {
    return;
  }

  const parent = state.path.pop();
  state.currentNodeId = parent.nodeId;
  state.currentPosition = clonePosition(parent.position);
  state.selectedChildId = null;
  render();
  centerViewOn(state.currentPosition);
}

function render() {
  ensureCurrentPosition();

  const currentNode = getCurrentNode();

  if (!currentNode) {
    return;
  }

  const currentPosition = state.currentPosition;
  const childRefs = ensureChildren(currentNode);

  viewport.replaceChildren();

  const lineLayer = createLineLayer();
  viewport.append(lineLayer);

  const parentElement = createGraphNode(currentNode, currentPosition, { parent: true });
  parentElement.addEventListener("click", () => {
    state.selectedChildId = null;
    render();
  });
  viewport.append(parentElement);

  childRefs.forEach((childRef) => {
    const childNode = getNode(childRef.id);

    if (!childNode) {
      return;
    }

    const childPosition = {
      x: currentPosition.x + childRef.x,
      y: currentPosition.y + childRef.y
    };
    const edge = createEdge(lineLayer, currentPosition, childPosition);
    const childElement = createGraphNode(childNode, childPosition, {
      selected: state.selectedChildId === childRef.id
    });

    enableChildDragging(childElement, childRef, childNode, edge, childPosition);
    viewport.append(childElement);
  });

  currentValueLabel.textContent = getDisplayValue(currentNode);
  syncEditor();
  applyCamera();
}

resetButton.addEventListener("click", () => {
  goRoot();
});

upButton.addEventListener("click", () => {
  goUp();
});

viewButton.addEventListener("click", () => {
  ensureCurrentPosition();
  centerViewOn(state.currentPosition, 1);
});

typeSelect.addEventListener("change", () => {
  setValueFieldVisibility();
});

editor.addEventListener("submit", (event) => {
  event.preventDefault();
  saveChild();
});

deleteButton.addEventListener("click", () => {
  deleteSelectedChild();
});

window.addEventListener("resize", () => {
  if (state.currentNodeId === graph.rootId && state.path.length === 0) {
    const center = getStageCenter();
    state.homePosition = center;
    state.currentPosition = center;
  }

  render();
});

enableStagePanning();
enableMenuDragging(menuShell);
ensureNodeNames();
syncParentLinks();
setValueFieldVisibility();
menuShell.style.left = "14px";
menuShell.style.top = "14px";
state.currentPosition = getStageCenter();
state.homePosition = clonePosition(state.currentPosition);
centerViewOn(state.currentPosition, 1);
render();