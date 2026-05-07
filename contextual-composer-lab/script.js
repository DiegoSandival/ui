const STORAGE_KEY = "contextual-composer-lab";

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
        { type: "button", label: "Controles", hint: "Botones y toggles", action: "show-controls" },
        { type: "button", label: "Media", hint: "Imagenes y previews", action: "show-media" },
        {
          type: "button",
          label: "Anidar mas",
          hint: "Tercer nivel",
          children: [
            { type: "element", variant: "title", label: "Nivel 3" },
            { type: "button", label: "Pieza", hint: "Accion simple", action: "show-toast" }
          ]
        },
        { type: "element", variant: "separator" },
        { type: "element", variant: "text", label: "Cada nuevo contexto deberia sugerir el siguiente espacio de accion." }
      ]
    }
  ]
};

const defaultRules = [
  {
    id: "context-summary",
    title: "Surface context summary",
    description: "Expone ruta, accion reciente y seleccion actual.",
    enabled: true,
    priority: 10,
    match: { kind: "always" },
    emit: { type: "context-summary" }
  },
  {
    id: "visible-buttons",
    title: "Surface visible targets",
    description: "Propone interactuar con los botones visibles del contexto actual.",
    enabled: true,
    priority: 20,
    match: { kind: "visible-buttons" },
    emit: { type: "visible-buttons", limit: 6 }
  },
  {
    id: "selected-button",
    title: "Button structural actions",
    description: "Si la seleccion actual es un button, expone editar, mover, duplicar y children.",
    enabled: true,
    priority: 30,
    match: { kind: "selected-type", value: "button" },
    emit: { type: "selected-button-actions" }
  },
  {
    id: "selected-element",
    title: "Element structural actions",
    description: "Si la seleccion actual es un element, expone variant, mover, duplicar y borrar.",
    enabled: true,
    priority: 40,
    match: { kind: "selected-type", value: "element" },
    emit: { type: "selected-element-actions" }
  },
  {
    id: "navigation-back",
    title: "Surface back path",
    description: "Cuando hay profundidad mayor a cero, propone volver al nivel anterior.",
    enabled: true,
    priority: 50,
    match: { kind: "can-go-back" },
    emit: { type: "back-action" }
  },
  {
    id: "base-create",
    title: "Surface base creation",
    description: "Siempre permite crear button, title, text y separator en el nivel actual.",
    enabled: true,
    priority: 60,
    match: { kind: "always" },
    emit: { type: "create-actions" }
  },
  {
    id: "persistence",
    title: "Surface persistence",
    description: "Siempre permite guardar, cargar, descargar e importar la estructura.",
    enabled: true,
    priority: 70,
    match: { kind: "always" },
    emit: { type: "persistence-actions" }
  }
];

const appState = {
  definition: null,
  rules: [],
  nextId: 1,
  currentPath: [],
  selectedId: null,
  lastAction: { type: "boot", label: "Inicializar demo" },
  capture: null,
  enginePath: [],
  armedButtons: {
    scene: null,
    composer: null,
    engine: null
  },
  highestLayer: 30,
  widgets: {},
  lastSnapshot: null,
  lastMatches: []
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

function clearArmedButtons(exceptScope = null) {
  for (const scope of Object.keys(appState.armedButtons)) {
    if (scope === exceptScope) {
      continue;
    }

    appState.armedButtons[scope] = null;
  }
}

function clearArmedButton(scope) {
  if (scope in appState.armedButtons) {
    appState.armedButtons[scope] = null;
  }
}

function getActivationKey(scope, item) {
  if (scope === "scene") {
    return `scene:${item.id}`;
  }

  if (item.activationKey) {
    return item.activationKey;
  }

  if (item.command) {
    return `${scope}:command:${JSON.stringify(item.command)}`;
  }

  if (item.nextPath) {
    return `${scope}:path:${item.nextPath.join("/")}:${item.label}`;
  }

  return `${scope}:label:${item.label}:${item.hint ?? ""}`;
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

function getCurrentContext() {
  return getListContext(appState.currentPath);
}

function getSelectedItem() {
  const context = getCurrentContext();

  if (!context || appState.selectedId === null) {
    return null;
  }

  return context.items.find((item) => item.id === appState.selectedId) ?? null;
}

function getPathLabels(path = appState.currentPath) {
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
  const context = getCurrentContext();

  if (!context) {
    appState.currentPath = [];
    appState.selectedId = appState.definition.items[0]?.id ?? null;
    return;
  }

  const exists = context.items.some((item) => item.id === appState.selectedId);

  if (!exists) {
    appState.selectedId = context.items.find((item) => item.type === "button")?.id ?? context.items[0]?.id ?? null;
  }
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
  appState.currentPath = [];
  appState.selectedId = appState.definition.items.find((item) => item.type === "button")?.id ?? appState.definition.items[0]?.id ?? null;
  appState.lastAction = { type: "set-definition", label: notice || "Actualizar definicion" };
  appState.enginePath = [];
  clearArmedButtons();
  closeCapture();
  renderAll();

  if (notice) {
    showToast(notice);
  }
}

function setRules(rawRules) {
  appState.rules = rawRules
    .map((rule, index) => ({ ...deepClone(rule), priority: typeof rule.priority === "number" ? rule.priority : (index + 1) * 10 }))
    .sort((left, right) => left.priority - right.priority);
}

function recordAction(type, label, details = {}) {
  appState.lastAction = { type, label, ...details };
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

function saveToLocalStorage() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ definition: exportDefinition(appState.definition), rules: appState.rules }));
  showToast("Sistema guardado en localStorage");
}

function loadFromLocalStorage() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    showToast("No hay sistema guardado en localStorage");
    return;
  }

  const parsed = JSON.parse(raw);
  setRules(parsed.rules ?? defaultRules);
  setDefinition(parsed.definition ?? defaultDefinition, "Sistema cargado desde localStorage");
}

function downloadJsonFile() {
  const payload = JSON.stringify({ definition: exportDefinition(appState.definition), rules: appState.rules }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "contextual-composer-system.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Sistema descargado como JSON");
}

function openJsonFile() {
  fileInput.click();
}

function buildSnapshot() {
  ensureSelectionIsValid();
  const context = getCurrentContext() ?? { title: appState.definition.title, items: appState.definition.items };
  const selected = getSelectedItem();
  const visibleButtons = context.items.filter((item) => item.type === "button");
  const selectedIndex = selected ? context.items.findIndex((item) => item.id === selected.id) : -1;
  const snapshot = {
    path: [...appState.currentPath],
    pathLabels: getPathLabels(),
    pathDepth: appState.currentPath.length,
    currentTitle: context.title,
    visibleButtons,
    totalItems: context.items.length,
    selected,
    selectedType: selected?.type ?? null,
    selectedLabel: selected?.label ?? null,
    selectedIndex,
    selectedHasChildren: Boolean(selected?.type === "button" && selected.children.length),
    canGoBack: appState.currentPath.length > 0,
    lastAction: appState.lastAction
  };

  appState.lastSnapshot = snapshot;
  return snapshot;
}

function matchesRule(rule, snapshot) {
  const match = rule.match;

  if (match.kind === "always") {
    return { matched: true, reason: "always" };
  }

  if (match.kind === "visible-buttons") {
    return snapshot.visibleButtons.length > 0
      ? { matched: true, reason: `visibleButtons=${snapshot.visibleButtons.length}` }
      : { matched: false, reason: "visibleButtons=0" };
  }

  if (match.kind === "selected-type") {
    return snapshot.selectedType === match.value
      ? { matched: true, reason: `selected.type=${match.value}` }
      : { matched: false, reason: `selected.type=${snapshot.selectedType ?? "none"}` };
  }

  if (match.kind === "can-go-back") {
    return snapshot.canGoBack
      ? { matched: true, reason: `pathDepth=${snapshot.pathDepth}` }
      : { matched: false, reason: "pathDepth=0" };
  }

  return { matched: false, reason: "unknown match" };
}

function emitRuleItems(rule, snapshot) {
  const emit = rule.emit;
  const items = [{ type: "element", variant: "title", label: rule.title }];

  if (emit.type === "context-summary") {
    items.push({ type: "element", variant: "text", label: `Path: ${snapshot.pathLabels.join(" / ")}` });
    items.push({ type: "element", variant: "text", label: `Selected: ${snapshot.selected ? `${snapshot.selected.type} ${snapshot.selected.label}` : "none"}` });
    items.push({ type: "element", variant: "text", label: `Last action: ${snapshot.lastAction.label}` });
    return items;
  }

  if (emit.type === "visible-buttons") {
    const limit = Math.max(1, emit.limit ?? snapshot.visibleButtons.length);
    snapshot.visibleButtons.slice(0, limit).forEach((item) => {
      items.push({
        type: "button",
        label: item.label,
        hint: item.children.length ? `Entrar o seleccionar / ${item.children.length} children` : item.hint || item.action || "Seleccionar o ejecutar",
        kind: "command",
        badge: item.id === snapshot.selected?.id ? "sel" : item.children.length ? String(item.children.length) : item.action ? "act" : "",
        command: { type: "focus-visible-button", itemId: item.id }
      });
    });
    return items;
  }

  if (emit.type === "selected-button-actions") {
    items.push({ type: "button", label: "Set label", hint: snapshot.selected.label, kind: "command", command: { type: "prompt-label" } });
    items.push({ type: "button", label: "Set hint", hint: snapshot.selected.hint || "Sin hint", kind: "command", command: { type: "prompt-hint" } });
    items.push({ type: "button", label: "Set action", hint: snapshot.selected.action || "Sin action", kind: "command", command: { type: "prompt-action" } });
    items.push({ type: "button", label: snapshot.selectedHasChildren ? "Entrar children" : "Crear children", hint: snapshot.selectedHasChildren ? `${snapshot.selected.children.length} children` : "Abrir sublista vacia", kind: "command", command: { type: "enter-selected-children" } });
    items.push({ type: "button", label: "Duplicar", hint: "Clonar nodo", kind: "command", command: { type: "duplicate-selected" } });
    items.push({ type: "button", label: "Mover arriba", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: -1 } });
    items.push({ type: "button", label: "Mover abajo", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: 1 } });
    items.push({ type: "button", label: "Eliminar", hint: "Borrar nodo", kind: "command", command: { type: "delete-selected" } });
    return items;
  }

  if (emit.type === "selected-element-actions") {
    items.push({ type: "button", label: "Set label", hint: snapshot.selected.label || snapshot.selected.variant, kind: "command", command: { type: "prompt-label" } });
    items.push({ type: "button", label: "Variant title", hint: "Encabezado", kind: "command", command: { type: "set-variant", variant: "title" } });
    items.push({ type: "button", label: "Variant text", hint: "Texto auxiliar", kind: "command", command: { type: "set-variant", variant: "text" } });
    items.push({ type: "button", label: "Variant separator", hint: "Linea divisoria", kind: "command", command: { type: "set-variant", variant: "separator" } });
    items.push({ type: "button", label: "Duplicar", hint: "Clonar nodo", kind: "command", command: { type: "duplicate-selected" } });
    items.push({ type: "button", label: "Mover arriba", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: -1 } });
    items.push({ type: "button", label: "Mover abajo", hint: "Reordena", kind: "command", command: { type: "move-selected", direction: 1 } });
    items.push({ type: "button", label: "Eliminar", hint: "Borrar nodo", kind: "command", command: { type: "delete-selected" } });
    return items;
  }

  if (emit.type === "back-action") {
    items.push({ type: "button", label: "Back level", hint: `Volver desde ${snapshot.currentTitle}`, kind: "command", command: { type: "scene-back" } });
    return items;
  }

  if (emit.type === "create-actions") {
    items.push({ type: "button", label: "Nuevo button", hint: "Crear nodo accionable", kind: "command", command: { type: "create-item", itemType: "button" } });
    items.push({ type: "button", label: "Nuevo title", hint: "Crear encabezado", kind: "command", command: { type: "create-item", itemType: "title" } });
    items.push({ type: "button", label: "Nuevo text", hint: "Crear texto", kind: "command", command: { type: "create-item", itemType: "text" } });
    items.push({ type: "button", label: "Nuevo separator", hint: "Crear division", kind: "command", command: { type: "create-item", itemType: "separator" } });
    return items;
  }

  if (emit.type === "persistence-actions") {
    items.push({ type: "button", label: "Guardar local", hint: "localStorage", kind: "command", command: { type: "save-local" } });
    items.push({ type: "button", label: "Cargar local", hint: "Restaurar sistema", kind: "command", command: { type: "load-local" } });
    items.push({ type: "button", label: "Descargar JSON", hint: "Exportar sistema", kind: "command", command: { type: "download-json" } });
    items.push({ type: "button", label: "Importar archivo", hint: "Cargar sistema JSON", kind: "command", command: { type: "open-json-file" } });
    items.push({ type: "button", label: "Reset sample", hint: "Volver al ejemplo", kind: "command", command: { type: "reset-sample" } });
    return items;
  }

  return items;
}

function evaluateRules(snapshot) {
  const matches = [];
  const items = [];

  for (const rule of appState.rules) {
    if (!rule.enabled) {
      continue;
    }

    const result = matchesRule(rule, snapshot);

    if (!result.matched) {
      continue;
    }

    matches.push({ id: rule.id, title: rule.title, reason: result.reason });
    items.push(...emitRuleItems(rule, snapshot));
  }

  appState.lastMatches = matches;
  return { items, matches };
}

function buildSceneView(snapshot) {
  const items = snapshot.visibleButtons.map((item) => ({
    ...item,
    kind: "scene",
    selected: item.id === snapshot.selected?.id,
    badge: item.children.length ? String(item.children.length) : item.action ? "act" : ""
  }));

  const visibleElements = getCurrentContext().items.filter((item) => item.type === "element");

  return {
    title: snapshot.currentTitle,
    eyebrow: "Scene",
    status: `Context: ${snapshot.pathLabels.join(" / ")}`,
    items: [...visibleElements, ...items]
  };
}

function buildComposerView(snapshot) {
  const evaluated = evaluateRules(snapshot);

  return {
    title: "Composer",
    eyebrow: "Composer",
    status: `${evaluated.matches.length} reglas activas / ultima accion: ${snapshot.lastAction.type}`,
    items: evaluated.items
  };
}

function getRuleById(ruleId) {
  return appState.rules.find((rule) => rule.id === ruleId) ?? null;
}

function buildEngineView(snapshot) {
  if (!appState.enginePath.length) {
    return {
      title: "Engine",
      eyebrow: "Engine",
      status: `${appState.lastMatches.length} reglas activas`,
      items: [
        { type: "element", variant: "title", label: "Snapshot" },
        { type: "element", variant: "text", label: `Path: ${snapshot.pathLabels.join(" / ")}` },
        { type: "element", variant: "text", label: `Selected: ${snapshot.selected ? `${snapshot.selected.type} ${snapshot.selected.label}` : "none"}` },
        { type: "element", variant: "text", label: `Last action: ${snapshot.lastAction.label}` },
        { type: "button", label: "Reglas activas", hint: `${appState.lastMatches.length} matches`, kind: "command", nextPath: ["active"] },
        { type: "button", label: "Todas las reglas", hint: `${appState.rules.length} reglas`, kind: "command", nextPath: ["rules"] }
      ]
    };
  }

  if (appState.enginePath[0] === "active") {
    return {
      title: "Reglas activas",
      eyebrow: "Engine",
      status: "Traza de coincidencias",
      items: appState.lastMatches.length
        ? appState.lastMatches.flatMap((match) => ([
            { type: "button", label: match.title, hint: match.reason, kind: "command", nextPath: ["rule", match.id] }
          ]))
        : [{ type: "element", variant: "text", label: "No hay reglas activas en este contexto." }]
    };
  }

  if (appState.enginePath[0] === "rules") {
    return {
      title: "Todas las reglas",
      eyebrow: "Engine",
      status: "Motor editable con la misma base de listas",
      items: appState.rules.flatMap((rule) => ([
        {
          type: "button",
          label: rule.title,
          hint: `${rule.enabled ? "on" : "off"} / p${rule.priority} / ${rule.emit.type}`,
          kind: "command",
          badge: rule.enabled ? "on" : "off",
          nextPath: ["rule", rule.id]
        }
      ]))
    };
  }

  if (appState.enginePath[0] === "rule") {
    const rule = getRuleById(appState.enginePath[1]);

    if (!rule) {
      return {
        title: "Rule",
        eyebrow: "Engine",
        status: "Regla no encontrada",
        items: [{ type: "element", variant: "text", label: "La regla seleccionada ya no existe." }]
      };
    }

    const items = [
      { type: "element", variant: "title", label: rule.title },
      { type: "element", variant: "text", label: rule.description },
      { type: "element", variant: "text", label: `match: ${rule.match.kind}${rule.match.value ? `=${rule.match.value}` : ""}` },
      { type: "element", variant: "text", label: `emit: ${rule.emit.type}` },
      { type: "button", label: rule.enabled ? "Disable rule" : "Enable rule", hint: `estado actual: ${rule.enabled ? "on" : "off"}`, kind: "command", command: { type: "toggle-rule", ruleId: rule.id } },
      { type: "button", label: "Move rule up", hint: `priority ${rule.priority}`, kind: "command", command: { type: "move-rule", ruleId: rule.id, direction: -1 } },
      { type: "button", label: "Move rule down", hint: `priority ${rule.priority}`, kind: "command", command: { type: "move-rule", ruleId: rule.id, direction: 1 } },
      { type: "button", label: "Rename rule", hint: "Cambiar etiqueta visible", kind: "command", command: { type: "rename-rule", ruleId: rule.id } }
    ];

    if (typeof rule.emit.limit === "number") {
      items.push({ type: "button", label: "Set limit", hint: `actual ${rule.emit.limit}`, kind: "command", command: { type: "set-rule-limit", ruleId: rule.id } });
    }

    return {
      title: "Detalle regla",
      eyebrow: "Engine",
      status: `rule id: ${rule.id}`,
      items
    };
  }

  return {
    title: "Engine",
    eyebrow: "Engine",
    status: "Fallback",
    items: []
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

    const button = createNode("button", "list-entry context-entry");
    button.type = "button";
    const activationKey = getActivationKey(options.scope, item);

    if (item.kind === "command") {
      button.classList.add("is-command");
    }

    if (item.selected || appState.armedButtons[options.scope] === activationKey) {
      button.classList.add("is-selected");
    }

    const main = createNode("span", "list-entry-main");
    main.append(createNode("span", "list-entry-label", item.label));

    if (item.hint) {
      main.append(createNode("span", "list-entry-hint", item.hint));
    }

    button.append(main);

    if (item.badge) {
      button.append(createNode("span", "entry-badge", item.badge));
    } else if (item.children?.length || item.nextPath) {
      button.append(createNode("span", "list-entry-chevron", ">"));
    }

    button.addEventListener("click", () => {
      const isArmed = appState.armedButtons[options.scope] === activationKey;

      if (!isArmed) {
        clearArmedButtons(options.scope);
        appState.armedButtons[options.scope] = activationKey;

        if (options.onPrepare) {
          options.onPrepare(item);
        }

        renderAll();
        return;
      }

      clearArmedButton(options.scope);
      options.onButton(item);
    });
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
  const shell = createNode("section", `widget-shell widget-shell-list context-widget-shell ${kind}-shell`);
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++appState.highestLayer);

  const card = createNode("article", "widget-card list-widget-card context-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", kind === "scene" ? "Scene" : kind === "composer" ? "Composer" : kind === "engine" ? "Engine" : "Input"));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", kind === "capture" ? "capture-body" : "widget-body list-widget-body context-body");

  if (kind === "capture") {
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
    shell.hidden = true;
    shell._refs = { titleNode, copyNode, inputNode, cancelButton, applyButton };
    cancelButton.addEventListener("click", closeCapture);
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

  const nav = createNode("div", "list-widget-nav");
  const back = createNode("button", "list-widget-back", "←");
  back.type = "button";
  const heading = createNode("div", "list-widget-heading");
  const eyebrow = createNode("p", "metric-label");
  const path = createNode("p", "list-widget-path");
  const status = createNode("p", "context-status");
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
  shell._refs.copyNode.textContent = appState.capture.description || "Usa la misma primitiva para introducir texto.";
  shell._refs.inputNode.placeholder = appState.capture.placeholder || "Escribe aqui";
  shell._refs.inputNode.value = appState.capture.initialValue;
  window.setTimeout(() => {
    shell._refs.inputNode.focus();
    shell._refs.inputNode.select();
  }, 0);
}

function moveSelectedItem(direction) {
  const context = getCurrentContext();
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
  recordAction("move-selected", item.label);
  renderAll();
}

function deleteSelectedItem() {
  const context = getCurrentContext();
  const index = context.items.findIndex((item) => item.id === appState.selectedId);

  if (index < 0) {
    return;
  }

  const [deleted] = context.items.splice(index, 1);
  appState.selectedId = context.items[Math.max(0, index - 1)]?.id ?? context.items[0]?.id ?? null;
  recordAction("delete-selected", deleted.label || deleted.variant);
  renderAll();
}

function toggleRule(ruleId) {
  const rule = getRuleById(ruleId);

  if (!rule) {
    return;
  }

  rule.enabled = !rule.enabled;
  recordAction("toggle-rule", rule.title, { ruleId });
  renderAll();
}

function moveRule(ruleId, direction) {
  const index = appState.rules.findIndex((rule) => rule.id === ruleId);

  if (index < 0) {
    return;
  }

  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= appState.rules.length) {
    return;
  }

  const [rule] = appState.rules.splice(index, 1);
  appState.rules.splice(nextIndex, 0, rule);
  appState.rules.forEach((entry, entryIndex) => {
    entry.priority = (entryIndex + 1) * 10;
  });
  recordAction("move-rule", rule.title, { ruleId });
  renderAll();
}

function executeSceneButton(item) {
  clearArmedButtons();
  appState.selectedId = item.id;

  if (item.children?.length) {
    appState.currentPath.push(item.id);
    const nextContext = getCurrentContext();
    appState.selectedId = nextContext.items.find((entry) => entry.type === "button")?.id ?? nextContext.items[0]?.id ?? null;
    recordAction("enter-children", item.label, { itemId: item.id });
    renderAll();
    return;
  }

  if (item.action) {
    recordAction("run-action", item.label, { action: item.action, itemId: item.id });
    showToast(`Accion ejecutada: ${item.action}`);
    renderAll();
    return;
  }

  recordAction("select-item", item.label, { itemId: item.id });
  renderAll();
}

function executeComposerCommand(command) {
  const selected = getSelectedItem();
  const context = getCurrentContext();

  if (!command) {
    return;
  }

  clearArmedButtons();

  if (command.type === "focus-visible-button") {
    const item = context.items.find((entry) => entry.id === command.itemId);

    if (!item) {
      return;
    }

    appState.selectedId = item.id;

    if (item.children?.length) {
      appState.currentPath.push(item.id);
      const nextContext = getCurrentContext();
      appState.selectedId = nextContext.items.find((entry) => entry.type === "button")?.id ?? nextContext.items[0]?.id ?? null;
      recordAction("predict-enter", item.label, { itemId: item.id });
    } else if (item.action) {
      recordAction("predict-action", item.label, { itemId: item.id, action: item.action });
      showToast(`Prediccion ejecutada: ${item.action}`);
    } else {
      recordAction("predict-select", item.label, { itemId: item.id });
    }

    renderAll();
    return;
  }

  if (command.type === "scene-back") {
    if (!appState.currentPath.length) {
      return;
    }

    const popped = appState.currentPath.pop();
    appState.selectedId = popped;
    recordAction("scene-back", "Volver nivel", { itemId: popped });
    renderAll();
    return;
  }

  if (command.type === "create-item") {
    const item = command.itemType === "button" ? createButtonItem() : createElementItem(command.itemType);
    context.items.push(item);
    appState.selectedId = item.id;
    recordAction("create-item", item.type === "button" ? item.label : item.variant, { itemId: item.id });
    renderAll();
    return;
  }

  if (command.type === "prompt-label" && selected) {
    openCapture({
      title: "Set label",
      description: "Editar texto sobre la misma base minima.",
      placeholder: selected.type === "button" ? "Nuevo button" : "Nuevo element",
      initialValue: selected.label,
      onSubmit: (value) => {
        selected.label = value || (selected.type === "button" ? "Nuevo button" : "Nuevo element");
        recordAction("set-label", selected.label, { itemId: selected.id });
      }
    });
    return;
  }

  if (command.type === "prompt-hint" && selected?.type === "button") {
    openCapture({
      title: "Set hint",
      description: "Actualizar el hint del nodo seleccionado.",
      placeholder: "Hint",
      initialValue: selected.hint,
      onSubmit: (value) => {
        selected.hint = value;
        recordAction("set-hint", selected.label, { itemId: selected.id });
      }
    });
    return;
  }

  if (command.type === "prompt-action" && selected?.type === "button") {
    openCapture({
      title: "Set action",
      description: "Actualizar la action del nodo seleccionado.",
      placeholder: "show-toast",
      initialValue: selected.action,
      onSubmit: (value) => {
        selected.action = value;
        recordAction("set-action", selected.label, { itemId: selected.id });
      }
    });
    return;
  }

  if (command.type === "enter-selected-children" && selected?.type === "button") {
    if (!Array.isArray(selected.children)) {
      selected.children = [];
    }

    appState.currentPath.push(selected.id);
    const nextContext = getCurrentContext();
    appState.selectedId = nextContext.items.find((entry) => entry.type === "button")?.id ?? nextContext.items[0]?.id ?? null;
    recordAction("enter-selected-children", selected.label, { itemId: selected.id });
    renderAll();
    return;
  }

  if (command.type === "duplicate-selected" && selected) {
    const index = context.items.findIndex((item) => item.id === selected.id);
    const clone = cloneItemWithFreshIds(selected);
    context.items.splice(index + 1, 0, clone);
    appState.selectedId = clone.id;
    recordAction("duplicate-selected", clone.label || clone.variant, { itemId: clone.id });
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

    recordAction("set-variant", command.variant, { itemId: selected.id });
    renderAll();
    return;
  }

  if (command.type === "save-local") {
    saveToLocalStorage();
    recordAction("save-local", "Guardar sistema");
    renderAll();
    return;
  }

  if (command.type === "load-local") {
    loadFromLocalStorage();
    return;
  }

  if (command.type === "download-json") {
    downloadJsonFile();
    recordAction("download-json", "Descargar JSON");
    renderAll();
    return;
  }

  if (command.type === "open-json-file") {
    openJsonFile();
    return;
  }

  if (command.type === "reset-sample") {
    setRules(defaultRules);
    setDefinition(defaultDefinition, "Sistema reiniciado al ejemplo");
    return;
  }
}

function executeEngineCommand(command) {
  if (!command) {
    return;
  }

  clearArmedButtons();

  if (command.type === "toggle-rule") {
    toggleRule(command.ruleId);
    return;
  }

  if (command.type === "move-rule") {
    moveRule(command.ruleId, command.direction);
    return;
  }

  if (command.type === "rename-rule") {
    const rule = getRuleById(command.ruleId);

    if (!rule) {
      return;
    }

    openCapture({
      title: "Rename rule",
      description: "Cambiar la etiqueta visible de una regla del motor.",
      placeholder: rule.title,
      initialValue: rule.title,
      onSubmit: (value) => {
        rule.title = value || rule.title;
        recordAction("rename-rule", rule.title, { ruleId: rule.id });
      }
    });
    return;
  }

  if (command.type === "set-rule-limit") {
    const rule = getRuleById(command.ruleId);

    if (!rule || typeof rule.emit.limit !== "number") {
      return;
    }

    openCapture({
      title: "Set limit",
      description: "Cuantos botones visibles debe anticipar esta regla.",
      placeholder: String(rule.emit.limit),
      initialValue: String(rule.emit.limit),
      onSubmit: (value) => {
        const parsed = Number.parseInt(value, 10);

        if (Number.isFinite(parsed) && parsed > 0) {
          rule.emit.limit = parsed;
          recordAction("set-rule-limit", rule.title, { ruleId: rule.id, limit: parsed });
        }
      }
    });
  }
}

function handleSceneItem(item) {
  executeSceneButton(item);
}

function prepareSceneItem(item) {
  clearArmedButtons("scene");
  appState.selectedId = item.id;
  recordAction("select-item", item.label, { itemId: item.id });
}

function handleComposerItem(item) {
  executeComposerCommand(item.command);
}

function prepareComposerItem(item) {
  clearArmedButtons("composer");

  if (item.command?.type === "focus-visible-button") {
    appState.selectedId = item.command.itemId;
    recordAction("arm-predicted-action", item.label, { itemId: item.command.itemId });
  }
}

function handleEngineItem(item) {
  if (item.nextPath) {
    appState.enginePath = [...item.nextPath];
    renderEngine();
    return;
  }

  executeEngineCommand(item.command);
}

function renderScene() {
  const snapshot = buildSnapshot();
  const view = buildSceneView(snapshot);
  renderListWidget(appState.widgets.scene, view, {
    scope: "scene",
    canGoBack: snapshot.canGoBack,
    onPrepare: prepareSceneItem,
    onButton: handleSceneItem
  });
}

function renderComposer() {
  const snapshot = buildSnapshot();
  const view = buildComposerView(snapshot);
  renderListWidget(appState.widgets.composer, view, {
    scope: "composer",
    canGoBack: false,
    onPrepare: prepareComposerItem,
    onButton: handleComposerItem
  });
}

function renderEngine() {
  const snapshot = buildSnapshot();
  const view = buildEngineView(snapshot);
  renderListWidget(appState.widgets.engine, view, {
    scope: "engine",
    canGoBack: appState.enginePath.length > 0,
    onButton: handleEngineItem
  });
}

function renderAll() {
  renderScene();
  renderComposer();
  renderEngine();
  renderCapture();
}

function buildWidgets() {
  appState.widgets.scene = buildShell("scene", { x: 28, y: 108 });
  appState.widgets.composer = buildShell("composer", { x: 352, y: 122 });
  appState.widgets.engine = buildShell("engine", { x: 692, y: 138 });
  appState.widgets.capture = buildShell("capture", { x: 430, y: 450 });

  appState.widgets.scene._refs.backNode.addEventListener("click", () => {
    if (!appState.currentPath.length) {
      return;
    }

    const popped = appState.currentPath.pop();
    appState.selectedId = popped;
    recordAction("scene-back", "Volver nivel", { itemId: popped });
    renderAll();
  });

  appState.widgets.composer._refs.backNode.hidden = true;

  appState.widgets.engine._refs.backNode.addEventListener("click", () => {
    if (!appState.enginePath.length) {
      return;
    }

    appState.enginePath.pop();
    renderEngine();
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
    setRules(parsed.rules ?? defaultRules);
    setDefinition(parsed.definition ?? defaultDefinition, "Sistema cargado desde archivo");
  } catch (error) {
    showToast(error.message || "No se pudo leer el archivo JSON");
  } finally {
    fileInput.value = "";
  }
});

setRules(defaultRules);
buildWidgets();
setDefinition(defaultDefinition, "Contextual composer listo");