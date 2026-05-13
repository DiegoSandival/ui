function appendChildren(parent, children) {
  const list = Array.isArray(children) ? children : [children];

  list.filter(Boolean).forEach((child) => {
    parent.append(child);
  });
}

export function el(tagName, className = "", text = "") {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

export function createNode({ type, title, caption = "", x = 0, y = 0, width = 220, body = [], bodyClass = "" }) {
  const node = document.createElement("article");
  const head = el("header", "node-head");
  const tag = el("span", "node-tag", type);
  const content = el("div", bodyClass ? `node-body ${bodyClass}` : "node-body");
  const heading = el("h3", "", title);
  const meta = el("p", "", caption);

  node.className = "node";
  node.dataset.draggable = "";
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.width = `${width}px`;

  head.dataset.handle = "";
  head.append(tag);

  content.append(heading);
  appendChildren(content, body);

  if (caption) {
    content.append(meta);
  }

  node.append(head, content);
  return node;
}

export function createInline(label, value, valueClass = "") {
  const row = el("div", "data-inline");
  const key = el("strong", "", label);
  const text = el("span", valueClass, value);

  row.append(key, text);
  return row;
}

export function createParagraph(text, className = "data-paragraph") {
  return el("div", className, text);
}

export function createItems(items, ordered = false) {
  const list = el("div", ordered ? "data-list data-ordered" : "data-list");

  items.forEach((item, index) => {
    const entry = el("div", "data-item");

    if (ordered) {
      entry.append(el("strong", "", String(index + 1)), el("span", "", item));
    } else {
      entry.textContent = item;
    }

    list.append(entry);
  });

  return list;
}

export function createObjectRows(entries) {
  const wrapper = el("div", "data-object");

  entries.forEach(([key, value]) => {
    const row = el("div", "data-row");
    row.append(el("span", "data-key", key), el("span", "", value));
    wrapper.append(row);
  });

  return wrapper;
}

export function createBlock(children) {
  const block = el("div", "data-block");
  appendChildren(block, children);
  return block;
}

export function createPills(items) {
  const wrapper = el("div", "data-pills");

  items.forEach((item) => {
    wrapper.append(el("span", "data-pill", item));
  });

  return wrapper;
}

export function createEmpty(text = "null") {
  return el("div", "data-empty", text);
}