const stage = document.querySelector("#stage");
const toolbar = document.querySelector(".toolbar");
const toastStack = document.querySelector("#toast-stack");

const listWidgetPresets = {
  navigator: {
    title: "Mapa raiz",
    items: [
      { type: "element", variant: "title", label: "Explorar" },
      { type: "button", label: "Inicio", hint: "Accion directa", action: "open-home" },
      {
        type: "button",
        label: "Biblioteca",
        hint: "Abrir sublista",
        children: [
          { type: "element", variant: "title", label: "Colecciones" },
          { type: "button", label: "Controles", hint: "Botones, toggles, inputs", action: "show-controls" },
          { type: "button", label: "Media", hint: "Imagenes y previews", action: "show-media" },
          { type: "element", variant: "separator" },
          {
            type: "button",
            label: "Anidar mas",
            hint: "Tercer nivel",
            children: [
              { type: "element", variant: "title", label: "Nivel 3" },
              { type: "button", label: "Crear otra lista", hint: "Spawnea un widget", action: "spawn-actions" },
              { type: "button", label: "Duplicar esta lista", hint: "Clona el widget actual", action: "duplicate-widget" }
            ]
          }
        ]
      },
      { type: "element", variant: "separator" },
      { type: "element", variant: "text", label: "Los items button pueden abrir otra lista o disparar una accion." },
      {
        type: "button",
        label: "Ajustes",
        hint: "Configuraciones rapidas",
        children: [
          { type: "element", variant: "title", label: "Tema" },
          { type: "button", label: "Neutro", hint: "Feedback visual", action: "apply-neutral" },
          { type: "button", label: "Mover widget", hint: "Accion utilitaria", action: "randomize-position" }
        ]
      }
    ]
  },
  actions: {
    title: "Lista acciones",
    items: [
      { type: "element", variant: "title", label: "Comandos" },
      { type: "button", label: "Sincronizar", hint: "Ejecuta callback mock", action: "run-sync" },
      { type: "button", label: "Nuevo navegador", hint: "Crear otro widget", action: "spawn-navigator" },
      { type: "button", label: "Duplicar", hint: "Clona esta instancia", action: "duplicate-widget" },
      { type: "element", variant: "separator" },
      {
        type: "button",
        label: "Estados",
        hint: "Abrir sublista",
        children: [
          { type: "element", variant: "title", label: "Estados de fila" },
          { type: "button", label: "Toast corto", hint: "Notificacion breve", action: "show-toast-short" },
          { type: "button", label: "Toast largo", hint: "Mensaje extendido", action: "show-toast-long" },
          { type: "element", variant: "text", label: "Este nivel muestra como mezclar nodos de contenido y nodos de accion." }
        ]
      }
    ]
  }
};

const widgetBlueprints = {
  navigator: { x: 28, y: 108 },
  actions: { x: 320, y: 132 }
};

let highestLayer = 20;
const widgetCount = new Map();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastStack.append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2200);
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

function getSpawnPosition(type) {
  const base = widgetBlueprints[type] ?? { x: 40, y: 120 };
  const repetitions = widgetCount.get(type) ?? 0;
  const offset = repetitions * 20;

  return {
    x: base.x + offset,
    y: base.y + offset
  };
}

function executeAction(actionName, context) {
  const actions = {
    "open-home": () => showToast("Accion ejecutada: abrir inicio"),
    "show-controls": () => showToast("Accion ejecutada: abrir coleccion de controles"),
    "show-media": () => showToast("Accion ejecutada: mostrar media"),
    "apply-neutral": () => showToast("Tema neutro ya activo"),
    "run-sync": () => showToast("Sincronizacion simulada completada"),
    "show-toast-short": () => showToast("Toast corto"),
    "show-toast-long": () => showToast("Este boton ejecuta una accion mientras el resto del widget sigue navegando por niveles."),
    "spawn-navigator": () => buildListWidget("navigator", getSpawnPosition("navigator")),
    "spawn-actions": () => buildListWidget("actions", getSpawnPosition("actions")),
    "duplicate-widget": () => buildListWidget(context.shell.dataset.presetKey, getSpawnPosition(context.shell.dataset.presetKey)),
    "randomize-position": () => {
      const maxX = Math.max(0, stage.clientWidth - context.shell.offsetWidth);
      const maxY = Math.max(0, stage.clientHeight - context.shell.offsetHeight);
      const nextX = Math.round(Math.random() * maxX);
      const nextY = Math.round(Math.random() * maxY);

      context.shell.style.left = `${nextX}px`;
      context.shell.style.top = `${nextY}px`;
      showToast("Widget reposicionado" );
    }
  };

  const handler = actions[actionName];

  if (!handler) {
    showToast(`Accion no registrada: ${actionName}`);
    return;
  }

  handler();
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

function renderCurrentList(shell) {
  const state = shell._listState;
  const currentLevel = state.stack[state.stack.length - 1];

  state.itemsNode.replaceChildren();
  state.pathNode.textContent = state.path.join(" / ");
  state.backNode.hidden = state.stack.length === 1;

  for (const item of currentLevel.items) {
    if (item.type === "element") {
      state.itemsNode.append(createElementRow(item));
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
      button.classList.add("has-children");
      button.append(createNode("span", "list-entry-chevron", ">"));
    }

    button.addEventListener("click", () => {
      if (item.children?.length) {
        state.stack.push({ title: item.label, items: item.children });
        state.path.push(item.label);
        renderCurrentList(shell);
        return;
      }

      if (item.action) {
        executeAction(item.action, { shell, item, state });
      }
    });

    state.itemsNode.append(button);
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
    shell.style.zIndex = String(++highestLayer);
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

function buildListWidget(presetKey, position) {
  const preset = listWidgetPresets[presetKey];

  if (!preset) {
    throw new Error(`Unknown preset: ${presetKey}`);
  }

  const shell = createNode("section", "widget-shell widget-shell-list");
  shell.dataset.presetKey = presetKey;
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++highestLayer);

  const count = (widgetCount.get(presetKey) ?? 0) + 1;
  widgetCount.set(presetKey, count);

  const card = createNode("article", "widget-card list-widget-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", `Lista ${count}`));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "widget-body list-widget-body");
  const nav = createNode("div", "list-widget-nav");
  const back = createNode("button", "list-widget-back", "←");
  back.type = "button";
  back.hidden = true;

  const heading = createNode("div", "list-widget-heading");
  heading.append(createNode("p", "metric-label", preset.title));
  const path = createNode("p", "list-widget-path", preset.title);
  heading.append(path);

  nav.append(back, heading);

  const itemsNode = createNode("div", "list-items");
  body.append(nav, itemsNode);
  card.append(grip, body);
  shell.append(card);

  shell._listState = {
    stack: [{ title: preset.title, items: deepClone(preset.items) }],
    path: [preset.title],
    backNode: back,
    pathNode: path,
    itemsNode
  };

  back.addEventListener("click", () => {
    const state = shell._listState;

    if (state.stack.length === 1) {
      return;
    }

    state.stack.pop();
    state.path.pop();
    renderCurrentList(shell);
  });

  renderCurrentList(shell);
  enableDragging(shell);
  stage.append(shell);
  return shell;
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-widget]");

  if (!button) {
    return;
  }

  const presetKey = button.dataset.addWidget;
  buildListWidget(presetKey, getSpawnPosition(presetKey));
});

buildListWidget("navigator", getSpawnPosition("navigator"));
buildListWidget("actions", getSpawnPosition("actions"));