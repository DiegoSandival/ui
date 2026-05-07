const stage = document.querySelector("#stage");
const toolbar = document.querySelector(".toolbar");
const toastStack = document.querySelector("#toast-stack");

const sampleData = {
  key: "scene",
  value: "",
  open: true,
  nodes: [
    {
      key: "title",
      value: "Biblioteca",
      open: true,
      nodes: []
    },
    {
      key: "open",
      value: "go:library",
      open: true,
      nodes: []
    },
    {
      key: "focus",
      value: "is:ready",
      open: true,
      nodes: []
    },
    {
      key: "items",
      value: "",
      open: true,
      nodes: [
        {
          key: "",
          value: "button",
          open: true,
          nodes: []
        },
        {
          key: "",
          value: "toggle",
          open: true,
          nodes: []
        },
        {
          key: "",
          value: "input",
          open: true,
          nodes: []
        }
      ]
    }
  ]
};

const appState = {
  nextId: 1,
  root: null,
  selectedId: null,
  widgets: {},
  highestLayer: 20
};

function createNode(tagName, className, textContent) {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  if (typeof textContent === "string") {
    node.textContent = textContent;
  }

  return node;
}

function showToast(message) {
  const toast = createNode("div", "toast", message);
  toastStack.append(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function nextNodeId() {
  const id = `brick-${appState.nextId}`;
  appState.nextId += 1;
  return id;
}

function createBrick(partial = {}) {
  return {
    id: partial.id || nextNodeId(),
    key: typeof partial.key === "string" ? partial.key : "",
    value: partial.value == null ? "" : String(partial.value),
    open: partial.open !== false,
    nodes: Array.isArray(partial.nodes) ? partial.nodes : []
  };
}

function normalizeBrick(raw, fallbackKey = "") {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawNodes = Array.isArray(source.nodes)
    ? source.nodes
    : Array.isArray(source.children)
      ? source.children
      : [];

  return createBrick({
    id: typeof source.id === "string" && source.id ? source.id : nextNodeId(),
    key: typeof source.key === "string" ? source.key : fallbackKey,
    value: source.value == null ? "" : String(source.value),
    open: source.open !== false,
    nodes: rawNodes.map((child) => normalizeBrick(child))
  });
}

function looksLikeBrick(raw) {
  return Boolean(raw) && typeof raw === "object" && ("nodes" in raw || "key" in raw || "value" in raw);
}

function plainToBrick(value, fallbackKey = "") {
  if (Array.isArray(value)) {
    return createBrick({
      key: fallbackKey,
      value: "",
      nodes: value.map((child) => plainToBrick(child, ""))
    });
  }

  if (value && typeof value === "object") {
    return createBrick({
      key: fallbackKey,
      value: "",
      nodes: Object.entries(value).map(([childKey, childValue]) => plainToBrick(childValue, childKey))
    });
  }

  return createBrick({
    key: fallbackKey,
    value: value == null ? "" : String(value),
    nodes: []
  });
}

function serializeBrick(node) {
  return {
    id: node.id,
    key: node.key,
    value: node.value,
    open: node.open,
    nodes: node.nodes.map((child) => serializeBrick(child))
  };
}

function cloneBrick(node) {
  return createBrick({
    key: node.key,
    value: node.value,
    open: node.open,
    nodes: node.nodes.map((child) => cloneBrick(child))
  });
}

function getPathSegment(node, index) {
  return node.key || `[${index}]`;
}

function findNodeInfo(targetId, currentNode = appState.root, parent = null, index = -1, path = []) {
  if (!currentNode) {
    return null;
  }

  if (currentNode.id === targetId) {
    return { node: currentNode, parent, index, path };
  }

  for (let childIndex = 0; childIndex < currentNode.nodes.length; childIndex += 1) {
    const child = currentNode.nodes[childIndex];
    const result = findNodeInfo(targetId, child, currentNode, childIndex, [...path, getPathSegment(child, childIndex)]);

    if (result) {
      return result;
    }
  }

  return null;
}

function getSelectedInfo() {
  return findNodeInfo(appState.selectedId);
}

function getSelectedPathLabel() {
  const info = getSelectedInfo();
  return info && info.path.length ? info.path.join(" / ") : appState.root?.key || "root";
}

function countNodes(node) {
  return 1 + node.nodes.reduce((total, child) => total + countNodes(child), 0);
}

function getNodeSummary(node) {
  if (node.nodes.length) {
    return `${node.nodes.length} nodes`;
  }

  return node.value || "empty";
}

function getValueKind(value) {
  if (value.startsWith("do:")) {
    return "do";
  }

  if (value.startsWith("go:")) {
    return "go";
  }

  if (value.startsWith("is:")) {
    return "is";
  }

  return "value";
}

function suggestChildKey(parentNode) {
  if (!parentNode.nodes.some((child) => child.key)) {
    return "";
  }

  let suffix = parentNode.nodes.length + 1;
  while (parentNode.nodes.some((child) => child.key === `node${suffix}`)) {
    suffix += 1;
  }

  return `node${suffix}`;
}

function selectNode(nodeId) {
  appState.selectedId = nodeId;
  renderAll();
}

function addChild(parentId) {
  const info = findNodeInfo(parentId);

  if (!info) {
    return;
  }

  const child = createBrick({
    key: suggestChildKey(info.node),
    value: "",
    open: true,
    nodes: []
  });
  info.node.nodes.push(child);
  info.node.open = true;
  appState.selectedId = child.id;
  renderAll();
}

function duplicateNode(nodeId) {
  const info = findNodeInfo(nodeId);

  if (!info || !info.parent) {
    return;
  }

  const clone = cloneBrick(info.node);
  if (clone.key) {
    clone.key = `${clone.key}_copy`;
  }
  info.parent.nodes.splice(info.index + 1, 0, clone);
  appState.selectedId = clone.id;
  renderAll();
}

function deleteNode(nodeId) {
  const info = findNodeInfo(nodeId);

  if (!info || !info.parent) {
    return;
  }

  info.parent.nodes.splice(info.index, 1);
  appState.selectedId = info.parent.id;
  renderAll();
}

function toggleNode(nodeId) {
  const info = findNodeInfo(nodeId);

  if (!info || !info.node.nodes.length) {
    return;
  }

  info.node.open = !info.node.open;
  renderAll();
}

function setAllExpanded(node, expanded) {
  node.open = expanded;
  node.nodes.forEach((child) => setAllExpanded(child, expanded));
}

function isolateControl(control, nodeId) {
  control.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    appState.selectedId = nodeId;
  });

  control.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

function enableDragging(shell) {
  const handle = shell.querySelector(".widget-grip");

  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    const stageRect = stage.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const offsetX = event.clientX - shellRect.left;
    const offsetY = event.clientY - shellRect.top;

    shell.classList.add("dragging");
    shell.style.zIndex = String(++appState.highestLayer);
    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const nextX = clamp(moveEvent.clientX - stageRect.left - offsetX, 0, stageRect.width - shell.offsetWidth);
      const nextY = clamp(moveEvent.clientY - stageRect.top - offsetY, 0, stageRect.height - shell.offsetHeight);
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

function buildShell(kind, position) {
  const shell = createNode("section", `widget-shell json-live-shell ${kind}-shell`);
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++appState.highestLayer);

  const card = createNode("article", "widget-card json-live-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", kind === "tree" ? "Brick Tree" : "Brick Mirror"));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "json-live-body");

  card.append(grip, body);
  shell.append(card);
  shell._refs = { body };
  enableDragging(shell);
  stage.append(shell);
  return shell;
}

function buildNodeRow(node, depth, parentNode) {
  const block = createNode("div", "json-row-block");
  const row = createNode("div", "json-row");

  if (node.id === appState.selectedId) {
    row.classList.add("is-selected");
  }

  row.style.marginLeft = `${depth * 18}px`;

  const toggle = createNode("button", "json-toggle", node.nodes.length ? (node.open ? "−" : "+") : "•");
  toggle.type = "button";
  toggle.disabled = !node.nodes.length;
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNode(node.id);
  });
  row.append(toggle);

  const main = createNode("div", "json-node-main");
  const keyInput = createNode("input", "json-key-input");
  keyInput.value = node.key;
  keyInput.placeholder = parentNode ? "key" : "root";
  isolateControl(keyInput, node.id);
  keyInput.addEventListener("input", () => {
    node.key = keyInput.value;
    renderMirror();
  });
  main.append(keyInput);

  if (parentNode && !node.key) {
    main.append(createNode("span", "json-index-chip", "item"));
  }
  row.append(main);

  const valueArea = createNode("div", "json-value-area");
  const valueInput = createNode("input", "json-value-input");
  valueInput.value = node.value;
  valueInput.placeholder = node.nodes.length ? "value / intent" : "value";
  isolateControl(valueInput, node.id);
  valueInput.addEventListener("input", () => {
    node.value = valueInput.value;
    renderMirror();
  });
  valueArea.append(valueInput);

  const kind = getValueKind(node.value);
  if (kind !== "value") {
    valueArea.append(createNode("span", `json-action-chip is-${kind}`, kind));
  }

  if (node.nodes.length) {
    valueArea.append(createNode("span", "json-summary-chip", getNodeSummary(node)));
  }
  row.append(valueArea);

  const tools = createNode("div", "json-row-tools");
  const addButton = createNode("button", "json-tool-button", "+");
  addButton.type = "button";
  addButton.title = "Crear hijo";
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    addChild(node.id);
  });
  tools.append(addButton);

  const duplicateButton = createNode("button", "json-tool-button", "⧉");
  duplicateButton.type = "button";
  duplicateButton.title = "Duplicar nodo";
  duplicateButton.addEventListener("click", (event) => {
    event.stopPropagation();
    duplicateNode(node.id);
  });
  tools.append(duplicateButton);

  if (parentNode) {
    const deleteButton = createNode("button", "json-tool-button", "×");
    deleteButton.type = "button";
    deleteButton.title = "Eliminar nodo";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteNode(node.id);
    });
    tools.append(deleteButton);
  }

  row.append(tools);
  row.addEventListener("click", () => selectNode(node.id));
  block.append(row);

  if (node.open && node.nodes.length) {
    const childrenWrap = createNode("div", "json-children");
    node.nodes.forEach((child) => {
      childrenWrap.append(buildNodeRow(child, depth + 1, node));
    });
    block.append(childrenWrap);
  }

  return block;
}

function renderTree() {
  const shell = appState.widgets.tree;
  const body = shell._refs.body;
  body.replaceChildren();

  const header = createNode("div", "list-widget-nav");
  const headerWrap = createNode("div", "list-widget-heading");
  headerWrap.append(
    createNode("p", "metric-label", "ladrillo"),
    createNode("p", "list-widget-path", appState.root.key || "root"),
    createNode("p", "json-live-status", `selected: ${getSelectedPathLabel()} / total: ${countNodes(appState.root)} nodes`)
  );
  header.append(headerWrap);

  const meta = createNode("div", "json-root-meta");
  meta.append(
    createNode("span", "json-summary-chip", "one brick model"),
    createNode("span", "json-summary-chip", getNodeSummary(appState.root))
  );

  const scroll = createNode("div", "json-scroll");
  const tree = createNode("div", "json-tree");
  tree.append(buildNodeRow(appState.root, 0, null));
  scroll.append(tree);

  body.append(header, meta, scroll);
}

function renderMirror() {
  const shell = appState.widgets.mirror;
  const body = shell._refs.body;
  body.replaceChildren();

  const jsonString = JSON.stringify(serializeBrick(appState.root), null, 2);
  const header = createNode("div", "list-widget-nav");
  const wrap = createNode("div", "list-widget-heading");
  wrap.append(
    createNode("p", "metric-label", "espejo"),
    createNode("p", "list-widget-path", "Brick JSON"),
    createNode("p", "json-live-status", "Puedes pegar nodos del mismo modelo o JSON plano; ambos se normalizan al ladrillo unico.")
  );
  header.append(wrap);

  const actions = createNode("div", "json-mirror-actions");
  const refreshButton = createNode("button", "json-mirror-button", "Refrescar");
  refreshButton.type = "button";
  const applyButton = createNode("button", "json-mirror-button", "Aplicar espejo");
  applyButton.type = "button";
  actions.append(refreshButton, applyButton);

  const textarea = createNode("textarea", "json-mirror-textarea");
  textarea.value = jsonString;

  refreshButton.addEventListener("click", () => {
    textarea.value = JSON.stringify(serializeBrick(appState.root), null, 2);
  });

  applyButton.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(textarea.value);
      appState.root = looksLikeBrick(parsed)
        ? normalizeBrick(parsed, appState.root?.key || "root")
        : plainToBrick(parsed, appState.root?.key || "root");
      appState.selectedId = appState.root.id;
      renderAll();
      showToast("Mirror aplicado al brick tree");
    } catch (error) {
      showToast(error.message || "JSON invalido");
    }
  });

  body.append(header, actions, textarea);
}

function renderAll() {
  renderTree();
  renderMirror();
}

function buildWidgets() {
  appState.widgets.tree = buildShell("tree", { x: 28, y: 108 });
  appState.widgets.mirror = buildShell("mirror", { x: 592, y: 128 });
}

function resetSample() {
  appState.root = normalizeBrick(sampleData, "scene");
  appState.selectedId = appState.root.id;
  renderAll();
  showToast("Brick sample restaurado");
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toolbar-action]");

  if (!button) {
    return;
  }

  if (button.dataset.toolbarAction === "reset") {
    resetSample();
    return;
  }

  if (button.dataset.toolbarAction === "expand") {
    setAllExpanded(appState.root, true);
    renderAll();
    return;
  }

  if (button.dataset.toolbarAction === "collapse") {
    setAllExpanded(appState.root, false);
    appState.root.open = true;
    renderAll();
  }
});

buildWidgets();
resetSample();