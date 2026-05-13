import { createInline, createNode, el } from "./shared.js";

export const numberStyles = {
  simple(options = {}) {
    const value = el("div", "data-number", options.value || "108");
    return createNode({
      type: "number",
      title: options.title || "numero",
      caption: options.caption || "numero simple",
      x: options.x ?? 170,
      y: options.y ?? 130,
      width: options.width ?? 170,
      body: [value]
    });
  },

  pair(options = {}) {
    return createNode({
      type: "number",
      title: options.title || "medidas",
      caption: options.caption || "par clave valor",
      x: options.x ?? 400,
      y: options.y ?? 130,
      width: options.width ?? 210,
      bodyClass: "data-stack",
      body: [
        createInline("ancho", String(options.widthValue ?? 320)),
        createInline("alto", String(options.heightValue ?? 240))
      ]
    });
  }
};