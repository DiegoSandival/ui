const stage = document.querySelector("#stage");
const viewport = document.querySelector("#viewport");
const navShell = document.querySelector('[data-role="nav-shell"]');
const resetButton = document.querySelector('[data-command="reset"]');
const upButton = document.querySelector('[data-command="up"]');
const viewButton = document.querySelector('[data-command="view"]');
const newButton = document.querySelector('[data-command="new"]');
const currentValueLabel = document.querySelector('[data-role="current-value"]');
const currentMetaLabel = document.querySelector('[data-role="current-meta"]');

const ROLE_LABELS = {
  content: "nodo",
  clicks: "clicks",
  parents: "padres",
  layers: "capas",
  action: "accion",
  "layer-item": "capa"
};

const DEFAULT_ACTIONS = {
  content: {
    "click-1": "select",
    "click-2": "open"
  },
  clicks: {
    "click-1": "show-inner-space",
    "click-2": "open"
  },
  parents: {
    "click-1": "show-inner-space",
    "click-2": "open"
  },
  layers: {
    "click-1": "show-inner-space",
    "click-2": "open"
  },
  action: {
    "click-1": "select",
    "click-2": "noop"
  },
  "layer-item": {
    "click-1": "toggle-layer",
    "click-2": "noop"
  }
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase();
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

function clonePoint(point) {
  return {
    x: point.x,
    y: point.y
  };
}

function generateId(prefix) {
  if (typeof crypto?.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createGraph() {
  return {
    rootNodeId: null,
    nodes: {},
    spaces: {}
  };
}

const graph = createGraph();

function createSpace(ownerNodeId, options = {}) {
  const space = {
    id: options.id || generateId("space"),
    ownerNodeId,
    layers: (options.layers || [{ id: "layer-base", name: "base", visible: true, x: -110, y: 108 }]).map((layer) => ({
      id: layer.id || generateId("layer"),
      name: layer.name || "base",
      visible: layer.visible !== false,
      x: layer.x ?? -110,
      y: layer.y ?? 108
    })),
    refs: []
  };

  graph.spaces[space.id] = space;
  return space;
}

function createNode(options) {
  const node = {
    id: options.id || generateId("node"),
    name: options.name,
    type: options.type || "string",
    value: options.value ?? options.name,
    role: options.role || "content",
    spaceId: options.spaceId || generateId("space"),
    link: options.link || null,
    meta: options.meta ? { ...options.meta } : {},
    system: options.system ? { ...options.system } : {}
  };

  graph.nodes[node.id] = node;
  createSpace(node.id, {
    id: node.spaceId,
    layers: options.layers
  });
  return node;
}

function addRef(spaceId, nodeId, x, y, layerId = null, refId = null) {
  const space = getSpace(spaceId);

  if (!space) {
    return null;
  }

  const targetLayerId = layerId || getDefaultLayer(space)?.id || "layer-base";
  const ref = {
    id: refId || generateId("ref"),
    nodeId,
    x,
    y,
    layerId: targetLayerId
  };

  space.refs.push(ref);
  return ref;
}

function getNode(nodeId) {
  return graph.nodes[nodeId] ?? null;
}

function getSpace(spaceId) {
  return graph.spaces[spaceId] ?? null;
}

function getCurrentNode() {
  return getNode(state.currentNodeId);
}

function getCurrentSpace() {
  const currentNode = getCurrentNode();
  return currentNode ? getSpace(currentNode.spaceId) : null;
}

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

function ensureCurrentPosition() {
  if (!state.currentPosition) {
    state.currentPosition = getStageCenter();
  }

  if (!state.homePosition) {
    state.homePosition = clonePoint(state.currentPosition);
  }
}

function getDisplayValue(node) {
  if (node.role === "parents") {
    return "padres";
  }

  if (node.role === "clicks") {
    return "clicks";
  }

  if (node.role === "layers") {
    return "capas";
  }

  if (node.role === "action") {
    return normalizeText(node.value) || node.meta.slot || node.name;
  }

  if (node.role === "layer-item") {
    return normalizeText(node.value) || node.name;
  }

  if (node.type === "number") {
    return String(node.value ?? 0);
  }

  const text = normalizeText(node.value);
  return text || node.name || node.id;
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

  if (node.link?.originId) {
    const originNode = getNode(node.link.originId);
    parts.push(`clon de ${originNode?.name || node.link.originId}`);
  }

  if (node.role !== "content") {
    parts.push(ROLE_LABELS[node.role] || node.role);
  } else {
    parts.push(getTypeLabel(node.type));
  }

  return parts.join(" · ");
}

function getDefaultLayer(space) {
  return space?.layers?.[0] ?? null;
}

function findLayer(space, layerId) {
  return space?.layers?.find((layer) => layer.id === layerId) ?? null;
}

function uniqueLayerName(space, seed = "capa") {
  let name = seed;
  let suffix = 2;
  const used = new Set((space.layers || []).map((layer) => normalizeName(layer.name)));

  while (used.has(normalizeName(name))) {
    name = `${seed}-${suffix}`;
    suffix += 1;
  }

  return name;
}

function findNodeByName(name, excludeNodeId = null) {
  const normalized = normalizeName(name);

  if (!normalized) {
    return null;
  }

  return (
    Object.values(graph.nodes).find((node) => node.id !== excludeNodeId && normalizeName(node.name) === normalized) ?? null
  );
}

function createUniqueNodeName(seed = "nodo") {
  let next = seed;
  let suffix = 2;

  while (findNodeByName(next)) {
    next = `${seed}-${suffix}`;
    suffix += 1;
  }

  return next;
}

function findRefById(space, refId) {
  return space?.refs?.find((ref) => ref.id === refId) ?? null;
}

function findRefToNode(space, nodeId, excludeRefId = null) {
  return (
    space?.refs?.find((ref) => ref.id !== excludeRefId && ref.nodeId === nodeId) ?? null
  );
}

function countIncomingRefs(nodeId) {
  return Object.values(graph.spaces).reduce((count, space) => {
    return count + space.refs.filter((ref) => ref.nodeId === nodeId).length;
  }, 0);
}

function pruneDetachedNode(nodeId) {
  if (nodeId === graph.rootNodeId || countIncomingRefs(nodeId) > 0) {
    return;
  }

  const node = getNode(nodeId);

  if (!node) {
    return;
  }

  const space = getSpace(node.spaceId);
  const descendantIds = (space?.refs || []).map((ref) => ref.nodeId);

  delete graph.nodes[nodeId];
  if (space) {
    delete graph.spaces[space.id];
  }

  descendantIds.forEach((childId) => {
    pruneDetachedNode(childId);
  });
}

function getParentRelations(subjectNodeId) {
  return Object.values(graph.spaces).flatMap((space) => {
    const parentNode = getNode(space.ownerNodeId);

    if (!parentNode) {
      return [];
    }

    return space.refs
      .filter((ref) => ref.nodeId === subjectNodeId)
      .map((ref) => ({
        parentNodeId: parentNode.id,
        parentNode,
        space,
        ref
      }));
  });
}

function buildInitialGraph() {
  const organismo = createNode({
    id: "node-organismo",
    spaceId: "space-organismo",
    name: "organismo",
    type: "paragraph",
    value: "un espacio donde viven mas nodos",
    layers: [
      { id: "layer-base", name: "base", visible: true, x: -110, y: 112 },
      { id: "layer-echo", name: "eco", visible: false, x: 112, y: 112 }
    ]
  });
  const corazon = createNode({
    id: "node-corazon",
    spaceId: "space-corazon",
    name: "corazon",
    type: "paragraph",
    value: "latido, ritmo y bombeo"
  });
  const memoria = createNode({
    id: "node-memoria",
    spaceId: "space-memoria",
    name: "memoria",
    type: "paragraph",
    value: "rastros que se quedan dentro del espacio"
  });
  const vision = createNode({
    id: "node-vision",
    spaceId: "space-vision",
    name: "vision",
    type: "string",
    value: "vision"
  });
  const pulso = createNode({
    id: "node-pulso",
    spaceId: "space-pulso",
    name: "pulso",
    type: "number",
    value: 72
  });
  const auricula = createNode({
    id: "node-auricula",
    spaceId: "space-auricula",
    name: "auricula",
    type: "string",
    value: "auricula"
  });
  const ventriculo = createNode({
    id: "node-ventriculo",
    spaceId: "space-ventriculo",
    name: "ventriculo",
    type: "string",
    value: "ventriculo"
  });
  const archivo = createNode({
    id: "node-archivo",
    spaceId: "space-archivo",
    name: "archivo",
    type: "paragraph",
    value: "capa donde una idea puede quedarse congelada"
  });
  const foco = createNode({
    id: "node-foco",
    spaceId: "space-foco",
    name: "foco",
    type: "string",
    value: "foco"
  });

  const memoriaEco = createNode({
    id: "node-memoria-eco",
    spaceId: "space-memoria-eco",
    name: "memoria-eco",
    type: "paragraph",
    value: "memoria eco",
    link: {
      originId: memoria.id,
      mode: "linked"
    }
  });

  addRef(organismo.spaceId, corazon.id, -230, -20, "layer-base", "ref-root-corazon");
  addRef(organismo.spaceId, memoria.id, 0, 140, "layer-base", "ref-root-memoria");
  addRef(organismo.spaceId, vision.id, 230, -10, "layer-base", "ref-root-vision");
  addRef(organismo.spaceId, memoriaEco.id, 250, 180, "layer-echo", "ref-root-memoria-eco");

  addRef(corazon.spaceId, auricula.id, -120, 90, "layer-base", "ref-corazon-auricula");
  addRef(corazon.spaceId, ventriculo.id, 120, 90, "layer-base", "ref-corazon-ventriculo");
  addRef(corazon.spaceId, pulso.id, 0, 160, "layer-base", "ref-corazon-pulso");

  addRef(memoria.spaceId, archivo.id, -120, 90, "layer-base", "ref-memoria-archivo");
  addRef(memoria.spaceId, pulso.id, 130, 84, "layer-base", "ref-memoria-pulso");

  addRef(vision.spaceId, foco.id, 0, 100, "layer-base", "ref-vision-foco");
  addRef(vision.spaceId, archivo.id, -150, 150, "layer-base", "ref-vision-archivo");

  graph.rootNodeId = organismo.id;
}

buildInitialGraph();

const state = {
  currentNodeId: graph.rootNodeId,
  currentPosition: null,
  homePosition: null,
  selectedToken: null,
  previewToken: null,
  path: [],
  camera: {
    x: 0,
    y: 0,
    scale: 1
  },
  lastRenderMap: new Map()
};

function createSystemNode(role, ownerNode) {
  const roleName = role === "parents" ? "padres" : role === "layers" ? "capas" : "clicks";
  return createNode({
    name: createUniqueNodeName(`${roleName}-${ownerNode.name}`),
    type: "string",
    value: roleName,
    role,
    meta: {
      subjectNodeId: ownerNode.id
    }
  });
}

function ensureSystemRef(ownerNode, role, defaults) {
  const space = getSpace(ownerNode.spaceId);
  let changed = false;

  if (!ownerNode.system[`${role}NodeId`]) {
    const systemNode = createSystemNode(role, ownerNode);
    ownerNode.system[`${role}NodeId`] = systemNode.id;
    changed = true;
  }

  const systemNodeId = ownerNode.system[`${role}NodeId`];
  if (!findRefToNode(space, systemNodeId)) {
    addRef(space.id, systemNodeId, defaults.x, defaults.y, defaults.layerId || getDefaultLayer(space)?.id);
    changed = true;
  }

  return changed;
}

function removeSystemRef(ownerNode, role) {
  const systemNodeId = ownerNode.system[`${role}NodeId`];
  const space = getSpace(ownerNode.spaceId);

  if (!systemNodeId || !space) {
    return false;
  }

  const nextRefs = space.refs.filter((ref) => ref.nodeId !== systemNodeId);

  if (nextRefs.length === space.refs.length) {
    return false;
  }

  space.refs = nextRefs;
  return true;
}

function shouldEnsureClicks(node) {
  return node.role === "content" || node.role === "parents" || node.role === "layers";
}

function shouldEnsureLayers(node) {
  return node.role === "content";
}

function shouldEnsureParents(node) {
  return node.role === "content" && getParentRelations(node.id).length > 0;
}

function getDefaultAction(subjectNode, slot) {
  const roleDefaults = DEFAULT_ACTIONS[subjectNode.role] || DEFAULT_ACTIONS.content;
  return roleDefaults[slot] || DEFAULT_ACTIONS.content[slot];
}

function ensureActionNodes(clicksNode, subjectNode) {
  const space = getSpace(clicksNode.spaceId);
  const slots = [
    { slot: "click-1", x: -90, y: 96 },
    { slot: "click-2", x: 90, y: 96 }
  ];
  let changed = false;

  slots.forEach(({ slot, x, y }) => {
    const ref = space.refs.find((entry) => {
      const childNode = getNode(entry.nodeId);
      return childNode?.role === "action" && childNode.meta.slot === slot;
    });

    if (ref) {
      return;
    }

    const actionNode = createNode({
      name: createUniqueNodeName(`${slot}-${subjectNode.name}`),
      type: "string",
      value: getDefaultAction(subjectNode, slot),
      role: "action",
      meta: {
        slot,
        subjectNodeId: subjectNode.id
      }
    });

    addRef(space.id, actionNode.id, x, y, getDefaultLayer(space)?.id);
    changed = true;
  });

  return changed;
}

function stabilizeGraph() {
  let changed = false;
  let pending = true;

  while (pending) {
    pending = false;
    const snapshot = Object.values(graph.nodes);

    snapshot.forEach((node) => {
      if (shouldEnsureClicks(node)) {
        pending = ensureSystemRef(node, "clicks", { x: -250, y: -150 }) || pending;
        const clicksNode = getNode(node.system.clicksNodeId);
        if (clicksNode) {
          pending = ensureActionNodes(clicksNode, node) || pending;
        }
      }

      if (shouldEnsureLayers(node)) {
        pending = ensureSystemRef(node, "layers", { x: 250, y: -150 }) || pending;
      }

      if (shouldEnsureParents(node)) {
        pending = ensureSystemRef(node, "parents", { x: 0, y: -210 }) || pending;
      } else if (node.system.parentsNodeId) {
        pending = removeSystemRef(node, "parents") || pending;
      }
    });

    changed = changed || pending;
  }

  return changed;
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

function createLineLayer() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "organism-layer");
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
  line.setAttribute("class", "organism-edge");
  updateEdge(line, from, to);
  layer.append(line);
  return line;
}

function createLayerDisplayNode(ownerNode, layer) {
  return {
    id: `virtual-layer-${ownerNode.spaceId}-${layer.id}`,
    name: layer.name,
    type: "string",
    value: layer.name,
    role: "layer-item",
    meta: {
      layerId: layer.id,
      visible: layer.visible,
      subjectNodeId: ownerNode.id
    },
    system: {}
  };
}

function buildSpaceRefDescriptors(node, origin, preview = false) {
  const space = getSpace(node.spaceId);

  if (!space) {
    return [];
  }

  const visibleLayerIds = new Set(space.layers.filter((layer) => layer.visible).map((layer) => layer.id));

  return space.refs.flatMap((ref) => {
    const childNode = getNode(ref.nodeId);

    if (!childNode) {
      return [];
    }

    if (!preview && !visibleLayerIds.has(ref.layerId)) {
      return [];
    }

    return [
      {
        token: `${preview ? "preview-ref" : "ref"}:${space.id}:${ref.id}`,
        sourceType: "space-ref",
        preview,
        node: childNode,
        ownerNodeId: node.id,
        ownerSpaceId: space.id,
        actualRef: ref,
        position: {
          x: origin.x + ref.x,
          y: origin.y + ref.y
        },
        draggable: !preview
      }
    ];
  });
}

function buildDerivedParentDescriptors(node, origin, preview = false) {
  if (node.role !== "parents") {
    return [];
  }

  const subjectNode = getNode(node.meta.subjectNodeId);

  if (!subjectNode) {
    return [];
  }

  return getParentRelations(subjectNode.id).map((relation) => ({
    token: `${preview ? "preview-parent" : "parent"}:${node.id}:${relation.parentNodeId}`,
    sourceType: "parent-relation",
    preview,
    node: relation.parentNode,
    subjectNodeId: subjectNode.id,
    relation,
    position: {
      x: origin.x + relation.ref.x,
      y: origin.y + relation.ref.y
    },
    draggable: !preview
  }));
}

function buildDerivedLayerDescriptors(node, origin, preview = false) {
  if (node.role !== "layers") {
    return [];
  }

  const subjectNode = getNode(node.meta.subjectNodeId);
  const subjectSpace = subjectNode ? getSpace(subjectNode.spaceId) : null;

  if (!subjectNode || !subjectSpace) {
    return [];
  }

  return subjectSpace.layers.map((layer) => ({
    token: `${preview ? "preview-layer" : "layer"}:${subjectSpace.id}:${layer.id}`,
    sourceType: "layer-item",
    preview,
    node: createLayerDisplayNode(subjectNode, layer),
    layer,
    subjectNodeId: subjectNode.id,
    position: {
      x: origin.x + layer.x,
      y: origin.y + layer.y
    },
    draggable: !preview
  }));
}

function buildDescriptorsForNode(node, origin, preview = false) {
  return [
    ...buildSpaceRefDescriptors(node, origin, preview),
    ...buildDerivedParentDescriptors(node, origin, preview),
    ...buildDerivedLayerDescriptors(node, origin, preview)
  ];
}

function getSelectedDescriptor() {
  return state.lastRenderMap.get(state.selectedToken) ?? null;
}

function getDescriptorAction(descriptor, slot) {
  if (descriptor.sourceType === "layer-item") {
    return DEFAULT_ACTIONS["layer-item"][slot];
  }

  const clicksNodeId = descriptor.node.system?.clicksNodeId;

  if (clicksNodeId) {
    const clicksNode = getNode(clicksNodeId);
    const clicksSpace = clicksNode ? getSpace(clicksNode.spaceId) : null;
    const actionRef = clicksSpace?.refs.find((ref) => {
      const actionNode = getNode(ref.nodeId);
      return actionNode?.role === "action" && actionNode.meta.slot === slot;
    });
    const actionNode = actionRef ? getNode(actionRef.nodeId) : null;
    const actionValue = normalizeText(actionNode?.value);

    if (actionValue) {
      return actionValue;
    }
  }

  return getDefaultAction(descriptor.node, slot);
}

function openDescriptorNode(descriptor) {
  const currentNode = getCurrentNode();

  if (!currentNode || descriptor.sourceType === "layer-item") {
    return;
  }

  state.path.push({
    nodeId: currentNode.id,
    position: clonePoint(state.currentPosition)
  });
  state.currentNodeId = descriptor.node.id;
  state.currentPosition = clonePoint(descriptor.position);
  state.selectedToken = null;
  state.previewToken = null;
  stabilizeGraph();
  render();
  centerViewOn(state.currentPosition);
}

function executeAction(action, descriptor) {
  if (action === "noop") {
    render();
    return;
  }

  if (action === "toggle-layer" && descriptor.layer) {
    descriptor.layer.visible = !descriptor.layer.visible;
    render();
    return;
  }

  if (action === "show-inner-space") {
    state.previewToken = state.previewToken === descriptor.token ? null : descriptor.token;
    render();
    return;
  }

  if (action === "open") {
    openDescriptorNode(descriptor);
    return;
  }

  state.previewToken = null;
  render();
}

function activateDescriptor(descriptor) {
  if (state.selectedToken === descriptor.token) {
    executeAction(getDescriptorAction(descriptor, "click-2"), descriptor);
    return;
  }

  state.selectedToken = descriptor.token;
  const firstAction = getDescriptorAction(descriptor, "click-1");

  if (firstAction === "select") {
    if (!descriptor.preview) {
      state.previewToken = null;
    }

    render();
    return;
  }

  executeAction(firstAction, descriptor);
}

function createGraphNode(node, position, options = {}) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "organism-node";
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  element.classList.toggle("is-parent", Boolean(options.parent));
  element.classList.toggle("is-selected", Boolean(options.selected));
  element.classList.toggle("is-preview", Boolean(options.preview));
  element.classList.toggle("is-editor", Boolean(options.editor));
  element.classList.toggle("is-system", node.role !== "content" && node.role !== "layer-item");
  element.classList.toggle("is-action", node.role === "action");
  element.classList.toggle("is-layer-item", node.role === "layer-item");
  element.classList.toggle("is-string", node.type === "string");
  element.classList.toggle("is-paragraph", node.type === "paragraph");
  element.classList.toggle("is-number", node.type === "number");

  const valueNode = document.createElement("p");
  valueNode.className = "organism-node-value";
  valueNode.textContent = getDisplayValue(node);

  const labelNode = document.createElement("span");
  labelNode.className = "organism-node-label";
  labelNode.textContent = node.name || node.id;

  const metaNode = document.createElement("span");
  metaNode.className = "organism-node-meta";
  metaNode.textContent = getNodeMeta(node);

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
    // Synthetic validation can lack a live pointer.
  }
}

function updateDescriptorPosition(descriptor, x, y) {
  if (descriptor.sourceType === "space-ref") {
    descriptor.actualRef.x = x;
    descriptor.actualRef.y = y;
    return;
  }

  if (descriptor.sourceType === "parent-relation") {
    descriptor.relation.ref.x = x;
    descriptor.relation.ref.y = y;
    return;
  }

  if (descriptor.sourceType === "layer-item" && descriptor.layer) {
    descriptor.layer.x = x;
    descriptor.layer.y = y;
  }
}

function enableDescriptorDragging(nodeElement, descriptor, edge) {
  if (!descriptor.draggable) {
    nodeElement.addEventListener("click", () => {
      activateDescriptor(descriptor);
    });
    return;
  }

  nodeElement.addEventListener("pointerdown", (event) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = descriptor.position.x;
    const initialY = descriptor.position.y;
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

      const nextWorldX = Math.round(initialX + deltaX);
      const nextWorldY = Math.round(initialY + deltaY);
      const relativeX = nextWorldX - state.currentPosition.x;
      const relativeY = nextWorldY - state.currentPosition.y;

      descriptor.position.x = nextWorldX;
      descriptor.position.y = nextWorldY;
      updateDescriptorPosition(descriptor, relativeX, relativeY);
      nodeElement.style.left = `${nextWorldX}px`;
      nodeElement.style.top = `${nextWorldY}px`;

      if (edge) {
        updateEdge(edge, state.currentPosition, descriptor.position);
      }

      if (state.selectedToken !== descriptor.token) {
        state.selectedToken = descriptor.token;
      }
    };

    const stopDragging = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      if (dragged) {
        render();
        return;
      }

      activateDescriptor(descriptor);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function getEditorFields(descriptor) {
  if (!descriptor || descriptor.preview) {
    return null;
  }

  if (descriptor.sourceType === "layer-item") {
    return {
      mode: "layer-item",
      title: descriptor.layer.name,
      subtitle: `capa de ${getNode(descriptor.subjectNodeId)?.name || descriptor.subjectNodeId}`,
      chip: descriptor.layer.id,
      name: descriptor.layer.name,
      x: descriptor.layer.x,
      y: descriptor.layer.y,
      visible: descriptor.layer.visible
    };
  }

  const layerName = descriptor.sourceType === "space-ref"
    ? findLayer(getSpace(descriptor.ownerSpaceId), descriptor.actualRef.layerId)?.name || descriptor.actualRef.layerId
    : null;
  const relationRef = descriptor.sourceType === "parent-relation" ? descriptor.relation.ref : descriptor.actualRef;

  return {
    mode: descriptor.sourceType,
    title: descriptor.node.name,
    subtitle: descriptor.sourceType === "parent-relation"
      ? `padre de ${getNode(descriptor.subjectNodeId)?.name || descriptor.subjectNodeId}`
      : getNodeMeta(descriptor.node),
    chip: descriptor.node.id,
    name: descriptor.node.name,
    x: relationRef.x,
    y: relationRef.y,
    type: descriptor.node.type,
    value: descriptor.node.type === "paragraph" ? "" : String(descriptor.node.value ?? ""),
    paragraph: descriptor.node.type === "paragraph" ? String(descriptor.node.value ?? "") : "",
    layerId: descriptor.sourceType === "space-ref" ? descriptor.actualRef.layerId : null,
    layerName,
    originId: descriptor.node.link?.originId || ""
  };
}

function setEditorValueVisibility(form, type) {
  const textInput = form.querySelector('[name="value"]');
  const textarea = form.querySelector('[name="paragraph"]');

  if (!textInput || !textarea) {
    return;
  }

  const paragraphMode = type === "paragraph";
  textInput.classList.toggle("is-hidden", paragraphMode);
  textarea.classList.toggle("is-hidden", !paragraphMode);
  textInput.type = type === "number" ? "number" : "text";
  textInput.placeholder = type === "number" ? "numero" : "valor";
}

function createEditorNode(descriptor, position) {
  const fields = getEditorFields(descriptor);

  if (!fields) {
    return null;
  }

  const shell = document.createElement("article");
  shell.className = "organism-node is-editor";
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;

  const card = document.createElement("div");
  card.className = "widget-card organism-editor-card";

  const grip = document.createElement("div");
  grip.className = "widget-grip";

  const tag = document.createElement("span");
  tag.className = "widget-tag";
  tag.textContent = "Editor";

  const dots = document.createElement("span");
  dots.className = "widget-dots";
  dots.setAttribute("aria-hidden", "true");

  grip.append(tag, dots);

  const body = document.createElement("div");
  body.className = "organism-editor-body";

  const summary = document.createElement("div");
  summary.className = "organism-editor-summary";

  const title = document.createElement("strong");
  title.textContent = fields.title;

  const subtitle = document.createElement("span");
  subtitle.textContent = fields.subtitle;
  summary.append(title, subtitle);

  const form = document.createElement("form");
  form.className = "organism-editor-form";

  const grid = document.createElement("div");
  grid.className = "organism-editor-grid";

  const nameInput = document.createElement("input");
  nameInput.className = "organism-input";
  nameInput.name = "name";
  nameInput.placeholder = fields.mode === "layer-item" ? "nombre de capa" : "nombre unico";
  nameInput.value = fields.name || "";

  const xInput = document.createElement("input");
  xInput.className = "organism-input";
  xInput.name = "x";
  xInput.type = "number";
  xInput.placeholder = "x";
  xInput.value = String(fields.x ?? 0);

  const yInput = document.createElement("input");
  yInput.className = "organism-input";
  yInput.name = "y";
  yInput.type = "number";
  yInput.placeholder = "y";
  yInput.value = String(fields.y ?? 0);

  grid.append(nameInput, xInput, yInput);
  form.append(grid);

  if (fields.mode !== "layer-item") {
    const typeSelect = document.createElement("select");
    typeSelect.className = "organism-select";
    typeSelect.name = "type";
    [
      { value: "string", label: "string" },
      { value: "paragraph", label: "parrafo" },
      { value: "number", label: "numero" }
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      option.selected = optionData.value === fields.type;
      typeSelect.append(option);
    });

    const valueInput = document.createElement("input");
    valueInput.className = "organism-input";
    valueInput.name = "value";
    valueInput.placeholder = "valor";
    valueInput.value = fields.value;

    const paragraphInput = document.createElement("textarea");
    paragraphInput.className = "organism-textarea";
    paragraphInput.name = "paragraph";
    paragraphInput.placeholder = "parrafo";
    paragraphInput.value = fields.paragraph;

    form.append(typeSelect, valueInput, paragraphInput);

    typeSelect.addEventListener("change", () => {
      setEditorValueVisibility(form, typeSelect.value);
    });
    setEditorValueVisibility(form, fields.type);

    if (fields.mode === "space-ref") {
      const space = getCurrentSpace();
      const layerSelect = document.createElement("select");
      layerSelect.className = "organism-select";
      layerSelect.name = "layer";

      (space?.layers || []).forEach((layer) => {
        const option = document.createElement("option");
        option.value = layer.id;
        option.textContent = `${layer.name}${layer.visible ? "" : " (oculta)"}`;
        option.selected = layer.id === fields.layerId;
        layerSelect.append(option);
      });

      form.append(layerSelect);
    }
  } else {
    const checkLabel = document.createElement("label");
    checkLabel.className = "organism-check";
    const checkInput = document.createElement("input");
    checkInput.type = "checkbox";
    checkInput.name = "visible";
    checkInput.checked = fields.visible;

    const checkText = document.createElement("span");
    checkText.textContent = "visible";
    checkLabel.append(checkInput, checkText);
    form.append(checkLabel);
  }

  const row = document.createElement("div");
  row.className = "organism-editor-row";

  const chip = document.createElement("span");
  chip.className = "organism-chip";
  chip.textContent = fields.chip;

  row.append(chip);

  if (fields.originId) {
    const originChip = document.createElement("span");
    originChip.className = "organism-chip";
    originChip.textContent = `origen ${fields.originId}`;
    row.append(originChip);
  }

  const saveButton = document.createElement("button");
  saveButton.className = "toolbar-button";
  saveButton.type = "submit";
  saveButton.textContent = "guardar";

  const cloneButton = document.createElement("button");
  cloneButton.className = "toolbar-button toolbar-button-muted";
  cloneButton.type = "button";
  cloneButton.textContent = "clonar";
  cloneButton.disabled = fields.mode === "layer-item";

  const deleteButton = document.createElement("button");
  deleteButton.className = "toolbar-button toolbar-button-muted";
  deleteButton.type = "button";
  deleteButton.textContent = "eliminar";

  row.append(saveButton, cloneButton, deleteButton);
  form.append(row);
  body.append(summary, form);
  card.append(grip, body);
  shell.append(card);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSelection(new FormData(form));
  });

  deleteButton.addEventListener("click", () => {
    deleteSelection();
  });

  cloneButton.addEventListener("click", () => {
    cloneSelection();
  });

  return shell;
}

function getEditorAnchor() {
  return {
    x: state.currentPosition.x + 360,
    y: state.currentPosition.y + 12
  };
}

function render() {
  ensureCurrentPosition();
  stabilizeGraph();

  const currentNode = getCurrentNode();

  if (!currentNode) {
    return;
  }

  const currentPosition = state.currentPosition;
  const descriptors = buildDescriptorsForNode(currentNode, currentPosition, false);
  const selectedDescriptor = descriptors.find((descriptor) => descriptor.token === state.selectedToken) || null;
  const previewSource = descriptors.find((descriptor) => descriptor.token === state.previewToken) || null;
  const previewDescriptors = previewSource ? buildDescriptorsForNode(previewSource.node, previewSource.position, true) : [];

  state.lastRenderMap = new Map();
  descriptors.forEach((descriptor) => {
    state.lastRenderMap.set(descriptor.token, descriptor);
  });
  previewDescriptors.forEach((descriptor) => {
    state.lastRenderMap.set(descriptor.token, descriptor);
  });

  viewport.replaceChildren();

  const lineLayer = createLineLayer();
  viewport.append(lineLayer);

  const parentElement = createGraphNode(currentNode, currentPosition, { parent: true });
  parentElement.addEventListener("click", () => {
    state.selectedToken = null;
    state.previewToken = null;
    render();
  });
  viewport.append(parentElement);

  descriptors.forEach((descriptor) => {
    const edge = createEdge(lineLayer, currentPosition, descriptor.position);
    const element = createGraphNode(descriptor.node, descriptor.position, {
      selected: descriptor.token === state.selectedToken,
      preview: false
    });
    enableDescriptorDragging(element, descriptor, edge);
    viewport.append(element);
  });

  if (previewSource) {
    previewDescriptors.forEach((descriptor) => {
      const edge = createEdge(lineLayer, previewSource.position, descriptor.position);
      const element = createGraphNode(descriptor.node, descriptor.position, {
        selected: descriptor.token === state.selectedToken,
        preview: true
      });
      element.addEventListener("click", () => {
        activateDescriptor(descriptor);
      });
      viewport.append(element);
    });
  }

  const editorElement = selectedDescriptor && !selectedDescriptor.preview
    ? createEditorNode(selectedDescriptor, getEditorAnchor())
    : null;

  if (editorElement) {
    viewport.append(editorElement);
  }

  currentValueLabel.textContent = getDisplayValue(currentNode);
  currentMetaLabel.textContent = `${currentNode.name} · ${getNodeMeta(currentNode)}`;
  upButton.disabled = state.path.length === 0;
  newButton.disabled = currentNode.role === "action";
  applyCamera();
}

function saveSpaceRefDescriptor(descriptor, formData) {
  const name = normalizeText(formData.get("name"));

  if (!name) {
    return;
  }

  const type = String(formData.get("type") || descriptor.node.type || "string");
  const rawValue = type === "paragraph" ? formData.get("paragraph") : formData.get("value");
  const value = parseNodeValue(type, rawValue);
  const x = parseOffset(formData.get("x"));
  const y = parseOffset(formData.get("y"));
  const layerId = String(formData.get("layer") || descriptor.actualRef.layerId);
  const space = getSpace(descriptor.ownerSpaceId);
  const existingNode = findNodeByName(name, descriptor.node.id);

  descriptor.actualRef.x = x;
  descriptor.actualRef.y = y;
  descriptor.actualRef.layerId = layerId;

  if (existingNode) {
    const siblingRef = findRefToNode(space, existingNode.id, descriptor.actualRef.id);

    if (siblingRef) {
      siblingRef.x = x;
      siblingRef.y = y;
      siblingRef.layerId = layerId;
      space.refs = space.refs.filter((ref) => ref.id !== descriptor.actualRef.id);
    } else {
      const previousNodeId = descriptor.actualRef.nodeId;
      descriptor.actualRef.nodeId = existingNode.id;
      pruneDetachedNode(previousNodeId);
    }

    state.selectedToken = `ref:${space.id}:${descriptor.actualRef.id}`;
    return;
  }

  descriptor.node.name = name;
  descriptor.node.type = type;
  descriptor.node.value = value;
}

function saveParentRelationDescriptor(descriptor, formData) {
  const name = normalizeText(formData.get("name"));

  if (!name) {
    return;
  }

  const type = String(formData.get("type") || descriptor.node.type || "string");
  const rawValue = type === "paragraph" ? formData.get("paragraph") : formData.get("value");
  const value = parseNodeValue(type, rawValue);
  const x = parseOffset(formData.get("x"));
  const y = parseOffset(formData.get("y"));
  const existingNode = findNodeByName(name, descriptor.node.id);

  if (existingNode) {
    const targetSpace = getSpace(existingNode.spaceId);
    let targetRef = findRefToNode(targetSpace, descriptor.subjectNodeId);

    if (!targetRef) {
      targetRef = addRef(targetSpace.id, descriptor.subjectNodeId, x, y, getDefaultLayer(targetSpace)?.id);
    }

    targetRef.x = x;
    targetRef.y = y;
    descriptor.relation.space.refs = descriptor.relation.space.refs.filter((ref) => ref.id !== descriptor.relation.ref.id);
    pruneDetachedNode(descriptor.node.id);
    state.selectedToken = `parent:${getCurrentNode().id}:${existingNode.id}`;
    return;
  }

  descriptor.node.name = name;
  descriptor.node.type = type;
  descriptor.node.value = value;
  descriptor.relation.ref.x = x;
  descriptor.relation.ref.y = y;
}

function saveLayerDescriptor(descriptor, formData) {
  const name = normalizeText(formData.get("name"));

  if (!name) {
    return;
  }

  descriptor.layer.name = name;
  descriptor.layer.visible = formData.get("visible") === "on";
  descriptor.layer.x = parseOffset(formData.get("x"));
  descriptor.layer.y = parseOffset(formData.get("y"));
}

function saveSelection(formData) {
  const descriptor = getSelectedDescriptor();

  if (!descriptor || descriptor.preview) {
    return;
  }

  if (descriptor.sourceType === "space-ref") {
    saveSpaceRefDescriptor(descriptor, formData);
  } else if (descriptor.sourceType === "parent-relation") {
    saveParentRelationDescriptor(descriptor, formData);
  } else if (descriptor.sourceType === "layer-item") {
    saveLayerDescriptor(descriptor, formData);
  }

  stabilizeGraph();
  render();
}

function deleteSelection() {
  const descriptor = getSelectedDescriptor();

  if (!descriptor || descriptor.preview) {
    return;
  }

  if (descriptor.sourceType === "space-ref") {
    const space = getSpace(descriptor.ownerSpaceId);
    const removedNodeId = descriptor.actualRef.nodeId;
    space.refs = space.refs.filter((ref) => ref.id !== descriptor.actualRef.id);
    pruneDetachedNode(removedNodeId);
  } else if (descriptor.sourceType === "parent-relation") {
    descriptor.relation.space.refs = descriptor.relation.space.refs.filter((ref) => ref.id !== descriptor.relation.ref.id);
    pruneDetachedNode(descriptor.node.id);
  } else if (descriptor.sourceType === "layer-item") {
    const ownerNode = getNode(descriptor.subjectNodeId);
    const ownerSpace = ownerNode ? getSpace(ownerNode.spaceId) : null;

    if (!ownerSpace || ownerSpace.layers.length <= 1) {
      return;
    }

    const fallbackLayer = ownerSpace.layers.find((layer) => layer.id !== descriptor.layer.id);
    ownerSpace.refs.forEach((ref) => {
      if (ref.layerId === descriptor.layer.id) {
        ref.layerId = fallbackLayer.id;
      }
    });
    ownerSpace.layers = ownerSpace.layers.filter((layer) => layer.id !== descriptor.layer.id);
  }

  state.selectedToken = null;
  state.previewToken = null;
  stabilizeGraph();
  render();
}

function cloneSelection() {
  const descriptor = getSelectedDescriptor();
  const currentNode = getCurrentNode();

  if (!descriptor || descriptor.preview || descriptor.sourceType === "layer-item" || !currentNode) {
    return;
  }

  const currentSpace = getCurrentSpace();
  const seedName = createUniqueNodeName(`${descriptor.node.name}-clon`);
  const cloneNode = createNode({
    name: seedName,
    type: descriptor.node.type,
    value: descriptor.node.value,
    link: {
      originId: descriptor.node.id,
      mode: "linked"
    }
  });
  const targetX = descriptor.position.x - state.currentPosition.x + 70;
  const targetY = descriptor.position.y - state.currentPosition.y + 40;
  const ref = addRef(currentSpace.id, cloneNode.id, targetX, targetY, getDefaultLayer(currentSpace)?.id);

  state.selectedToken = `ref:${currentSpace.id}:${ref.id}`;
  stabilizeGraph();
  render();
}

function createNewContentRef() {
  const currentSpace = getCurrentSpace();
  const newNode = createNode({
    name: createUniqueNodeName("nuevo"),
    type: "string",
    value: "nuevo"
  });
  const ref = addRef(currentSpace.id, newNode.id, 180, 0, getDefaultLayer(currentSpace)?.id);

  state.selectedToken = `ref:${currentSpace.id}:${ref.id}`;
  stabilizeGraph();
  render();
}

function createNewParentRelation() {
  const parentsNode = getCurrentNode();
  const subjectNodeId = parentsNode.meta.subjectNodeId;
  const newParent = createNode({
    name: createUniqueNodeName("padre"),
    type: "string",
    value: "padre"
  });
  addRef(newParent.spaceId, subjectNodeId, 140, 0, getDefaultLayer(getSpace(newParent.spaceId))?.id);

  state.selectedToken = `parent:${parentsNode.id}:${newParent.id}`;
  stabilizeGraph();
  render();
}

function createNewLayer() {
  const layersNode = getCurrentNode();
  const subjectNode = getNode(layersNode.meta.subjectNodeId);
  const subjectSpace = subjectNode ? getSpace(subjectNode.spaceId) : null;

  if (!subjectSpace) {
    return;
  }

  const layer = {
    id: generateId("layer"),
    name: uniqueLayerName(subjectSpace, "capa"),
    visible: true,
    x: 140,
    y: 24
  };

  subjectSpace.layers.push(layer);
  state.selectedToken = `layer:${subjectSpace.id}:${layer.id}`;
  stabilizeGraph();
  render();
}

function createNewEntry() {
  const currentNode = getCurrentNode();

  if (!currentNode) {
    return;
  }

  if (currentNode.role === "parents") {
    createNewParentRelation();
    return;
  }

  if (currentNode.role === "layers") {
    createNewLayer();
    return;
  }

  if (currentNode.role !== "action") {
    createNewContentRef();
  }
}

function enableStagePanning() {
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".organism-node")) {
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
        state.selectedToken = null;
        state.previewToken = null;
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

function enableShellDragging(shell) {
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
  state.currentNodeId = graph.rootNodeId;
  state.currentPosition = clonePoint(state.homePosition);
  state.selectedToken = null;
  state.previewToken = null;
  state.path = [];
  render();
  centerViewOn(state.currentPosition, 1);
}

function goUp() {
  if (state.path.length === 0) {
    return;
  }

  const parentState = state.path.pop();
  state.currentNodeId = parentState.nodeId;
  state.currentPosition = clonePoint(parentState.position);
  state.selectedToken = null;
  state.previewToken = null;
  render();
  centerViewOn(state.currentPosition);
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

newButton.addEventListener("click", () => {
  createNewEntry();
});

window.addEventListener("resize", () => {
  if (state.currentNodeId === graph.rootNodeId && state.path.length === 0) {
    const center = getStageCenter();
    state.homePosition = center;
    state.currentPosition = center;
  }

  render();
});

enableStagePanning();
enableShellDragging(navShell);
navShell.style.left = "14px";
navShell.style.top = "14px";
state.currentPosition = getStageCenter();
state.homePosition = clonePoint(state.currentPosition);
stabilizeGraph();
centerViewOn(state.currentPosition, 1);
render();