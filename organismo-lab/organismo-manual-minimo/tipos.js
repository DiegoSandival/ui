import { initDrag } from "./drag-module.js";

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

function appendChildren(parent, children) {
  const list = Array.isArray(children) ? children : [children];

  list.filter(Boolean).forEach((child) => {
    parent.append(child);
  });
}

function createNode({ type, x = 0, y = 0, width, children = [] }) {
  const node = el("article", "node");

  node.dataset.draggable = "";
  node.dataset.type = type;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  if (width) {
    node.style.width = `${width}px`;
  }

  appendChildren(node, children);
  return node;
}

function createRow(key, value, valueClass = "") {
  const row = el("div", "minimal-row");
  const keyNode = el("span", "minimal-key", key);
  const valueNode = el("span", valueClass, value);

  row.append(keyNode, valueNode);
  return row;
}

function createNumberNodes() {
  return [
    createNode({
      type: "number",
      x: 170,
      y: 130,
      children: [el("div", "minimal-text", "108")]
    }),
    createNode({
      type: "number",
      x: 400,
      y: 130,
      children: [
        el("div", "minimal-pair", ""),
      ]
    })
  ];
}

function createPairNode() {
  const pair = el("div", "minimal-pair");
  pair.append(createRow("ancho", "320"), createRow("alto", "240"));

  return createNode({
    type: "number",
    x: 400,
    y: 130,
    children: [pair]
  });
}

function createStringNodes() {
  return [
    createNode({
      type: "string",
      x: 680,
      y: 130,
      children: [el("div", "minimal-text", "organismo-core")]
    }),
    createNode({
      type: "string",
      x: 950,
      y: 140,
      children: [
        createRow("path", "adapters/dom/render", "minimal-code"),
        createRow("token", "node:editor-html", "minimal-code")
      ]
    })
  ];
}

function createParagraphNodes() {
  return [
    createNode({
      type: "paragraph",
      x: 210,
      y: 340,
      width: 280,
      children: [
        el(
          "p",
          "minimal-paragraph",
          "El nucleo interpreta relaciones y delega la ejecucion a adaptadores externos."
        )
      ]
    }),
    createNode({
      type: "paragraph",
      x: 540,
      y: 340,
      width: 300,
      children: [
        el(
          "p",
          "minimal-paragraph",
          "Este nodo sirve para comentarios largos, narrativa o documentacion interna."
        ),
        createRow("modo", "nota expandida")
      ]
    })
  ];
}

function createList(items) {
  const list = el("ul", "minimal-list");

  items.forEach((item) => {
    list.append(el("li", "", item));
  });

  return list;
}

function createListNodes() {
  return [
    createNode({
      type: "list",
      x: 890,
      y: 350,
      children: [createList(["html", "css", "js"])]
    }),
    createNode({
      type: "list",
      x: 1170,
      y: 350,
      children: [createList(["crear nodo", "enlazar nodo", "activar adaptador"])]
    })
  ];
}

function createObject(entries) {
  const objectNode = el("div", "minimal-object");

  entries.forEach(([key, value]) => {
    objectNode.append(createRow(key, value));
  });

  return objectNode;
}

function createObjectNodes() {
  return [
    createNode({
      type: "object",
      x: 210,
      y: 610,
      children: [
        createObject([
          ["id", "node-1"],
          ["type", "text"],
          ["value", "hola"]
        ])
      ]
    }),
    createNode({
      type: "object",
      x: 550,
      y: 620,
      children: [
        createObject([
          ["x", "120"],
          ["y", "80"],
          ["visible", "true"],
          ["locked", "false"]
        ])
      ]
    })
  ];
}

function shouldIgnoreToggleClick(button) {
  const node = button.closest("[data-draggable]");
  return node?.dataset.dragJustEnded === "true";
}

function createToggle(label, checked) {
  const wrapper = el("div", "minimal-toggle");
  const button = document.createElement("button");
  const text = el("span", "minimal-toggle-label", label);
  let pointerStarted = false;

  button.type = "button";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(checked));
  button.setAttribute("aria-label", label);

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    pointerStarted = true;
  });

  button.addEventListener("pointerup", (event) => {
    if (event.button !== 0 || !pointerStarted) {
      return;
    }

    pointerStarted = false;

    if (shouldIgnoreToggleClick(button)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const nextValue = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(nextValue));
  });

  button.addEventListener("pointercancel", () => {
    pointerStarted = false;
  });

  wrapper.append(button, text);
  return wrapper;
}

function createBooleanNode() {
  const set = el("div", "minimal-toggle-set");
  set.append(createToggle("visible", true), createToggle("open", false), createToggle("dirty", true));

  return createNode({
    type: "boolean",
    x: 900,
    y: 620,
    children: [set]
  });
}

function createNullNode() {
  return createNode({
    type: "null",
    x: 1180,
    y: 620,
    children: [el("div", "minimal-null", "null")]
  });
}

function createShowcaseNodes() {
  return [
    createNode({
      type: "number",
      x: 170,
      y: 130,
      children: [el("div", "minimal-text", "108")]
    }),
    createPairNode(),
    ...createStringNodes(),
    ...createParagraphNodes(),
    ...createListNodes(),
    ...createObjectNodes(),
    createBooleanNode(),
    createNullNode()
  ];
}

const canvas = document.querySelector("#canvas");

if (canvas) {
  canvas.replaceChildren(...createShowcaseNodes());
  initDrag(canvas);
}