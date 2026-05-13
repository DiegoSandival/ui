const stage = document.querySelector("#stage");

const state = [
  {
    id: "boolean",
    type: "boolean",
    x: 170,
    y: 140,
    width: 160,
    value: true
  },
  {
    id: "string",
    type: "string",
    x: 430,
    y: 160,
    width: 220,
    value: "organismo"
  },
  {
    id: "number",
    type: "number",
    x: 740,
    y: 160,
    width: 190,
    value: 42
  },
  {
    id: "null",
    type: "null",
    x: 1030,
    y: 150,
    width: 150,
    value: null
  },
  {
    id: "array",
    type: "array",
    x: 280,
    y: 420,
    width: 278,
    value: ["html", "css", "js"]
  },
  {
    id: "object",
    type: "object",
    x: 760,
    y: 430,
    width: 308,
    value: {
      id: "node-1",
      mode: "text",
      value: "hola"
    }
  }
];

function el(tagName, className = "", text = "") {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function createShell(entry) {
  const root = el("article", "datum");
  const grip = el("div", "datum-grip");
  const body = el("div", "datum-body");

  root.dataset.draggable = "";
  root.dataset.id = entry.id;
  root.style.left = `${entry.x}px`;
  root.style.top = `${entry.y}px`;
  root.style.width = `${entry.width}px`;
  grip.dataset.handle = "";
  root.append(grip, body);

  return { root, body };
}

function renderBoolean(entry) {
  const { root, body } = createShell(entry);
  const wrap = el("div", "switch");
  const track = el("button", `switch-track${entry.value ? " is-on" : ""}`);
  const thumb = el("span", "switch-thumb");

  track.type = "button";
  track.setAttribute("aria-label", String(entry.value));
  track.append(thumb);
  track.addEventListener("click", () => {
    entry.value = !entry.value;
    render();
  });

  wrap.append(track);
  body.append(wrap);
  return root;
}

function renderString(entry) {
  const { root, body } = createShell(entry);
  const input = document.createElement("textarea");

  input.className = "field string-text";
  input.value = entry.value;
  input.addEventListener("input", () => {
    entry.value = input.value;
  });

  body.append(input);
  return root;
}

function renderNumber(entry) {
  const { root, body } = createShell(entry);
  const row = el("div", "number-wrap");
  const input = document.createElement("input");

  input.className = "field";
  input.type = "number";
  input.value = String(entry.value);
  input.addEventListener("input", () => {
    entry.value = Number(input.value || 0);
  });

  row.append(input);
  body.append(row);
  return root;
}

function renderNull(entry) {
  const { root, body } = createShell(entry);
  const wrap = el("div", "null-wrap");
  const chip = el("div", "null-chip", String(entry.value));

  wrap.append(chip);
  body.append(wrap);
  return root;
}

function renderArray(entry) {
  const { root, body } = createShell(entry);
  const list = el("div", "array");
  const actions = el("div", "datum-actions");
  const add = el("button", "icon-button", "+");

  entry.value.forEach((item, index) => {
    const row = el("div", "array-item");
    const input = document.createElement("input");
    const remove = el("button", "icon-button", "-");

    input.className = "field";
    input.value = item;
    input.addEventListener("input", () => {
      entry.value[index] = input.value;
    });

    remove.type = "button";
    remove.addEventListener("click", () => {
      entry.value.splice(index, 1);
      render();
    });

    row.append(input, remove);
    list.append(row);
  });

  add.type = "button";
  add.addEventListener("click", () => {
    entry.value.push("");
    render();
  });

  actions.append(add);
  body.append(list, actions);
  return root;
}

function renderObject(entry) {
  const { root, body } = createShell(entry);
  const rows = el("div", "object");
  const actions = el("div", "datum-actions");
  const add = el("button", "icon-button", "+");

  Object.entries(entry.value).forEach(([key, value]) => {
    const row = el("div", "object-row");
    const keyInput = document.createElement("input");
    const valueInput = document.createElement("input");
    const remove = el("button", "icon-button", "-");

    keyInput.className = "field";
    valueInput.className = "field";
    keyInput.value = key;
    valueInput.value = String(value);

    keyInput.addEventListener("change", () => {
      const nextKey = keyInput.value.trim();
      const nextValue = entry.value[key];

      if (!nextKey || nextKey === key) {
        keyInput.value = key;
        return;
      }

      delete entry.value[key];
      entry.value[nextKey] = nextValue;
      render();
    });

    valueInput.addEventListener("input", () => {
      entry.value[key] = valueInput.value;
    });

    remove.type = "button";
    remove.addEventListener("click", () => {
      delete entry.value[key];
      render();
    });

    row.append(keyInput, valueInput, remove);
    rows.append(row);
  });

  add.type = "button";
  add.addEventListener("click", () => {
    let suffix = 1;
    let nextKey = `key${suffix}`;

    while (Object.hasOwn(entry.value, nextKey)) {
      suffix += 1;
      nextKey = `key${suffix}`;
    }

    entry.value[nextKey] = "";
    render();
  });

  actions.append(add);
  body.append(rows, actions);
  return root;
}

function renderDatum(entry) {
  if (entry.type === "boolean") {
    return renderBoolean(entry);
  }

  if (entry.type === "string") {
    return renderString(entry);
  }

  if (entry.type === "number") {
    return renderNumber(entry);
  }

  if (entry.type === "null") {
    return renderNull(entry);
  }

  if (entry.type === "array") {
    return renderArray(entry);
  }

  return renderObject(entry);
}

function bindDrag() {
  const items = stage.querySelectorAll("[data-draggable]");

  items.forEach((item) => {
    const handle = item.querySelector("[data-handle]") || item;

    if (handle.dataset.dragBound === "true") {
      return;
    }

    handle.dataset.dragBound = "true";
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialCenterX = itemRect.left - stageRect.left + itemRect.width / 2 + stage.scrollLeft;
      const initialCenterY = itemRect.top - stageRect.top + itemRect.height / 2 + stage.scrollTop;

      item.classList.add("is-dragging");

      if (typeof handle.setPointerCapture === "function") {
        handle.setPointerCapture(event.pointerId);
      }

      const onPointerMove = (moveEvent) => {
        const nextX = Math.round(initialCenterX + (moveEvent.clientX - startX));
        const nextY = Math.round(initialCenterY + (moveEvent.clientY - startY));
        const entry = state.find((candidate) => candidate.id === item.dataset.id);

        item.style.left = `${nextX}px`;
        item.style.top = `${nextY}px`;

        if (entry) {
          entry.x = nextX;
          entry.y = nextY;
        }
      };

      const stopDragging = () => {
        item.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stopDragging);
        window.removeEventListener("pointercancel", stopDragging);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDragging, { once: true });
      window.addEventListener("pointercancel", stopDragging, { once: true });
    });
  });
}

function render() {
  stage.replaceChildren(...state.map(renderDatum));
  bindDrag();
}

render();