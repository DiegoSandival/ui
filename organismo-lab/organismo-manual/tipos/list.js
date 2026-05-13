import { createItems, createNode } from "./shared.js";

export const listStyles = {
  simple(options = {}) {
    return createNode({
      type: "list",
      title: options.title || "lista simple",
      caption: options.caption || "items lineales",
      x: options.x ?? 890,
      y: options.y ?? 350,
      width: options.width ?? 250,
      body: [createItems(options.items || ["html", "css", "js"])]
    });
  },

  steps(options = {}) {
    return createNode({
      type: "list",
      title: options.title || "lista de pasos",
      caption: options.caption || "secuencia",
      x: options.x ?? 1170,
      y: options.y ?? 350,
      width: options.width ?? 260,
      body: [createItems(options.items || ["crear nodo", "enlazar nodo", "activar adaptador"], true)]
    });
  }
};