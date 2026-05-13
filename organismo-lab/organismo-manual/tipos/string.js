import { createInline, createNode } from "./shared.js";

export const stringStyles = {
  short(options = {}) {
    return createNode({
      type: "string",
      title: options.title || "organismo-core",
      caption: options.caption || "string corta",
      x: options.x ?? 680,
      y: options.y ?? 130,
      width: options.width ?? 230
    });
  },

  technical(options = {}) {
    return createNode({
      type: "string",
      title: options.title || "identificadores",
      caption: options.caption || "string tecnica",
      x: options.x ?? 950,
      y: options.y ?? 140,
      width: options.width ?? 260,
      bodyClass: "data-stack",
      body: [
        createInline("path", options.path || "adapters/dom/render", "data-code"),
        createInline("token", options.token || "node:editor-html", "data-code")
      ]
    });
  }
};