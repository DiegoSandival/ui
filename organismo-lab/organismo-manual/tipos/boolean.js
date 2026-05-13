import { createNode, createPills } from "./shared.js";

export const booleanStyles = {
  flags(options = {}) {
    return createNode({
      type: "boolean",
      title: options.title || "flags",
      caption: options.caption || "estado binario",
      x: options.x ?? 900,
      y: options.y ?? 620,
      width: options.width ?? 270,
      bodyClass: "data-stack",
      body: [createPills(options.items || ["visible: true", "open: false", "dirty: true"])]
    });
  }
};