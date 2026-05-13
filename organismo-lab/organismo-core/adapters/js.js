export const jsAdapter = {
  name: "js",

  async run(node, context) {
    const action = node.data?.action;

    if (action !== "runScript") {
      context.log(`js: accion desconocida ${action || "sin-nombre"}`);
      return;
    }

    const sourceText = context.resolveText(node.data.source);
    const mount = context.getMount(node.data.target);

    if (!mount) {
      context.log("js: no se encontro el mount de destino");
      return;
    }

    const api = {
      mount,
      log: context.log,
      getNode: context.getNode,
      getText: context.resolveText,
      replaceHtml(markup) {
        mount.innerHTML = markup;
      }
    };

    const run = new Function("api", "graph", "runtime", sourceText);
    await run(api, context.graph, context.runtime);
    context.log(`js: runScript -> ${node.data.target}`);
  }
};