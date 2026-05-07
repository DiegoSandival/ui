const STORAGE_KEY = "list-widget-editor-lab";

const stage = document.querySelector("#stage");
const toolbar = document.querySelector(".toolbar");
const editorDock = document.querySelector(".editor-dock");
const fileInput = document.querySelector("#json-file-input");
const toastStack = document.querySelector("#toast-stack");

const editorPathNode = document.querySelector("#editor-path");
const statusNode = document.querySelector("#editor-status");
const structureListNode = document.querySelector("#structure-list");
const currentLevelTitleInput = document.querySelector("#current-level-title");
const backLevelButton = document.querySelector("#back-level-button");

const selectionSummary = document.querySelector("#selection-summary");
const nodeLabelInput = document.querySelector("#node-label-input");
const nodeHintInput = document.querySelector("#node-hint-input");
const nodeActionInput = document.querySelector("#node-action-input");
const nodeVariantInput = document.querySelector("#node-variant-input");

const nodeHintField = document.querySelector("#node-hint-field");
const nodeActionField = document.querySelector("#node-action-field");
const nodeVariantField = document.querySelector("#node-variant-field");

const enterChildrenButton = document.querySelector("#enter-children-button");
const duplicateNodeButton = document.querySelector("#duplicate-node-button");
const moveUpButton = document.querySelector("#move-up-button");
const moveDownButton = document.querySelector("#move-down-button");
const deleteNodeButton = document.querySelector("#delete-node-button");

const jsonTextarea = document.querySelector("#json-textarea");
const refreshJsonButton = document.querySelector("#refresh-json-button");
const importJsonButton = document.querySelector("#import-json-button");

const defaultDefinition = {
  title: "Lista editable",
  items: [
    { type: "element", variant: "title", label: "Inicio" },
    { type: "button", label: "Dashboard", hint: "Accion base", action: "open-home" },
    {
      type: "button",
      label: "Biblioteca",
      hint: "Sublista editable",
      children: [
        { type: "element", variant: "title", label: "Coleccion" },
        { type: "button", label: "Controles", hint: "Abre una accion", action: "show-controls" },
        { type: "element", variant: "separator" },
        { type: "element", variant: "text", label: "Desde el editor puedes crear mas niveles sin escribir codigo." }
      ]
    }
  ]
};

const appState = {
  definition: null,
  nextId: 1,
  editorPath: [],
  previewPath: [],
  selectedId: null,
  previewShell: null,
  highestLayer: 40
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

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
  window.setTimeout(() => toast.remove(), 2300);
}

function normalizeDefinition(rawDefinition) {
  if (!rawDefinition || typeof rawDefinition !== "object") {
    throw new Error("El JSON debe describir un objeto raiz.");
  }

  let highestId = 0;

  const assignId = (candidate) => {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      highestId = Math.max(highestId, candidate);
      return candidate;
    }

    highestId += 1;
    return highestId;
  };

  const normalizeItem = (item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Cada item debe ser un objeto.");
    }

    if (item.type !== "button" && item.type !== "element") {
      throw new Error("Cada item debe tener type button o element.");
    }

    if (item.type === "button") {
      return {
        id: assignId(item.id),
        type: "button",
        label: typeof item.label === "string" && item.label.trim() ? item.label : "Nuevo button",
        hint: typeof item.hint === "string" ? item.hint : "",
        action: typeof item.action === "string" ? item.action : "",
        children: Array.isArray(item.children) ? item.children.map(normalizeItem) : []
      };
    }

    const variant = item.variant === "separator" || item.variant === "text" ? item.variant : "title";

    return {
      id: assignId(item.id),
      type: "element",
      variant,
      label: variant === "separator" ? "" : typeof item.label === "string" ? item.label : "Nuevo element"
    };
  };

  const definition = {
    title: typeof rawDefinition.title === "string" && rawDefinition.title.trim() ? rawDefinition.title : "Lista editable",
    items: Array.isArray(rawDefinition.items) ? rawDefinition.items.map(normalizeItem) : []
  };

  return {
    definition,
    nextId: highestId + 1
  };
}

function exportDefinition(definition) {
  const exportItem = (item) => {
    if (item.type === "button") {
      const exported = {
        id: item.id,
        type: item.type,
        label: item.label
      };

      if (item.hint) {
        exported.hint = item.hint;
      }

      if (item.action) {
        exported.action = item.action;
      }

      if (item.children?.length) {
        exported.children = item.children.map(exportItem);
      }

      return exported;
    }

    const exported = {
      id: item.id,
      type: item.type,
      variant: item.variant
    };

    if (item.variant !== "separator") {
      exported.label = item.label;
    }

    return exported;
  };

  return {
    title: definition.title,
    items: definition.items.map(exportItem)
  };
}

function createButtonItem() {
  return {
    id: appState.nextId++,
    type: "button",
    label: "Nuevo button",
    hint: "",
    action: "",
    children: []
  };
}

function createElementItem(variant) {
  return {
    id: appState.nextId++,
    type: "element",
    variant,
    label: variant === "separator" ? "" : variant === "title" ? "Nuevo title" : "Nuevo text"
  };
}

function cloneItemWithFreshIds(item) {
  if (item.type === "button") {
    return {
      id: appState.nextId++,
      type: "button",
      label: item.label,
      hint: item.hint,
      action: item.action,
      children: item.children.map(cloneItemWithFreshIds)
    };
  }

  return {
    id: appState.nextId++,
    type: "element",
    variant: item.variant,
    label: item.label
  };
}

function getListContext(path) {
  let items = appState.definition.items;
  let title = appState.definition.title;
  let parentButton = null;

  for (const itemId of path) {
    const nextButton = items.find((item) => item.id === itemId && item.type === "button");

    if (!nextButton) {
      return null;
    }

    if (!Array.isArray(nextButton.children)) {
      nextButton.children = [];
    }

    parentButton = nextButton;
    items = nextButton.children;
    title = nextButton.label || "Sublista";
  }

  return { items, title, parentButton };
}

function getCurrentEditorContext() {
  return getListContext(appState.editorPath);
}

function getCurrentPreviewContext() {
  return getListContext(appState.previewPath);
}

function getCurrentSelectedItem() {
  const context = getCurrentEditorContext();

  if (!context || appState.selectedId === null) {
    return null;
  }

  return context.items.find((item) => item.id === appState.selectedId) ?? null;
}

function setDefinition(rawDefinition, notice) {
  const normalized = normalizeDefinition(rawDefinition);
  appState.definition = normalized.definition;
  appState.nextId = normalized.nextId;
  appState.editorPath = [];
  appState.previewPath = [];
  appState.selectedId = appState.definition.items[0]?.id ?? null;

  renderAll();

  if (notice) {
    showToast(notice);
  }
}

function syncJsonTextarea() {
  jsonTextarea.value = JSON.stringify(exportDefinition(appState.definition), null, 2);
}

function ensureSelectionIsValid() {
  const context = getCurrentEditorContext();

  if (!context) {
    appState.editorPath = [];
    appState.selectedId = null;
    return;
  }

  const stillExists = context.items.some((item) => item.id === appState.selectedId);

  if (!stillExists) {
    appState.selectedId = context.items[0]?.id ?? null;
  }
}

function ensurePreviewPathIsValid() {
  const validPath = [];
  let items = appState.definition.items;

  for (const itemId of appState.previewPath) {
    const nextButton = items.find((item) => item.id === itemId && item.type === "button" && item.children?.length);

    if (!nextButton) {
      break;
    }

    validPath.push(itemId);
    items = nextButton.children;
  }

  appState.previewPath = validPath;
}

function executeAction(actionName) {
  const actionMap = {
    "open-home": "Accion ejecutada: open-home",
    "show-controls": "Accion ejecutada: show-controls",
    "show-media": "Accion ejecutada: show-media",
    "run-sync": "Accion ejecutada: run-sync",
    "spawn-widget": "Accion ejecutada: spawn-widget",
    "show-toast": "Accion ejecutada: show-toast"
  };

  showToast(actionMap[actionName] ?? `Accion no registrada: ${actionName}`);
}

function createElementRow(item) {
  if (item.variant === "separator") {
    return createNode("div", "list-element list-element-separator");
  }

  if (item.variant === "title") {
    return createNode("div", "list-element list-element-title", item.label);
  }

  return createNode("div", "list-element list-element-text", item.label);
}

function renderPreviewItems(context, itemsNode, pathNode, backNode) {
  itemsNode.replaceChildren();
  pathNode.textContent = context.title;
  backNode.hidden = appState.previewPath.length === 0;

  for (const item of context.items) {
    if (item.type === "element") {
      itemsNode.append(createElementRow(item));
      continue;
    }

    const button = createNode("button", "list-entry");
    button.type = "button";

    const main = createNode("span", "list-entry-main");
    main.append(createNode("span", "list-entry-label", item.label));

    if (item.hint) {
      main.append(createNode("span", "list-entry-hint", item.hint));
    }

    button.append(main);

    if (item.children?.length) {
      button.append(createNode("span", "list-entry-chevron", ">"));
    }

    button.addEventListener("click", () => {
      if (item.children?.length) {
        appState.previewPath.push(item.id);
        renderPreview();
        return;
      }

      if (item.action) {
        executeAction(item.action);
        return;
      }

      showToast("Button sin action ni children");
    });

    itemsNode.append(button);
  }
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
      const maxX = stageRect.width - shell.offsetWidth;
      const maxY = stageRect.height - shell.offsetHeight;
      const nextX = clamp(moveEvent.clientX - stageRect.left - offsetX, 0, maxX);
      const nextY = clamp(moveEvent.clientY - stageRect.top - offsetY, 0, maxY);

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

function buildPreviewShell() {
  const shell = createNode("section", "widget-shell widget-shell-list preview-widget-shell");
  shell.style.left = "30px";
  shell.style.top = "108px";
  shell.style.zIndex = String(++appState.highestLayer);

  const card = createNode("article", "widget-card list-widget-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", "Preview"));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "widget-body list-widget-body");
  const nav = createNode("div", "list-widget-nav");
  const back = createNode("button", "list-widget-back", "<- ");
  back.type = "button";
  const heading = createNode("div", "list-widget-heading");
  heading.append(createNode("p", "metric-label", "Vista viva"));
  const path = createNode("p", "list-widget-path");
  heading.append(path);
  nav.append(back, heading);

  const itemsNode = createNode("div", "list-items");
  body.append(nav, itemsNode);
  card.append(grip, body);
  shell.append(card);
  shell._previewRefs = { itemsNode, path, back };

  back.addEventListener("click", () => {
    appState.previewPath.pop();
    renderPreview();
  });

  enableDragging(shell);
  stage.append(shell);
  return shell;
}

function renderPreview() {
  ensurePreviewPathIsValid();

  if (!appState.previewShell) {
    appState.previewShell = buildPreviewShell();
  }

  const context = getCurrentPreviewContext() ?? { title: appState.definition.title, items: appState.definition.items };
  renderPreviewItems(context, appState.previewShell._previewRefs.itemsNode, appState.previewShell._previewRefs.path, appState.previewShell._previewRefs.back);
}

function updateInspectorAvailability(item, context) {
  const hasSelection = Boolean(item);
  nodeLabelInput.disabled = !hasSelection;
  nodeHintInput.disabled = !item || item.type !== "button";
  nodeActionInput.disabled = !item || item.type !== "button";
  nodeVariantInput.disabled = !item || item.type !== "element";
  enterChildrenButton.disabled = !item || item.type !== "button";
  duplicateNodeButton.disabled = !hasSelection;
  deleteNodeButton.disabled = !hasSelection;
  moveUpButton.disabled = !hasSelection || context.items.findIndex((entry) => entry.id === item.id) <= 0;
  moveDownButton.disabled = !hasSelection || context.items.findIndex((entry) => entry.id === item.id) === context.items.length - 1;

  nodeHintField.hidden = !item || item.type !== "button";
  nodeActionField.hidden = !item || item.type !== "button";
  nodeVariantField.hidden = !item || item.type !== "element";
}

function renderStructureList(context) {
  structureListNode.replaceChildren();

  if (!context.items.length) {
    structureListNode.append(createNode("p", "selection-summary", "Este nivel esta vacio. Agrega items desde arriba."));
    return;
  }

  for (const item of context.items) {
    const row = createNode("div", "structure-item");
    const selectButton = createNode("button", "structure-item-button");
    selectButton.type = "button";

    if (item.id === appState.selectedId) {
      selectButton.classList.add("is-selected");
    }

    const main = createNode("span", "structure-item-main");
    const label = item.type === "button" ? item.label : item.variant === "separator" ? "Separator" : item.label || item.variant;
    const metaParts = [item.type];

    if (item.type === "button") {
      metaParts.push(item.children.length ? `${item.children.length} children` : "sin children");
      if (item.action) {
        metaParts.push(item.action);
      }
    } else {
      metaParts.push(item.variant);
    }

    main.append(createNode("span", "structure-item-label", label));
    main.append(createNode("span", "structure-item-meta", metaParts.join(" / ")));
    selectButton.append(main);
    selectButton.addEventListener("click", () => {
      appState.selectedId = item.id;
      renderEditor();
    });
    row.append(selectButton);

    if (item.type === "button") {
      const tools = createNode("div", "structure-item-tools");
      const childButton = createNode("button", "icon-button", ">");
      childButton.type = "button";
      childButton.title = "Editar children";
      childButton.addEventListener("click", () => {
        if (!Array.isArray(item.children)) {
          item.children = [];
        }

        appState.editorPath.push(item.id);
        appState.selectedId = item.children[0]?.id ?? null;
        renderAll();
      });
      tools.append(childButton);
      row.append(tools);
    }

    structureListNode.append(row);
  }
}

function renderEditor() {
  ensureSelectionIsValid();
  const context = getCurrentEditorContext();

  if (!context) {
    return;
  }

  const currentItem = getCurrentSelectedItem();
  const currentPathLabel = [appState.definition.title];
  let items = appState.definition.items;

  for (const itemId of appState.editorPath) {
    const button = items.find((item) => item.id === itemId && item.type === "button");

    if (!button) {
      break;
    }

    currentPathLabel.push(button.label || "Sublista");
    items = button.children;
  }

  editorPathNode.textContent = currentPathLabel.join(" / ");
  currentLevelTitleInput.value = context.title;
  backLevelButton.disabled = appState.editorPath.length === 0;
  statusNode.textContent = `${context.items.length} items`;
  renderStructureList(context);

  if (!currentItem) {
    selectionSummary.textContent = "Selecciona un nodo para editar sus propiedades.";
    nodeLabelInput.value = "";
    nodeHintInput.value = "";
    nodeActionInput.value = "";
    nodeVariantInput.value = "title";
    updateInspectorAvailability(null, context);
    return;
  }

  selectionSummary.textContent = `Editando ${currentItem.type} #${currentItem.id}`;
  nodeLabelInput.value = currentItem.label ?? "";
  nodeHintInput.value = currentItem.type === "button" ? currentItem.hint : "";
  nodeActionInput.value = currentItem.type === "button" ? currentItem.action : "";
  nodeVariantInput.value = currentItem.type === "element" ? currentItem.variant : "title";
  enterChildrenButton.textContent = currentItem.type === "button" && currentItem.children.length ? "Entrar hijos" : "Crear hijos";
  updateInspectorAvailability(currentItem, context);
}

function renderAll() {
  renderEditor();
  renderPreview();
  syncJsonTextarea();
}

function addItem(kind) {
  const context = getCurrentEditorContext();

  if (!context) {
    return;
  }

  let item;

  if (kind === "button") {
    item = createButtonItem();
  } else if (kind === "title") {
    item = createElementItem("title");
  } else if (kind === "text") {
    item = createElementItem("text");
  } else {
    item = createElementItem("separator");
  }

  context.items.push(item);
  appState.selectedId = item.id;
  renderAll();
}

function moveSelectedItem(direction) {
  const context = getCurrentEditorContext();
  const index = context.items.findIndex((item) => item.id === appState.selectedId);

  if (index < 0) {
    return;
  }

  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= context.items.length) {
    return;
  }

  const [item] = context.items.splice(index, 1);
  context.items.splice(nextIndex, 0, item);
  renderAll();
}

function deleteSelectedItem() {
  const context = getCurrentEditorContext();
  const index = context.items.findIndex((item) => item.id === appState.selectedId);

  if (index < 0) {
    return;
  }

  context.items.splice(index, 1);
  appState.selectedId = context.items[Math.max(0, index - 1)]?.id ?? context.items[0]?.id ?? null;
  renderAll();
}

function duplicateSelectedItem() {
  const context = getCurrentEditorContext();
  const item = getCurrentSelectedItem();

  if (!item) {
    return;
  }

  const clone = cloneItemWithFreshIds(item);
  const index = context.items.findIndex((entry) => entry.id === item.id);
  context.items.splice(index + 1, 0, clone);
  appState.selectedId = clone.id;
  renderAll();
}

function enterSelectedChildren() {
  const item = getCurrentSelectedItem();

  if (!item || item.type !== "button") {
    return;
  }

  if (!Array.isArray(item.children)) {
    item.children = [];
  }

  appState.editorPath.push(item.id);
  appState.selectedId = item.children[0]?.id ?? null;
  renderAll();
}

function saveToLocalStorage() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportDefinition(appState.definition)));
  showToast("Estructura guardada en localStorage");
}

function loadFromLocalStorage() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    showToast("No hay estructura guardada en localStorage");
    return;
  }

  const parsed = JSON.parse(raw);
  setDefinition(parsed, "Estructura cargada desde localStorage");
}

function downloadJsonFile() {
  const payload = JSON.stringify(exportDefinition(appState.definition), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "list-widget-structure.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("JSON descargado");
}

function importFromTextarea() {
  try {
    const parsed = JSON.parse(jsonTextarea.value);
    setDefinition(parsed, "JSON importado correctamente");
  } catch (error) {
    showToast(error.message || "No se pudo importar el JSON");
  }
}

function handleToolbarAction(action) {
  if (action === "new") {
    setDefinition({ title: "Nueva lista", items: [] }, "Nueva estructura creada");
    return;
  }

  if (action === "sample") {
    setDefinition(deepClone(defaultDefinition), "Ejemplo restaurado");
    return;
  }

  if (action === "save-local") {
    saveToLocalStorage();
    return;
  }

  if (action === "load-local") {
    try {
      loadFromLocalStorage();
    } catch (error) {
      showToast(error.message || "No se pudo cargar localStorage");
    }
    return;
  }

  if (action === "download-json") {
    downloadJsonFile();
    return;
  }

  if (action === "open-file") {
    fileInput.click();
  }
}

toolbar.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-toolbar-action]");

  if (actionButton) {
    handleToolbarAction(actionButton.dataset.toolbarAction);
  }
});

editorDock.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-item]");

  if (!addButton) {
    return;
  }

  addItem(addButton.dataset.addItem);
});

backLevelButton.addEventListener("click", () => {
  if (!appState.editorPath.length) {
    return;
  }

  appState.editorPath.pop();
  appState.selectedId = getCurrentEditorContext()?.items[0]?.id ?? null;
  renderAll();
});

currentLevelTitleInput.addEventListener("input", () => {
  const context = getCurrentEditorContext();

  if (!context) {
    return;
  }

  const value = currentLevelTitleInput.value.trim() || "Sin titulo";

  if (context.parentButton) {
    context.parentButton.label = value;
  } else {
    appState.definition.title = value;
  }

  renderAll();
});

nodeLabelInput.addEventListener("input", () => {
  const item = getCurrentSelectedItem();

  if (!item) {
    return;
  }

  item.label = nodeLabelInput.value;
  renderAll();
});

nodeHintInput.addEventListener("input", () => {
  const item = getCurrentSelectedItem();

  if (!item || item.type !== "button") {
    return;
  }

  item.hint = nodeHintInput.value;
  renderAll();
});

nodeActionInput.addEventListener("input", () => {
  const item = getCurrentSelectedItem();

  if (!item || item.type !== "button") {
    return;
  }

  item.action = nodeActionInput.value;
  renderAll();
});

nodeVariantInput.addEventListener("change", () => {
  const item = getCurrentSelectedItem();

  if (!item || item.type !== "element") {
    return;
  }

  item.variant = nodeVariantInput.value;

  if (item.variant === "separator") {
    item.label = "";
  } else if (!item.label) {
    item.label = item.variant === "title" ? "Nuevo title" : "Nuevo text";
  }

  renderAll();
});

enterChildrenButton.addEventListener("click", enterSelectedChildren);
duplicateNodeButton.addEventListener("click", duplicateSelectedItem);
moveUpButton.addEventListener("click", () => moveSelectedItem(-1));
moveDownButton.addEventListener("click", () => moveSelectedItem(1));
deleteNodeButton.addEventListener("click", deleteSelectedItem);
refreshJsonButton.addEventListener("click", syncJsonTextarea);
importJsonButton.addEventListener("click", importFromTextarea);

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    setDefinition(parsed, "JSON cargado desde archivo");
  } catch (error) {
    showToast(error.message || "No se pudo leer el archivo JSON");
  } finally {
    fileInput.value = "";
  }
});

setDefinition(deepClone(defaultDefinition));