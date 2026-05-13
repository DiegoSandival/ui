import { booleanStyles } from "./boolean.js";
import { listStyles } from "./list.js";
import { nullStyles } from "./null.js";
import { numberStyles } from "./number.js";
import { objectStyles } from "./object.js";
import { paragraphStyles } from "./paragraph.js";
import { stringStyles } from "./string.js";

export const styleLibrary = {
  number: numberStyles,
  string: stringStyles,
  paragraph: paragraphStyles,
  list: listStyles,
  object: objectStyles,
  boolean: booleanStyles,
  null: nullStyles
};

export function createNodeByType(type, styleName, options = {}) {
  const typeGroup = styleLibrary[type];
  const builder = typeGroup?.[styleName];

  if (!builder) {
    throw new Error(`No existe el estilo ${type}.${styleName}`);
  }

  return builder(options);
}

export function createShowcaseNodes() {
  return [
    createNodeByType("number", "simple"),
    createNodeByType("number", "pair"),
    createNodeByType("string", "short"),
    createNodeByType("string", "technical"),
    createNodeByType("paragraph", "block"),
    createNodeByType("paragraph", "note"),
    createNodeByType("list", "simple"),
    createNodeByType("list", "steps"),
    createNodeByType("object", "plain"),
    createNodeByType("object", "grouped"),
    createNodeByType("boolean", "flags"),
    createNodeByType("null", "empty")
  ];
}