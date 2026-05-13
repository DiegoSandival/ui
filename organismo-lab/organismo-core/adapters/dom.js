export const domAdapter = {
  name: "dom",

  async run(node, context) {
    const action = node.data?.action;

    if (action !== "renderMarkup") {
      context.log(`dom: accion desconocida ${action || "sin-nombre"}`);
      return;
    }

    const sourceText = context.resolveText(node.data.source);
    const mount = context.getMount(node.data.target);

    if (!mount) {
      context.log("dom: no se encontro el mount de destino");
      return;
    }

    mount.innerHTML = sourceText;
    context.log(`dom: renderMarkup -> ${node.data.target}`);
  }
};