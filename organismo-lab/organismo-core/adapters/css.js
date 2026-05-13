export const cssAdapter = {
  name: "css",

  async run(node, context) {
    const action = node.data?.action;

    if (action !== "applyStylesheet") {
      context.log(`css: accion desconocida ${action || "sin-nombre"}`);
      return;
    }

    const cssText = context.resolveText(node.data.source);
    const styleElement = context.runtime.styleElement || document.createElement("style");

    styleElement.dataset.scope = "organismo-core";
    styleElement.textContent = cssText;

    if (!styleElement.isConnected) {
      document.head.append(styleElement);
    }

    context.runtime.styleElement = styleElement;
    context.log(`css: applyStylesheet -> ${node.data.target}`);
  }
};