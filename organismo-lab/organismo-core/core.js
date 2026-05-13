import { domAdapter } from "./adapters/dom.js";
import { cssAdapter } from "./adapters/css.js";
import { jsAdapter } from "./adapters/js.js";

const DEFAULT_GRAPH = {
  root: "app",
  nodes: [
    {
      id: "app",
      kind: "space",
      label: "organismo core",
      position: { x: 110, y: 120 },
      data: {
        description: "nucleo fijo que solo interpreta datos"
      }
    },
    {
      id: "boot",
      kind: "thread",
      label: "boot",
      position: { x: 340, y: 120 },
      data: {
        description: "reproduce la idea de thread sobre grafo"
      }
    },
    {
      id: "preview-root",
      kind: "component",
      label: "preview",
      position: { x: 600, y: 120 },
      data: {
        adapter: "dom",
        mount: "preview-surface"
      }
    },
    {
      id: "html-source",
      kind: "text",
      label: "editor html",
      position: { x: 110, y: 330 },
      data: {
        text: "<section class=\"card\"><h1>Organismo Core</h1><p>El grafo describe la vista. Los adaptadores usan la tecnologia existente.</p><button data-action=\"ping\">probar evento</button></section>"
      }
    },
    {
      id: "css-source",
      kind: "text",
      label: "editor css",
      position: { x: 340, y: 330 },
      data: {
        text: "#preview-surface .card { border-color: rgba(126, 214, 165, 0.36); }\n#preview-surface h1 { margin: 0 0 10px; color: #7ed6a5; }\n#preview-surface p { color: #d8e3ef; line-height: 1.5; }\n#preview-surface button { min-height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: #7ed6a5; color: #122018; cursor: pointer; }"
      }
    },
    {
      id: "js-source",
      kind: "text",
      label: "editor js",
      position: { x: 600, y: 330 },
      data: {
        text: "api.log('js listo');\nconst button = api.mount.querySelector('[data-action=\\\"ping\\\"]');\nif (button) {\n  button.onclick = () => {\n    button.textContent = 'latido';\n    api.log('evento desde el nodo js');\n  };\n}"
      }
    },
    {
      id: "apply-html",
      kind: "action",
      label: "aplicar html",
      position: { x: 110, y: 540 },
      data: {
        adapter: "dom",
        action: "renderMarkup",
        source: "html-source",
        target: "preview-root"
      }
    },
    {
      id: "apply-css",
      kind: "action",
      label: "aplicar css",
      position: { x: 340, y: 540 },
      data: {
        adapter: "css",
        action: "applyStylesheet",
        source: "css-source",
        target: "preview-root"
      }
    },
    {
      id: "run-js",
      kind: "action",
      label: "ejecutar js",
      position: { x: 600, y: 540 },
      data: {
        adapter: "js",
        action: "runScript",
        source: "js-source",
        target: "preview-root"
      }
    }
  ],
  edges: [
    { from: "app", to: "boot", type: "contains" },
    { from: "app", to: "preview-root", type: "contains" },
    { from: "app", to: "html-source", type: "contains" },
    { from: "app", to: "css-source", type: "contains" },
    { from: "app", to: "js-source", type: "contains" },
    { from: "app", to: "apply-html", type: "contains" },
    { from: "app", to: "apply-css", type: "contains" },
    { from: "app", to: "run-js", type: "contains" },
    { from: "html-source", to: "apply-html", type: "feeds" },
    { from: "css-source", to: "apply-css", type: "feeds" },
    { from: "js-source", to: "run-js", type: "feeds" },
    { from: "apply-html", to: "preview-root", type: "targets" },
    { from: "apply-css", to: "preview-root", type: "targets" },
    { from: "run-js", to: "preview-root", type: "targets" },
    { from: "boot", to: "apply-html", type: "flow", order: 1 },
    { from: "boot", to: "apply-css", type: "flow", order: 2 },
    { from: "boot", to: "run-js", type: "flow", order: 3 }
  ]
};

const adapters = {
  dom: domAdapter,
  css: cssAdapter,
  js: jsAdapter
};

const state = {
  graph: null,
  nodesById: new Map(),
  selectedNodeId: null,
  logLines: [],
  status: "listo",
  runtime: {
    styleElement: null
  }
};

const elements = {
  graphNodes: document.querySelector("#graph-nodes"),
  graphLines: document.querySelector("#graph-lines"),
  inspector: document.querySelector("#inspector"),
  preview: document.querySelector("#preview-surface"),
  runtimeLog: document.querySelector("#runtime-log"),
  runtimeStatus: document.querySelector("#runtime-status"),
  runBoot: document.querySelector('[data-command="run-boot"]'),
  downloadJson: document.querySelector('[data-command="download-json"]')
};

async function loadGraph() {
  try {
    const response = await fetch(new URL("./graph.json", import.meta.url));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log(`graph.json no estuvo disponible, usando copia embebida (${error.message})`);
    return structuredClone(DEFAULT_GRAPH);
  }
}

function indexGraph(graph) {
  state.graph = graph;
  state.nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  state.selectedNodeId = graph.root;
}

function getNode(nodeId) {
  return state.nodesById.get(nodeId) || null;
}

function getEdges(edgeType = null) {
  return (state.graph?.edges || []).filter((edge) => !edgeType || edge.type === edgeType);
}

function getOutgoing(nodeId, edgeType = null) {
  return getEdges(edgeType)
    .filter((edge) => edge.from === nodeId)
    .sort((left, right) => (left.order || 0) - (right.order || 0));
}

function resolveText(nodeId) {
  const node = getNode(nodeId);
  return typeof node?.data?.text === "string" ? node.data.text : "";
}

function getMount(nodeId) {
  const node = getNode(nodeId);
  const mountId = node?.data?.mount;
  return mountId ? document.getElementById(mountId) : elements.preview;
}

function setStatus(value) {
  state.status = value;
  elements.runtimeStatus.textContent = value;
}

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  state.logLines.unshift(`[${timestamp}] ${message}`);
  state.logLines = state.logLines.slice(0, 18);
  elements.runtimeLog.textContent = state.logLines.join("\n");
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId;
  renderGraph();
  renderInspector();
}

function getNodeSummary(node) {
  if (typeof node?.data?.text === "string") {
    return node.data.text.slice(0, 86);
  }

  if (typeof node?.data?.action === "string") {
    return `${node.data.adapter}:${node.data.action}`;
  }

  return node?.data?.description || "sin datos";
}

function renderGraph() {
  const nodes = state.graph?.nodes || [];
  const edges = state.graph?.edges || [];

  elements.graphNodes.replaceChildren();
  elements.graphLines.replaceChildren();

  edges.forEach((edge) => {
    const from = getNode(edge.from);
    const to = getNode(edge.to);

    if (!from || !to) {
      return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "graph-line");
    line.setAttribute("x1", String(from.position.x));
    line.setAttribute("y1", String(from.position.y));
    line.setAttribute("x2", String(to.position.x));
    line.setAttribute("y2", String(to.position.y));
    elements.graphLines.append(line);
  });

  nodes.forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "graph-node";
    button.dataset.kind = node.kind;
    button.style.left = `${node.position.x}px`;
    button.style.top = `${node.position.y}px`;
    button.classList.toggle("is-selected", node.id === state.selectedNodeId);

    const label = document.createElement("strong");
    label.textContent = node.label;

    const meta = document.createElement("span");
    meta.className = "node-meta";
    meta.textContent = `${node.kind} · ${node.id}`;

    const summary = document.createElement("small");
    summary.textContent = getNodeSummary(node);

    button.append(label, meta, summary);
    button.addEventListener("click", () => {
      selectNode(node.id);
    });
    button.addEventListener("dblclick", async () => {
      await executeNode(node.id);
    });

    elements.graphNodes.append(button);
  });
}

function renderInspector() {
  const node = getNode(state.selectedNodeId);
  const wrapper = document.createDocumentFragment();

  if (!node) {
    elements.inspector.textContent = "sin seleccion";
    return;
  }

  const title = document.createElement("h3");
  title.textContent = node.label;

  const meta = document.createElement("p");
  meta.className = "inspector-meta";
  meta.textContent = `${node.kind} · ${node.id}`;

  wrapper.append(title, meta);

  if (typeof node.data?.text === "string") {
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = "Este nodo se edita como datos. El nucleo no cambia.";

    const textarea = document.createElement("textarea");
    textarea.value = node.data.text;
    textarea.addEventListener("input", () => {
      node.data.text = textarea.value;
      renderGraph();
    });

    wrapper.append(hint, textarea);
  }

  const actions = document.createElement("div");
  actions.className = "inspector-actions";

  if (node.kind === "thread" || node.kind === "action") {
    const executeButton = document.createElement("button");
    executeButton.type = "button";
    executeButton.textContent = `ejecutar ${node.label}`;
    executeButton.addEventListener("click", async () => {
      await executeNode(node.id);
    });
    actions.append(executeButton);
  }

  if (typeof node.data?.text === "string") {
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.textContent = "run boot";
    downloadButton.addEventListener("click", async () => {
      await executeNode("boot");
    });
    actions.append(downloadButton);
  }

  if (actions.childNodes.length > 0) {
    wrapper.append(actions);
  }

  const jsonBlock = document.createElement("pre");
  jsonBlock.className = "inspector-json";
  jsonBlock.textContent = JSON.stringify(node, null, 2);
  wrapper.append(jsonBlock);

  elements.inspector.replaceChildren(wrapper);
}

function createExecutionContext() {
  return {
    graph: state.graph,
    runtime: state.runtime,
    getNode,
    getMount,
    resolveText,
    log
  };
}

async function executeThread(node) {
  const flowEdges = getOutgoing(node.id, "flow");

  for (const edge of flowEdges) {
    await executeNode(edge.to);
  }
}

async function executeAction(node) {
  const adapterName = node.data?.adapter;
  const adapter = adapters[adapterName];

  if (!adapter) {
    log(`adapter no encontrado: ${adapterName || "sin-nombre"}`);
    return;
  }

  await adapter.run(node, createExecutionContext());
}

async function executeNode(nodeId) {
  const node = getNode(nodeId);

  if (!node) {
    return;
  }

  setStatus(`ejecutando ${node.label}`);

  try {
    if (node.kind === "thread") {
      await executeThread(node);
    } else if (node.kind === "action") {
      await executeAction(node);
    } else {
      log(`el nodo ${node.label} no ejecuta, solo describe datos`);
    }
  } catch (error) {
    log(`error en ${node.label}: ${error.message}`);
  } finally {
    setStatus("listo");
    renderInspector();
  }
}

function downloadGraph() {
  const blob = new Blob([JSON.stringify(state.graph, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "graph.json";
  anchor.click();
  URL.revokeObjectURL(url);
  log("json exportado");
}

async function init() {
  const graph = await loadGraph();
  indexGraph(graph);
  renderGraph();
  renderInspector();

  elements.runBoot.addEventListener("click", async () => {
    await executeNode("boot");
  });

  elements.downloadJson.addEventListener("click", () => {
    downloadGraph();
  });

  await executeNode("boot");
}

init();