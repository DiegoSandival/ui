const STORAGE_KEY = "homoiconic-list-lab";

const stage = document.querySelector("#stage");
const fileInput = document.querySelector("#json-file-input");
const toastStack = document.querySelector("#toast-stack");

const defaultDefinition = {
  title: "Sistema base",
  items: [
    { type: "element", variant: "title", label: "Inicio" },
    { type: "button", label: "Abrir", hint: "Accion ejemplo", action: "open-home" },
    {
      type: "button",
      label: "Biblioteca",
      hint: "Sublista base",
      children: [
        { type: "element", variant: "title", label: "Coleccion" },
        { type: "button", label: "Controles", hint: "Accion simple", action: "show-controls" },
        { type: "element", variant: "separator" },
        { type: "element", variant: "text", label: "La complejidad se compone desde la misma estructura." }
      ]
    }
  ]
};

const appState = {
  definition: null,
  nextId: 1,
  composePath: [],
  previewPath: [],
  commandPath: [],
  selectedId: null,
  capture: null,
  highestLayer: 30,
  widgets: {}
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
  window.setTimeout(() => toast.remove(), 2200);
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

  return {
    definition: {
      title: typeof rawDefinition.title === "string" && rawDefinition.title.trim() ? rawDefinition.title : "Lista",
      items: Array.isArray(rawDefinition.items) ? rawDefinition.items.map(normalizeItem) : []
    },
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

function getComposeContext() {
  return getListContext(appState.composePath);
}

function getPreviewContext() {
  return getListContext(appState.previewPath);
}

function getSelectedItem() {
  const context = getComposeContext();

  if (!context || appState.selectedId === null) {
    return null;
  }

  return context.items.find((item) => item.id === appState.selectedId) ?? null;
}

function getPathLabels(path) {
  const labels = [appState.definition.title];
  let items = appState.definition.items;

  for (const itemId of path) {
    const button = items.find((item) => item.id === itemId && item.type === "button");

    if (!button) {
      break;
    }

    labels.push(button.label || "Sublista");
    items = button.children;
  }

  return labels;
}

function ensureSelectionIsValid() {
  const context = getComposeContext();

  if (!context) {
    appState.composePath = [];
    appState.selectedId = appState.definition.items[0]?.id ?? null;
    return;
  }

  const exists = context.items.some((item) => item.id === appState.selectedId);

  if (!exists) {
    appState.selectedId = context.items[0]?.id ?? null;
  }
}

function ensurePreviewPathIsValid() {
  const validPath = [];
  let items = appState.definition.items;

  for (const itemId of appState.previewPath) {
    const button = items.find((item) => item.id === itemId && item.type === "button" && item.children?.length);

    if (!button) {
      break;
    }

    validPath.push(itemId);
    items = button.children;
  }

  appState.previewPath = validPath;
}

function createElementRow(item) {
  if (item.variant === "separator") {
    return createNode("div", "list-element list-element-separator");
  }

  if (item.variant === "title") {
    return createNode("div", "list-element list-element-title", item.label);
  }

  return createNode("div", "list-element list-element-text system-copy", item.label);
}

function executePreviewAction(actionName) {
  const messages = {
    "open-home": "Accion ejecutada: open-home",
    "show-controls": "Accion ejecutada: show-controls",
    "show-toast": "Accion ejecutada: show-toast"
  };

  showToast(messages[actionName] ?? `Accion no registrada: ${actionName}`);
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
  link.download = "homoiconic-list.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("JSON descargado");
}

function openJsonFile() {
  fileInput.click();
}

function closeCapture() {
  appState.capture = null;

  if (appState.widgets.capture) {
    appState.widgets.capture.hidden = true;
  }
}

function openCapture(config) {
  appState.capture = {
    title: config.title,
    description: config.description,
    placeholder: config.placeholder,
    initialValue: config.initialValue ?? "",
    onSubmit: config.onSubmit
  };
  renderCapture();
}

function setDefinition(rawDefinition, notice) {
  const normalized = normalizeDefinition(rawDefinition);
  appState.definition = normalized.definition;
  appState.nextId = normalized.nextId;
  appState.composePath = [];
  appState.previewPath = [];
  appState.commandPath = [];
  appState.selectedId = appState.definition.items[0]?.id ?? null;
  closeCapture();
  renderAll();

  if (notice) {
    showToast(notice);
  }
}

function buildSceneView() {
  ensurePreviewPathIsValid();
  const context = getPreviewContext() ?? { title: appState.definition.title, items: appState.definition.items };
  const composeSignature = appState.composePath.join("/");
  const previewSignature = appState.previewPath.join("/");
  const sameLevel = composeSignature === previewSignature;

  const items = context.items.map((item) => {
    if (item.type === "element") {
      return item;
    }

    return {
      ...item,
      kind: "scene",
      selected: sameLevel && item.id === appState.selectedId,
      badge: item.children?.length ? String(item.children.length) : item.action ? "act" : ""
    };
  });

  return {
    title: context.title,
    eyebrow: "Scene",
    status: `Run path: ${getPathLabels(appState.previewPath).join(" / ")}`,
    items
  };
}

function buildSelectMenu(context) {
  const items = [
    { type: "element", variant: "title", label: "Seleccion actual" },
    { type: "element", variant: "text", label: `Nivel: ${getPathLabels(appState.composePath).join(" / ")}` }
  ];

  if (!context.items.length) {
    items.push({ type: "element", variant: "text", label: "Este nivel esta vacio." });
  }

  for (const item of context.items) {
    const label = item.type === "button" ? item.label : item.variant === "separator" ? "Separator" : item.label || item.variant;
    const hint = item.type === "button"
      ? `${item.children.length ? `${item.children.length} children` : "sin children"}${item.action ? ` / ${item.action}` : ""}`
      : item.variant;

    items.push({
      type: "button",
      label,
      hint,
      kind: "command",
      badge: item.id === appState.selectedId ? "sel" : "",
      command: { type: "select-item", itemId: item.id }
    });
  }

  return { title: "Seleccionar nodo", items };
}

function buildCreateMenu() {
  return {
    title: "Crear nodo",
    items: [
      { type: "element", variant: "text", label: "Las nuevas piezas usan la misma estructura base." },
      { type: "button", label: "Nuevo button", hint: "Agrega un nodo accionable", kind: "command", command: { type: "create-item", itemType: "button" } },
      { type: "button", label: "Nuevo title", hint: "Encabezado estructural", kind: "command", command: { type: "create-item", itemType: "title" } },
      { type: "button", label: "Nuevo text", hint: "Texto auxiliar", kind: "command", command: { type: "create-item", itemType: "text" } },
      { type: "button", label: "Nuevo separator", hint: "Linea divisoria", kind: "command", command: { type: "create-item", itemType: "separator" } }
    ]
  };
}

function buildVariantMenu(item) {
  return {
    title: "Variant",
    items: [
      { type: "element", variant: "text", label: `Actual: ${item.variant}` },
      { type: "button", label: "title", hint: "Encabezado", kind: "command", command: { type: "set-variant", variant: "title" } },
      { type: "button", label: "text", hint: "Texto auxiliar", kind: "command", command: { type: "set-variant", variant: "text" } },
      { type: "button", label: "separator", hint: "Linea divisoria", kind: "command", command: { type: "set-variant", variant: "separator" } }
    ]
  };
}

function buildEditMenu(item) {
  const items = [
    { type: "element", variant: "title", label: item ? `Nodo #${item.id}` : "Sin seleccion" }
  ];

  if (!item) {
    items.push({ type: "element", variant: "text", label: "Selecciona un nodo desde el menu Seleccionar." });
    return { title: "Editar nodo", items };
  }

  items.push({ type: "element", variant: "text", label: `Tipo: ${item.type}` });
  items.push({ type: "button", label: "Set label", hint: item.label || "Sin label", kind: "command", command: { type: "prompt-label" } });
  items.push({ type: "button", label: "Duplicar", hint: "Clona este nodo", kind: "command", command: { type: "duplicate-selected" } });
  items.push({ type: "button", label: "Mover arriba", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: -1 } });
  items.push({ type: "button", label: "Mover abajo", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: 1 } });
  items.push({ type: "button", label: "Eliminar", hint: "Borra el nodo", kind: "command", command: { type: "delete-selected" } });

  if (item.type === "button") {
    items.push({ type: "element", variant: "separator" });
    items.push({ type: "button", label: "Set hint", hint: item.hint || "Sin hint", kind: "command", command: { type: "prompt-hint" } });
    items.push({ type: "button", label: "Set action", hint: item.action || "Sin action", kind: "command", command: { type: "prompt-action" } });
    items.push({ type: "button", label: "Clear action", hint: "Vaciar action", kind: "command", command: { type: "clear-action" } });
    items.push({ type: "button", label: "Entrar children", hint: item.children.length ? `${item.children.length} children` : "Crear sublista", kind: "command", command: { type: "enter-selected-children" } });
  } else {
    items.push({ type: "button", label: "Variant", hint: item.variant, kind: "command", nextPath: ["edit", "variant"] });
  }

  return { title: "Editar nodo", items };
}

function buildLevelMenu(context) {
  const items = [
    { type: "element", variant: "title", label: context.title },
    { type: "element", variant: "text", label: `Compose path: ${getPathLabels(appState.composePath).join(" / ")}` },
    { type: "button", label: "Set level title", hint: "Renombrar este nivel", kind: "command", command: { type: "prompt-level-title" } },
    { type: "button", label: "Sync scene here", hint: "Mover preview al nivel actual", kind: "command", command: { type: "sync-preview" } }
  ];

  if (appState.composePath.length) {
    items.push({ type: "button", label: "Back level", hint: "Subir un nivel", kind: "command", command: { type: "compose-back" } });
  }

  const selected = getSelectedItem();
  if (selected?.type === "button") {
    items.push({ type: "button", label: "Enter selected children", hint: selected.children.length ? `${selected.children.length} children` : "Sublista vacia", kind: "command", command: { type: "enter-selected-children" } });
  }

  return { title: "Nivel", items };
}

function buildPersistenceMenu() {
  return {
    title: "Persistencia",
    items: [
      { type: "element", variant: "text", label: "Guardar y cargar sin salir del mismo lenguaje de listas." },
      { type: "button", label: "Guardar local", hint: "localStorage", kind: "command", command: { type: "save-local" } },
      { type: "button", label: "Cargar local", hint: "Recuperar snapshot", kind: "command", command: { type: "load-local" } },
      { type: "button", label: "Descargar JSON", hint: "Exportar archivo", kind: "command", command: { type: "download-json" } },
      { type: "button", label: "Importar archivo", hint: "Cargar JSON", kind: "command", command: { type: "open-json-file" } },
      { type: "button", label: "Reset sample", hint: "Volver al ejemplo", kind: "command", command: { type: "reset-sample" } }
    ]
  };
}

function buildRootComposerMenu(context) {
  const selected = getSelectedItem();
  const items = [
    { type: "element", variant: "title", label: "Composer" },
    { type: "element", variant: "text", label: `Editing: ${getPathLabels(appState.composePath).join(" / ")}` },
    { type: "element", variant: "text", label: `Selected: ${selected ? `${selected.type} #${selected.id}` : "none"}` },
    { type: "button", label: "Seleccionar nodo", hint: `${context.items.length} items`, kind: "command", nextPath: ["select"] },
    { type: "button", label: "Crear nodo", hint: "Button, title, text, separator", kind: "command", nextPath: ["create"] },
    { type: "button", label: "Editar nodo", hint: selected ? (selected.type === "button" ? selected.label : selected.variant) : "Sin seleccion", kind: "command", nextPath: ["edit"] },
    { type: "button", label: "Nivel", hint: "Ruta y sublistas", kind: "command", nextPath: ["level"] },
    { type: "button", label: "Persistencia", hint: "JSON y storage", kind: "command", nextPath: ["persist"] }
  ];

  return { title: "Composer", items };
}

function buildComposerView() {
  ensureSelectionIsValid();
  const context = getComposeContext() ?? { title: appState.definition.title, items: appState.definition.items };
  const selected = getSelectedItem();
  let menu;

  if (!appState.commandPath.length) {
    menu = buildRootComposerMenu(context);
  } else if (appState.commandPath[0] === "select") {
    menu = buildSelectMenu(context);
  } else if (appState.commandPath[0] === "create") {
    menu = buildCreateMenu();
  } else if (appState.commandPath[0] === "edit" && appState.commandPath[1] === "variant") {
    menu = buildVariantMenu(selected);
  } else if (appState.commandPath[0] === "edit") {
    menu = buildEditMenu(selected);
  } else if (appState.commandPath[0] === "level") {
    menu = buildLevelMenu(context);
  } else if (appState.commandPath[0] === "persist") {
    menu = buildPersistenceMenu();
  } else {
    menu = buildRootComposerMenu(context);
  }

  return {
    title: menu.title,
    eyebrow: "Composer",
    status: `Compose path: ${getPathLabels(appState.composePath).join(" / ")}`,
    items: menu.items
  };
}

function renderListWidget(shell, view, options) {
  const refs = shell._refs;
  refs.eyebrowNode.textContent = view.eyebrow;
  refs.pathNode.textContent = view.title;
  refs.statusNode.textContent = view.status || "";
  refs.backNode.hidden = !options.canGoBack;
  refs.itemsNode.replaceChildren();

  for (const item of view.items) {
    if (item.type === "element") {
      refs.itemsNode.append(createElementRow(item));
      continue;
    }

    const button = createNode("button", "list-entry system-list-entry");
    button.type = "button";

    if (item.selected) {
      button.classList.add("is-selected");
    }

    if (item.kind === "command") {
      button.classList.add("is-command");
    }

    const main = createNode("span", "list-entry-main");
    main.append(createNode("span", "list-entry-label", item.label));

    if (item.hint) {
      main.append(createNode("span", "list-entry-hint", item.hint));
    }

    button.append(main);

    if (item.badge) {
      button.append(createNode("span", "list-entry-badge", item.badge));
    } else if (item.children?.length || item.nextPath) {
      button.append(createNode("span", "list-entry-chevron", ">"));
    }

    button.addEventListener("click", () => options.onButton(item));
    refs.itemsNode.append(button);
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

function buildShell(kind, position) {
  const shell = createNode("section", `widget-shell widget-shell-list system-widget-shell ${kind === "scene" ? "scene-shell" : "composer-shell"}`);
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++appState.highestLayer);

  const card = createNode("article", "widget-card list-widget-card system-list-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", kind === "scene" ? "Scene" : "Composer"));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "widget-body list-widget-body system-list-body");
  const nav = createNode("div", "list-widget-nav");
  const back = createNode("button", "list-widget-back", "←");
  back.type = "button";

  const heading = createNode("div", "list-widget-heading");
  const eyebrow = createNode("p", "metric-label");
  const path = createNode("p", "list-widget-path");
  const status = createNode("p", "system-status");
  heading.append(eyebrow, path, status);
  nav.append(back, heading);

  const itemsNode = createNode("div", "list-items");
  body.append(nav, itemsNode);
  card.append(grip, body);
  shell.append(card);
  shell._refs = { backNode: back, eyebrowNode: eyebrow, pathNode: path, statusNode: status, itemsNode };

  enableDragging(shell);
  stage.append(shell);
  return shell;
}

function buildCaptureShell(position) {
  const shell = createNode("section", "widget-shell system-widget-shell capture-shell");
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++appState.highestLayer);
  shell.hidden = true;

  const card = createNode("article", "widget-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", "Input"));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "capture-body");
  const titleNode = createNode("p", "capture-title");
  const copyNode = createNode("p", "capture-copy");
  const inputNode = createNode("input", "glass-input");
  inputNode.type = "text";

  const actions = createNode("div", "capture-actions");
  const cancelButton = createNode("button", "capture-button", "Cancelar");
  cancelButton.type = "button";
  const applyButton = createNode("button", "capture-button", "Aplicar");
  applyButton.type = "button";
  actions.append(cancelButton, applyButton);

  body.append(titleNode, copyNode, inputNode, actions);
  card.append(grip, body);
  shell.append(card);
  shell._refs = { titleNode, copyNode, inputNode, cancelButton, applyButton };

  cancelButton.addEventListener("click", () => {
    closeCapture();
  });

  applyButton.addEventListener("click", () => {
    if (!appState.capture) {
      return;
    }

    const currentCapture = appState.capture;
    const value = inputNode.value;
    closeCapture();
    currentCapture.onSubmit(value);
    renderAll();
  });

  inputNode.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    applyButton.click();
  });

  enableDragging(shell);
  stage.append(shell);
  return shell;
}

function renderCapture() {
  const shell = appState.widgets.capture;

  if (!shell) {
    return;
  }

  if (!appState.capture) {
    shell.hidden = true;
    return;
  }

  shell.hidden = false;
  shell.style.zIndex = String(++appState.highestLayer);
  shell._refs.titleNode.textContent = appState.capture.title;
  shell._refs.copyNode.textContent = appState.capture.description || "Usa el mismo sistema base para introducir texto.";
  shell._refs.inputNode.placeholder = appState.capture.placeholder || "Escribe aqui";
  shell._refs.inputNode.value = appState.capture.initialValue;
  window.setTimeout(() => {
    shell._refs.inputNode.focus();
    shell._refs.inputNode.select();
  }, 0);
}

function moveSelectedItem(direction) {
  const context = getComposeContext();
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
  const context = getComposeContext();
  const index = context.items.findIndex((item) => item.id === appState.selectedId);

  if (index < 0) {
    return;
  }

  context.items.splice(index, 1);
  appState.selectedId = context.items[Math.max(0, index - 1)]?.id ?? context.items[0]?.id ?? null;
  renderAll();
}

function executeCommand(command) {
  const context = getComposeContext();
  const selected = getSelectedItem();

  if (!command) {
    return;
  }

  if (command.type === "select-item") {
    appState.selectedId = command.itemId;
    renderAll();
    return;
  }

  if (command.type === "create-item") {
    const item = command.itemType === "button"
      ? createButtonItem()
      : createElementItem(command.itemType);
    context.items.push(item);
    appState.selectedId = item.id;
    renderAll();
    return;
  }

  if (command.type === "prompt-label" && selected) {
    openCapture({
      title: "Set label",
      description: "Un mismo widget de entrada captura texto para cualquier operacion estructural.",
      placeholder: selected.type === "button" ? "Nuevo button" : "Nuevo element",
      initialValue: selected.label,
      onSubmit: (nextLabel) => {
        selected.label = nextLabel || (selected.type === "button" ? "Nuevo button" : "Nuevo element");
      }
    });

    return;
  }

  if (command.type === "prompt-hint" && selected?.type === "button") {
    openCapture({
      title: "Set hint",
      description: "El hint sigue siendo texto, pero entra por una primitiva reutilizable.",
      placeholder: "Hint",
      initialValue: selected.hint,
      onSubmit: (nextHint) => {
        selected.hint = nextHint;
      }
    });

    return;
  }

  if (command.type === "prompt-action" && selected?.type === "button") {
    openCapture({
      title: "Set action",
      description: "La action sigue siendo un string, ahora capturado por el mismo sistema visual.",
      placeholder: "show-toast",
      initialValue: selected.action,
      onSubmit: (nextAction) => {
        selected.action = nextAction;
      }
    });

    return;
  }

  if (command.type === "clear-action" && selected?.type === "button") {
    selected.action = "";
    renderAll();
    return;
  }

  if (command.type === "enter-selected-children" && selected?.type === "button") {
    if (!Array.isArray(selected.children)) {
      selected.children = [];
    }

    appState.composePath.push(selected.id);
    appState.selectedId = selected.children[0]?.id ?? null;
    appState.commandPath = [];
    renderAll();
    return;
  }

  if (command.type === "compose-back") {
    if (appState.composePath.length) {
      appState.composePath.pop();
      appState.selectedId = getComposeContext()?.items[0]?.id ?? null;
      appState.commandPath = [];
      renderAll();
    }
    return;
  }

  if (command.type === "prompt-level-title") {
    openCapture({
      title: "Titulo del nivel",
      description: "Cambiar el titulo de un nivel tambien usa la misma pieza de entrada.",
      placeholder: context.title,
      initialValue: context.title,
      onSubmit: (nextTitle) => {
        if (context.parentButton) {
          context.parentButton.label = nextTitle || "Sublista";
        } else {
          appState.definition.title = nextTitle || "Lista";
        }
      }
    });

    return;
  }

  if (command.type === "duplicate-selected" && selected) {
    const index = context.items.findIndex((item) => item.id === selected.id);
    const clone = cloneItemWithFreshIds(selected);
    context.items.splice(index + 1, 0, clone);
    appState.selectedId = clone.id;
    renderAll();
    return;
  }

  if (command.type === "move-selected") {
    moveSelectedItem(command.direction);
    return;
  }

  if (command.type === "delete-selected") {
    deleteSelectedItem();
    return;
  }

  if (command.type === "set-variant" && selected?.type === "element") {
    selected.variant = command.variant;

    if (command.variant === "separator") {
      selected.label = "";
    } else if (!selected.label) {
      selected.label = command.variant === "title" ? "Nuevo title" : "Nuevo text";
    }

    appState.commandPath = ["edit"];
    renderAll();
    return;
  }

  if (command.type === "sync-preview") {
    appState.previewPath = [...appState.composePath];
    renderAll();
    return;
  }

  if (command.type === "save-local") {
    saveToLocalStorage();
    return;
  }

  if (command.type === "load-local") {
    loadFromLocalStorage();
    return;
  }

  if (command.type === "download-json") {
    downloadJsonFile();
    return;
  }

  if (command.type === "open-json-file") {
    openJsonFile();
    return;
  }

  if (command.type === "reset-sample") {
    setDefinition(deepClone(defaultDefinition), "Ejemplo restaurado");
  }
}

function handleSceneButton(item) {
  if (item.children?.length) {
    appState.previewPath.push(item.id);
    renderScene();
    return;
  }

  if (item.action) {
    executePreviewAction(item.action);
    return;
  }

  showToast("Button sin action ni children");
}

function handleComposerButton(item) {
  if (item.nextPath) {
    appState.commandPath = [...item.nextPath];
    renderComposer();
    return;
  }

  executeCommand(item.command);
}

function renderScene() {
  const view = buildSceneView();
  renderListWidget(appState.widgets.scene, view, {
    canGoBack: appState.previewPath.length > 0,
    onButton: handleSceneButton
  });
}

function renderComposer() {
  const view = buildComposerView();
  renderListWidget(appState.widgets.composer, view, {
    canGoBack: appState.commandPath.length > 0,
    onButton: handleComposerButton
  });
}

function renderAll() {
  ensureSelectionIsValid();
  renderScene();
  renderComposer();
  renderCapture();
}

function buildWidgets() {
  appState.widgets.scene = buildShell("scene", { x: 28, y: 108 });
  appState.widgets.composer = buildShell("composer", { x: 340, y: 132 });
  appState.widgets.capture = buildCaptureShell({ x: 652, y: 148 });

  appState.widgets.scene._refs.backNode.addEventListener("click", () => {
    if (!appState.previewPath.length) {
      return;
    }

    appState.previewPath.pop();
    renderScene();
  });

  appState.widgets.composer._refs.backNode.addEventListener("click", () => {
    if (!appState.commandPath.length) {
      return;
    }

    appState.commandPath.pop();
    renderComposer();
  });
}

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
    showToast(error.message || "No se pudo leer el JSON");
  } finally {
    fileInput.value = "";
  }
});

buildWidgets();
setDefinition(deepClone(defaultDefinition));