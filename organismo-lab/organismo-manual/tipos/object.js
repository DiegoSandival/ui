import { createBlock, createInline, createNode, createObjectRows } from "./shared.js";

export const objectStyles = {
  plain(options = {}) {
    return createNode({
      type: "object",
      title: options.title || "objeto plano",
      caption: options.caption || "mapa simple",
      x: options.x ?? 210,
      y: options.y ?? 610,
      width: options.width ?? 280,
      body: [
        createObjectRows(
          options.entries || [
            ["id", "node-1"],
            ["type", "text"],
            ["value", "hola"]
          ]
        )
      ]
    });
  },

  grouped(options = {}) {
    return createNode({
      type: "object",
      title: options.title || "objeto agrupado",
      caption: options.caption || "subgrupos",
      x: options.x ?? 550,
      y: options.y ?? 620,
      width: options.width ?? 320,
      bodyClass: "data-stack",
      body: [
        createBlock([
          createInline("x", String(options.xValue ?? 120)),
          createInline("y", String(options.yValue ?? 80))
        ]),
        createBlock([
          createInline("visible", String(options.visible ?? true)),
          createInline("locked", String(options.locked ?? false))
        ])
      ]
    });
  }
};