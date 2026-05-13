import { createInline, createNode, createParagraph } from "./shared.js";

export const paragraphStyles = {
  block(options = {}) {
    return createNode({
      type: "paragraph",
      title: options.title || "descripcion",
      caption: options.caption || "bloque de texto",
      x: options.x ?? 210,
      y: options.y ?? 340,
      width: options.width ?? 280,
      body: [
        createParagraph(
          options.text || "El nucleo interpreta relaciones y delega la ejecucion a adaptadores externos."
        )
      ]
    });
  },

  note(options = {}) {
    return createNode({
      type: "paragraph",
      title: options.title || "nota",
      caption: options.caption || "nota expandida",
      x: options.x ?? 540,
      y: options.y ?? 340,
      width: options.width ?? 300,
      bodyClass: "data-stack",
      body: [
        createParagraph(
          options.text || "Este nodo sirve para comentarios largos, narrativa o documentacion interna.",
          "data-paragraph data-muted-block"
        ),
        createInline("modo", options.mode || "nota expandida")
      ]
    });
  }
};