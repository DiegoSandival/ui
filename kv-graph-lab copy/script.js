const workspace = document.querySelector("#workspace");

function createNode(key, x = 0, y = 0, children = []) {
  return { key, x, y, children };
}

const rootNode = createNode("root", 0, 0, [
  createNode("idea", -220, -80, [
    createNode("nota", -120, 40),
    createNode("boceto", 120, 10)
  ]),
  createNode("sistema", 0, -160, [
    createNode("api", -150, 90),
    createNode("worker", 0, 130),
    createNode("cache", 150, 90)
  ]),
  createNode("ui", 220, -70, [
    createNode("header", -110, 80),
    createNode("panel", 0, 140),
    createNode("canvas", 130, 40)
  ]),
  createNode("datos", -170, 120, [
    createNode("kv", -100, 80, [
      createNode("par", -90, 70),
      createNode("valor", 100, 70)
    ]),
    createNode("indice", 110, 60)
  ]),
  createNode("flujo", 190, 140, [
    createNode("paso1", -120, 70),
    createNode("paso2", 0, 120),
    createNode("paso3", 120, 70)
  ])
]);

const widgets = new Map();
let widgetIdSequence = 0;
let nextWidgetOffset = 0;
let topZIndex = 1000;

function clonePosition(position) {
  return {
    x: position.x,
    y: position.y
  };
}

function cloneNodeTree(node) {
  return createNode(
    node.key,
    node.x,
    node.y,
    node.children.map((child) => cloneNodeTree(child))
  );
}

function normalizeKey(value) {
  return value.trim();
}

function parseOffset(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWidgetElement(widget) {
  const shell = document.createElement("section");
  shell.className = "widget-shell graph-widget-shell";
  shell.setAttribute("aria-label", `Zona ${widget.rootNode.key}`);
  shell.innerHTML = `
    <article class="widget-card list-widget-card graph-widget-card">
      <div class="widget-grip">
        <span class="widget-tag" data-role="title"></span>
        <details class="graph-menu" data-role="menu">
          <summary class="graph-menu-toggle" aria-label="Abrir controles">
            <span class="widget-dots" aria-hidden="true"></span>
          </summary>

          <form class="graph-menu-panel" data-role="editor" autocomplete="off">
            <div class="graph-menu-actions">
              <button class="toolbar-button" type="button" data-command="reset">root</button>
              <button class="toolbar-button" type="button" data-command="up">padre</button>
              <button class="toolbar-button" type="button" data-command="view">vista</button>
              <button class="toolbar-button" type="button" data-command="zone">zona</button>
            </div>

            <div class="graph-menu-fields">
              <input class="graph-input graph-input-key" type="text" name="key" placeholder="key" data-field="key" />
              <input class="graph-input graph-input-number" type="number" name="x" placeholder="x" data-field="x" />
              <input class="graph-input graph-input-number" type="number" name="y" placeholder="y" data-field="y" />
            </div>

            <div class="graph-menu-actions">
              <button class="toolbar-button" type="submit" data-command="save">guardar</button>
              <button class="toolbar-button" type="button" data-command="clone">clonar</button>
              <button class="toolbar-button toolbar-button-muted" type="button" data-command="delete">eliminar</button>
              <button class="toolbar-button toolbar-button-muted" type="button" data-command="close">cerrar</button>
            </div>
          </form>
        </details>
      </div>

      <div class="widget-body list-widget-body graph-widget-body">
        <div class="graph-widget-stage" data-role="stage">
          <div class="graph-viewport" data-role="viewport"></div>
        </div>
      </div>
    </article>
  `;

  workspace.append(shell);

  const refs = {
    shell,
    title: shell.querySelector('[data-role="title"]'),
    menu: shell.querySelector('[data-role="menu"]'),
    resetButton: shell.querySelector('[data-command="reset"]'),
    upButton: shell.querySelector('[data-command="up"]'),
    viewButton: shell.querySelector('[data-command="view"]'),
    zoneButton: shell.querySelector('[data-command="zone"]'),
    cloneButton: shell.querySelector('[data-command="clone"]'),
    closeButton: shell.querySelector('[data-command="close"]'),
    editor: shell.querySelector('[data-role="editor"]'),
    keyInput: shell.querySelector('[data-field="key"]'),
    xInput: shell.querySelector('[data-field="x"]'),
    yInput: shell.querySelector('[data-field="y"]'),
    deleteButton: shell.querySelector('[data-command="delete"]'),
    stage: shell.querySelector('[data-role="stage"]'),
    viewport: shell.querySelector('[data-role="viewport"]')
  };

  widget.refs = refs;
}

function closeWidgetMenu(widget) {
  if (widget.refs.menu) {
    widget.refs.menu.open = false;
  }
}

function placeWidget(widget) {
  const offset = nextWidgetOffset * 28;
  widget.refs.shell.style.left = `${14 + offset}px`;
  widget.refs.shell.style.top = `${14 + offset}px`;
  widget.refs.shell.style.zIndex = String(++topZIndex);
  nextWidgetOffset = (nextWidgetOffset + 1) % 8;
}

function bringWidgetToFront(widget) {
  widget.refs.shell.style.zIndex = String(++topZIndex);
}

function getStageRect(widget) {
  return widget.refs.stage.getBoundingClientRect();
}

function getStageCenterScreen(widget) {
  const rect = getStageRect(widget);

  return {
    x: rect.width / 2,
    y: rect.height / 2
  };
}

function ensurePosition(widget) {
  if (!widget.currentPosition) {
    widget.currentPosition = getStageCenterScreen(widget);
  }

  if (!widget.homePosition) {
    widget.homePosition = clonePosition(widget.currentPosition);
  }
}

function screenToWorld(widget, clientX, clientY) {
  const rect = getStageRect(widget);

  return {
    x: (clientX - rect.left - widget.camera.x) / widget.camera.scale,
    y: (clientY - rect.top - widget.camera.y) / widget.camera.scale
  };
}

function applyCamera(widget) {
  widget.refs.viewport.style.transform = `translate(${widget.camera.x}px, ${widget.camera.y}px) scale(${widget.camera.scale})`;
}

function centerViewOn(widget, position, scale = widget.camera.scale) {
  const center = getStageCenterScreen(widget);
  widget.camera.scale = scale;
  widget.camera.x = center.x - position.x * scale;
  widget.camera.y = center.y - position.y * scale;
  applyCamera(widget);
}

function getCurrentNode(widget) {
  return widget.currentNode;
}

function getChildren(widget) {
  return getCurrentNode(widget).children;
}

function getSelectedChildIndex(widget) {
  return getChildren(widget).findIndex((child) => child.key === widget.selectedChildKey);
}

function getSelectedChildEntry(widget) {
  const childIndex = getSelectedChildIndex(widget);

  if (childIndex === -1) {
    return null;
  }

  return {
    index: childIndex,
    entry: getChildren(widget)[childIndex]
  };
}

function getChildEntryByKey(widget, key) {
  const childIndex = getChildren(widget).findIndex((child) => child.key === key);

  if (childIndex === -1) {
    return null;
  }

  return {
    index: childIndex,
    entry: getChildren(widget)[childIndex]
  };
}

function resetEditorFields(widget) {
  widget.refs.keyInput.value = "";
  widget.refs.xInput.value = "140";
  widget.refs.yInput.value = "0";
}

function resetEditorSelection(widget) {
  widget.selectedChildKey = null;
  resetEditorFields(widget);
}

function getZoneTarget(widget) {
  return getSelectedChildEntry(widget)?.entry ?? getCurrentNode(widget);
}

function syncEditor(widget) {
  const selectedChild = getSelectedChildEntry(widget);

  widget.refs.title.textContent = widget.rootNode.key;
  widget.refs.upButton.disabled = widget.path.length === 0;
  widget.refs.closeButton.disabled = widget.rootNode === rootNode;
  widget.refs.closeButton.hidden = widget.rootNode === rootNode;
  widget.refs.zoneButton.disabled = false;

  if (!selectedChild) {
    widget.refs.deleteButton.disabled = true;

    if (
      document.activeElement !== widget.refs.keyInput &&
      document.activeElement !== widget.refs.xInput &&
      document.activeElement !== widget.refs.yInput
    ) {
      resetEditorFields(widget);
    }

    return;
  }

  widget.refs.deleteButton.disabled = false;
  widget.refs.keyInput.value = selectedChild.entry.key;
  widget.refs.xInput.value = String(selectedChild.entry.x);
  widget.refs.yInput.value = String(selectedChild.entry.y);
}

function saveChild(widget) {
  const key = normalizeKey(widget.refs.keyInput.value);

  if (!key) {
    return;
  }

  const x = parseOffset(widget.refs.xInput.value);
  const y = parseOffset(widget.refs.yInput.value);
  const existingChild = getChildEntryByKey(widget, key);

  if (!existingChild) {
    getChildren(widget).push(createNode(key, x, y));

    resetEditorSelection(widget);
    renderWidget(widget);
    closeWidgetMenu(widget);
    return;
  }

  existingChild.entry.x = x;
  existingChild.entry.y = y;
  widget.selectedChildKey = key;
  renderWidget(widget);
  closeWidgetMenu(widget);
}

function isNodeInSubtree(root, target) {
  if (root === target) {
    return true;
  }

  return root.children.some((child) => isNodeInSubtree(child, target));
}

function closeWidgetsForNode(node) {
  widgets.forEach((widget) => {
    if (!isNodeInSubtree(node, widget.rootNode)) {
      return;
    }

    widgets.delete(widget.id);
    widget.refs.shell.remove();
  });
}

function cloneIntoCurrent(widget) {
  const sourceNode = getZoneTarget(widget);
  const key = normalizeKey(widget.refs.keyInput.value);

  if (!key) {
    return;
  }

  const existingChild = getChildEntryByKey(widget, key);

  if (existingChild) {
    widget.selectedChildKey = key;
    renderWidget(widget);
    closeWidgetMenu(widget);
    return;
  }

  const clone = cloneNodeTree(sourceNode);
  clone.key = key;
  clone.x = parseOffset(widget.refs.xInput.value);
  clone.y = parseOffset(widget.refs.yInput.value);
  getChildren(widget).push(clone);
  widget.selectedChildKey = key;
  renderWidget(widget);
  closeWidgetMenu(widget);
}

function openNodeInZone(widget) {
  createWidget(getZoneTarget(widget));
  closeWidgetMenu(widget);
}

function deleteSelectedChild(widget) {
  const selectedChild = getSelectedChildEntry(widget);

  if (!selectedChild) {
    return;
  }

  const { key } = selectedChild.entry;
  getChildren(widget).splice(selectedChild.index, 1);

  closeWidgetsForNode(selectedChild.entry);

  widget.selectedChildKey = null;
  renderWidget(widget);
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

function createNodeButton({ key, x, y, parent = false, selected = false }) {
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
  return button;
}

function trySetPointerCapture(target, pointerId) {
  if (typeof target.setPointerCapture !== "function") {
    return;
  }

  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Synthetic events may not have an active pointer.
  }
}

function openChild(widget, child) {
  ensurePosition(widget);
  widget.path.push({
    node: widget.currentNode,
    position: clonePosition(widget.currentPosition)
  });
  widget.currentNode = child.entry;
  widget.currentPosition = { x: child.x, y: child.y };
  widget.selectedChildKey = null;
  renderWidget(widget);
  centerViewOn(widget, widget.currentPosition);
}

function openRoot(widget) {
  ensurePosition(widget);
  widget.currentNode = widget.rootNode;
  widget.currentPosition = clonePosition(widget.homePosition);
  widget.selectedChildKey = null;
  widget.path = [];
  renderWidget(widget);
  centerViewOn(widget, widget.currentPosition, 1);
}

function goUp(widget) {
  if (widget.path.length === 0) {
    return;
  }

  const parent = widget.path.pop();
  widget.currentNode = parent.node;
  widget.currentPosition = clonePosition(parent.position);
  widget.selectedChildKey = null;
  renderWidget(widget);
  centerViewOn(widget, widget.currentPosition);
}

function selectOrOpenChild(widget, child) {
  if (widget.selectedChildKey === child.key) {
    openChild(widget, child);
    return;
  }

  widget.selectedChildKey = child.key;
  renderWidget(widget);
}

function enableChildPointerInteraction(widget, node, child, edge) {
  node.addEventListener("pointerdown", (event) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const initialDx = child.entry.x;
    const initialDy = child.entry.y;
    let dragged = false;

    trySetPointerCapture(node, event.pointerId);
    bringWidgetToFront(widget);

    const onPointerMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / widget.camera.scale;
      const deltaY = (moveEvent.clientY - startY) / widget.camera.scale;

      if (!dragged && Math.hypot(deltaX, deltaY) > 4) {
        dragged = true;
      }

      if (!dragged) {
        return;
      }

      const nextDx = Math.round(initialDx + deltaX);
      const nextDy = Math.round(initialDy + deltaY);

      child.entry.x = nextDx;
      child.entry.y = nextDy;
      child.x = widget.currentPosition.x + nextDx;
      child.y = widget.currentPosition.y + nextDy;
      node.style.left = `${child.x}px`;
      node.style.top = `${child.y}px`;
      updateEdge(edge, widget.currentPosition, child);

      if (widget.selectedChildKey !== child.key) {
        widget.selectedChildKey = child.key;
      }

      widget.refs.keyInput.value = child.key;
      widget.refs.xInput.value = String(nextDx);
      widget.refs.yInput.value = String(nextDy);
      widget.refs.deleteButton.disabled = false;
    };

    const stopDragging = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      if (dragged) {
        widget.selectedChildKey = child.key;
        renderWidget(widget);
        return;
      }

      selectOrOpenChild(widget, child);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function renderWidget(widget) {
  ensurePosition(widget);

  const parentPosition = widget.currentPosition;
  const children = getChildren(widget).map((entry) => ({
    entry,
    key: entry.key,
    x: parentPosition.x + entry.x,
    y: parentPosition.y + entry.y
  }));

  widget.refs.viewport.replaceChildren();

  const lineLayer = createLineLayer();
  widget.refs.viewport.append(lineLayer);

  const parentNode = createNodeButton({
    key: getCurrentNode(widget).key,
    x: parentPosition.x,
    y: parentPosition.y,
    parent: true
  });
  parentNode.addEventListener("click", () => {
    widget.selectedChildKey = null;
    renderWidget(widget);
  });
  widget.refs.viewport.append(parentNode);

  children.forEach((child) => {
    const edge = createEdge(lineLayer, parentPosition, child);
    const childNode = createNodeButton({
      key: child.key,
      x: child.x,
      y: child.y,
      selected: widget.selectedChildKey === child.key
    });

    enableChildPointerInteraction(widget, childNode, child, edge);
    widget.refs.viewport.append(childNode);
  });

  syncEditor(widget);
  applyCamera(widget);
}

function enableWidgetDragging(widget) {
  const handle = widget.refs.shell.querySelector(".widget-grip");

  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".graph-menu")) {
      return;
    }

    const shellRect = widget.refs.shell.getBoundingClientRect();
    const offsetX = event.clientX - shellRect.left;
    const offsetY = event.clientY - shellRect.top;

    widget.refs.shell.classList.add("dragging");
    trySetPointerCapture(handle, event.pointerId);
    bringWidgetToFront(widget);

    const onMove = (moveEvent) => {
      const maxX = Math.max(0, window.innerWidth - widget.refs.shell.offsetWidth - 14);
      const maxY = Math.max(0, window.innerHeight - widget.refs.shell.offsetHeight - 14);
      const nextX = Math.min(Math.max(moveEvent.clientX - offsetX, 14), maxX);
      const nextY = Math.min(Math.max(moveEvent.clientY - offsetY, 14), maxY);

      widget.refs.shell.style.left = `${nextX}px`;
      widget.refs.shell.style.top = `${nextY}px`;
    };

    const stopDragging = () => {
      widget.refs.shell.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function enableStagePanning(widget) {
  const { stage, viewport } = widget.refs;

  stage.addEventListener("pointerdown", (event) => {
    const target = event.target;

    if (target.closest(".graph-node")) {
      return;
    }

    const startCameraX = widget.camera.x;
    const startCameraY = widget.camera.y;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;

    trySetPointerCapture(stage, event.pointerId);
    bringWidgetToFront(widget);

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

      widget.camera.x = startCameraX + deltaX;
      widget.camera.y = startCameraY + deltaY;
      applyCamera(widget);
    };

    const stopPanning = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopPanning);
      window.removeEventListener("pointercancel", stopPanning);
      stage.classList.remove("is-panning");

      if (!moved) {
        widget.selectedChildKey = null;
        renderWidget(widget);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopPanning, { once: true });
    window.addEventListener("pointercancel", stopPanning, { once: true });
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();

    const pointer = screenToWorld(widget, event.clientX, event.clientY);
    const nextScale = Math.min(Math.max(widget.camera.scale * (event.deltaY < 0 ? 1.1 : 0.9), 0.35), 2.8);

    widget.camera.x = event.clientX - getStageRect(widget).left - pointer.x * nextScale;
    widget.camera.y = event.clientY - getStageRect(widget).top - pointer.y * nextScale;
    widget.camera.scale = nextScale;
    applyCamera(widget);
  }, { passive: false });

  viewport.addEventListener("pointerdown", () => {
    bringWidgetToFront(widget);
  });
}

function attachWidgetEvents(widget) {
  widget.refs.shell.addEventListener("pointerdown", () => {
    bringWidgetToFront(widget);
  });

  widget.refs.resetButton.addEventListener("click", () => {
    openRoot(widget);
    closeWidgetMenu(widget);
  });

  widget.refs.upButton.addEventListener("click", () => {
    goUp(widget);
    closeWidgetMenu(widget);
  });

  widget.refs.viewButton.addEventListener("click", () => {
    ensurePosition(widget);
    centerViewOn(widget, widget.currentPosition, 1);
    closeWidgetMenu(widget);
  });

  widget.refs.zoneButton.addEventListener("click", () => {
    openNodeInZone(widget);
  });

  widget.refs.editor.addEventListener("submit", (event) => {
    event.preventDefault();
    saveChild(widget);
  });

  widget.refs.cloneButton.addEventListener("click", () => {
    cloneIntoCurrent(widget);
  });

  widget.refs.deleteButton.addEventListener("click", () => {
    deleteSelectedChild(widget);
    closeWidgetMenu(widget);
  });

  widget.refs.closeButton.addEventListener("click", () => {
    if (widget.rootNode === rootNode) {
      return;
    }

    widgets.delete(widget.id);
    widget.refs.shell.remove();
  });

  enableWidgetDragging(widget);
  enableStagePanning(widget);
}

function createWidget(rootKey) {
  const widget = {
    id: `widget-${++widgetIdSequence}`,
    rootNode: rootKey,
    currentNode: rootKey,
    currentPosition: null,
    homePosition: null,
    selectedChildKey: null,
    path: [],
    camera: {
      x: 0,
      y: 0,
      scale: 1
    },
    refs: null
  };

  buildWidgetElement(widget);
  placeWidget(widget);
  attachWidgetEvents(widget);
  ensurePosition(widget);
  widget.homePosition = clonePosition(widget.currentPosition);
  centerViewOn(widget, widget.currentPosition, 1);
  renderWidget(widget);
  widgets.set(widget.id, widget);
  return widget;
}

window.addEventListener("resize", () => {
  widgets.forEach((widget) => {
    if (widget.path.length === 0) {
      const center = getStageCenterScreen(widget);
      widget.homePosition = center;
      widget.currentPosition = center;
    }

    renderWidget(widget);
  });
});

createWidget(rootNode);