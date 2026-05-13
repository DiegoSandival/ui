import { createEmpty, createNode } from "./shared.js";

export const nullStyles = {
  empty(options = {}) {
    return createNode({
      type: "null",
      title: options.title || "valor vacio",
      caption: options.caption || "ausencia explicita",
      x: options.x ?? 1180,
      y: options.y ?? 620,
      width: options.width ?? 240,
      bodyClass: "data-stack",
      body: [createEmpty(options.value || "null")]
    });
  }
};