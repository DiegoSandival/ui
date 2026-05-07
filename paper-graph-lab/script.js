const stage = document.querySelector("#stage");
const toolbar = document.querySelector(".toolbar");
const toastStack = document.querySelector("#toast-stack");

const PAPER_WIDTH = 224;
const PAPER_HEIGHT = 262;

const slotDefinitions = [
  { key: "head", label: "Cabeza", x: 182, y: 60, rotate: 0 },
  { key: "leftArm", label: "Brazo izq", x: 92, y: 148, rotate: -16 },
  { key: "torso", label: "Torso", x: 182, y: 156, rotate: 0 },
  { key: "rightArm", label: "Brazo der", x: 272, y: 148, rotate: 16 },
  { key: "leftLeg", label: "Pierna izq", x: 146, y: 258, rotate: 12 },
  { key: "rightLeg", label: "Pierna der", x: 218, y: 258, rotate: -12 }
];

const panelBlueprints = {
  inspector: { title: "Inspector", x: 740, y: 108, shellClass: "inspector-shell" },
  studio: { title: "Tinta y programa", x: 740, y: 444, shellClass: "studio-shell" },
  assembly: { title: "Ensamblador", x: 1072, y: 108, shellClass: "assembly-shell" }
};

const appState = {
  papers: [],
  selectedPaperId: null,
  focusTargetId: null,
  assemblyPaperId: null,
  nextPaperId: 0,
  highestLayer: 40,
  panels: {},
  panelPositions: {}
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createNode(tagName, className, textContent) {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  if (typeof textContent === "string") {
    node.textContent = textContent;
  }

  return node;
}

function showToast(message) {
  const toast = createNode("div", "toast", message);
  toastStack.append(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2400);
}

function createEmptyAssemblySlots() {
  return Object.fromEntries(slotDefinitions.map((slot) => [slot.key, null]));
}

function getDefaultPaperPosition(index) {
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: 28 + column * 236,
    y: 108 + row * 188
  };
}

function createPaper(options = {}) {
  const hasExplicitId = Number.isFinite(options.id);
  const paperId = hasExplicitId ? options.id : appState.nextPaperId;

  appState.nextPaperId = Math.max(appState.nextPaperId, paperId + 1);

  return {
    id: paperId,
    marks: deepClone(options.marks ?? []),
    touchProgram: deepClone(options.touchProgram ?? []),
    assemblySlots: {
      ...createEmptyAssemblySlots(),
      ...deepClone(options.assemblySlots ?? {})
    },
    position: options.position ?? getDefaultPaperPosition(paperId),
    zIndex: ++appState.highestLayer
  };
}

function getPaperById(paperId) {
  return appState.papers.find((paper) => paper.id === paperId) ?? null;
}

function getSelectedPaper() {
  return getPaperById(appState.selectedPaperId);
}

function getAssemblyPaper() {
  return getPaperById(appState.assemblyPaperId);
}

function getRecipeMarks(recipe) {
  if (recipe === "circle") {
    return [{ kind: "circle" }];
  }

  if (recipe === "line") {
    return [{ kind: "line" }];
  }

  return [];
}

function getRecipeLabel(recipe, article = false) {
  if (recipe === "circle") {
    return article ? "un circulo" : "circulo";
  }

  if (recipe === "line") {
    return article ? "una linea" : "linea";
  }

  return article ? "un papel en blanco" : "en blanco";
}

function hasAssemblyContent(paper) {
  return Object.values(paper.assemblySlots).some((value) => Number.isFinite(value));
}

function getRoleChips(paper) {
  const chips = [];

  if (paper.marks.length > 0) {
    chips.push(`tinta ${paper.marks.length}`);
  }

  if (paper.touchProgram.some((step) => step.type === "spawn")) {
    chips.push("salta");
  }

  if (paper.touchProgram.some((step) => step.type === "write")) {
    chips.push("escribe");
  }

  if (hasAssemblyContent(paper) || appState.assemblyPaperId === paper.id) {
    chips.push("organiza");
  }

  if (chips.length === 0) {
    chips.push("en blanco");
  }

  return chips;
}

function describeTouchStep(step) {
  if (step.type === "spawn") {
    return `crear ${getRecipeLabel(step.recipe, true)}`;
  }

  if (step.type === "write") {
    return `escribir ${getRecipeLabel(step.recipe)} en papel ${step.targetId}`;
  }

  return "accion desconocida";
}

function buildPaperSummary(paper) {
  if (paper.touchProgram.length === 0) {
    return "Sin programa al tocar. Puedes usarlo como tinta, destino o pieza del ensamblaje.";
  }

  return `Al tocar: ${paper.touchProgram.map(describeTouchStep).join(" + ")}.`;
}

function buildPaperPreviewSVG(paper) {
  const circleMarks = paper.marks.filter((mark) => mark.kind === "circle");
  const lineMarks = paper.marks.filter((mark) => mark.kind === "line");

  const parts = [
    '<svg viewBox="0 0 160 118" aria-hidden="true" focusable="false">',
    '<rect x="1" y="1" width="158" height="116" rx="18" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />'
  ];

  circleMarks.forEach((mark, index) => {
    const group = Math.floor(index / 2);
    const direction = index % 2 === 0 ? -1 : 1;
    const cx = 80 + direction * (16 + group * 6);
    const cy = 36 + group * 16;
    const radius = 15 - Math.min(group, 2);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="2.6" />`);
  });

  lineMarks.forEach((mark, index) => {
    const offset = index * 8;
    const x1 = 44 + offset;
    const y1 = 94 - Math.min(offset, 26);
    const x2 = 116 + Math.min(offset, 18);
    const y2 = 48 + Math.min(offset, 18);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.88)" stroke-width="3" stroke-linecap="round" />`);
  });

  parts.push(`<text x="80" y="74" text-anchor="middle" font-size="48" font-family="Manrope, sans-serif" fill="rgba(255,255,255,0.92)">${paper.id}</text>`);
  parts.push("</svg>");
  return parts.join("");
}

function bringPaperToFront(paper) {
  paper.zIndex = ++appState.highestLayer;
}

function ensureSelectedPaper() {
  if (getSelectedPaper()) {
    return;
  }

  appState.selectedPaperId = appState.papers[0]?.id ?? null;
}

function ensureFocusTarget() {
  const selectedPaper = getSelectedPaper();
  const availableTargets = appState.papers.filter((paper) => paper.id !== selectedPaper?.id);

  if (availableTargets.length === 0) {
    appState.focusTargetId = null;
    return;
  }

  if (!availableTargets.some((paper) => paper.id === appState.focusTargetId)) {
    appState.focusTargetId = availableTargets[0].id;
  }
}

function ensureAssemblyPaper() {
  if (getAssemblyPaper()) {
    return;
  }

  appState.assemblyPaperId = null;
}

function selectPaper(paperId) {
  const paper = getPaperById(paperId);

  if (!paper) {
    return;
  }

  appState.selectedPaperId = paperId;
  ensureFocusTarget();
  bringPaperToFront(paper);
  renderApp();
}

function createPaperFromRecipe(recipe = "blank", position = null) {
  const paper = createPaper({
    marks: getRecipeMarks(recipe),
    position
  });
  appState.papers.push(paper);
  return paper;
}

function getSpawnPositionNear(paper, indexOffset) {
  const stageWidth = stage.clientWidth || window.innerWidth;
  const stageHeight = stage.clientHeight || window.innerHeight;
  const nextX = clamp(paper.position.x + 34 + indexOffset * 16, 0, Math.max(0, stageWidth - PAPER_WIDTH));
  const nextY = clamp(paper.position.y + 28 + indexOffset * 16, 68, Math.max(68, stageHeight - PAPER_HEIGHT));

  return { x: nextX, y: nextY };
}

function applyRecipeToPaper(paper, recipe) {
  const nextMarks = getRecipeMarks(recipe);

  if (nextMarks.length === 0) {
    return;
  }

  paper.marks.push(...deepClone(nextMarks));
}

function addMarkToSelected(recipe) {
  const paper = getSelectedPaper();

  if (!paper) {
    return;
  }

  applyRecipeToPaper(paper, recipe);
  showToast(`Papel ${paper.id} recibio ${getRecipeLabel(recipe, true)}.`);
  renderApp();
}

function writeMarkNow(recipe) {
  const selectedPaper = getSelectedPaper();
  const targetPaper = getPaperById(appState.focusTargetId);

  if (!selectedPaper || !targetPaper) {
    showToast("Necesitas otro papel para escribir ahi.");
    return;
  }

  applyRecipeToPaper(targetPaper, recipe);
  bringPaperToFront(targetPaper);
  showToast(`Papel ${selectedPaper.id} escribio ${getRecipeLabel(recipe)} en papel ${targetPaper.id}.`);
  renderApp();
}

function addTouchStep(step) {
  const paper = getSelectedPaper();

  if (!paper) {
    return;
  }

  paper.touchProgram.push(step);
  showToast(`Papel ${paper.id}: ${describeTouchStep(step)}.`);
  renderApp();
}

function clearTouchProgram() {
  const paper = getSelectedPaper();

  if (!paper) {
    return;
  }

  paper.touchProgram = [];
  showToast(`Programa al tocar limpio en papel ${paper.id}.`);
  renderApp();
}

function touchPaper(paperId) {
  const paper = getPaperById(paperId);

  if (!paper) {
    return;
  }

  bringPaperToFront(paper);

  if (paper.touchProgram.length === 0) {
    appState.selectedPaperId = paper.id;
    ensureFocusTarget();
    showToast(`Papel ${paper.id} no tiene programa al tocar.`);
    renderApp();
    return;
  }

  let lastCreatedPaper = null;
  let writeCount = 0;
  let spawnCount = 0;

  paper.touchProgram.forEach((step, index) => {
    if (step.type === "spawn") {
      const createdPaper = createPaperFromRecipe(step.recipe, getSpawnPositionNear(paper, index));
      lastCreatedPaper = createdPaper;
      spawnCount += 1;
      return;
    }

    if (step.type === "write") {
      const targetPaper = getPaperById(step.targetId);

      if (!targetPaper) {
        return;
      }

      applyRecipeToPaper(targetPaper, step.recipe);
      bringPaperToFront(targetPaper);
      writeCount += 1;
    }
  });

  if (lastCreatedPaper) {
    appState.selectedPaperId = lastCreatedPaper.id;
  } else {
    appState.selectedPaperId = paper.id;
  }

  ensureFocusTarget();

  const summary = [];

  if (spawnCount > 0 && lastCreatedPaper) {
    summary.push(`creo ${spawnCount} papel${spawnCount > 1 ? "es" : ""}`);
  }

  if (writeCount > 0) {
    summary.push(`escribio ${writeCount} vez${writeCount > 1 ? "es" : ""}`);
  }

  showToast(`Papel ${paper.id} ${summary.join(" y ")}.`);
  renderApp();
}

function removeLastMark() {
  const paper = getSelectedPaper();

  if (!paper || paper.marks.length === 0) {
    showToast("No hay tinta para quitar.");
    return;
  }

  paper.marks.pop();
  showToast(`Papel ${paper.id}: se removio la ultima marca.`);
  renderApp();
}

function setAssemblyPaper(paperId) {
  const paper = getPaperById(paperId);

  if (!paper) {
    return;
  }

  appState.assemblyPaperId = paper.id;
  showToast(`Papel ${paper.id} ahora organiza a los demas.`);
  renderApp();
}

function assignSelectedToSlot(slotKey) {
  const selectedPaper = getSelectedPaper();
  const assemblyPaper = getAssemblyPaper();

  if (!selectedPaper || !assemblyPaper) {
    return;
  }

  assemblyPaper.assemblySlots[slotKey] = selectedPaper.id;
  showToast(`Papel ${selectedPaper.id} ocupa ${slotDefinitions.find((slot) => slot.key === slotKey)?.label.toLowerCase()}.`);
  renderApp();
}

function clearSlot(slotKey) {
  const assemblyPaper = getAssemblyPaper();

  if (!assemblyPaper) {
    return;
  }

  assemblyPaper.assemblySlots[slotKey] = null;
  renderApp();
}

function clearAssemblyAssignments() {
  const assemblyPaper = getAssemblyPaper();

  if (!assemblyPaper) {
    return;
  }

  assemblyPaper.assemblySlots = createEmptyAssemblySlots();
  showToast(`Se limpiaron los enlaces del papel ${assemblyPaper.id}.`);
  renderApp();
}

function buildPaperShell(paper) {
  const shell = createNode("section", "widget-shell paper-shell");
  shell.style.left = `${paper.position.x}px`;
  shell.style.top = `${paper.position.y}px`;
  shell.style.zIndex = String(paper.zIndex);

  const card = createNode("article", "widget-card paper-card");

  if (paper.id === appState.selectedPaperId) {
    card.classList.add("is-selected");
  }

  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", `Papel ${paper.id}`));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "widget-body paper-body");
  const preview = createNode("div", "paper-preview");
  preview.innerHTML = buildPaperPreviewSVG(paper);
  body.append(preview);
  body.append(createNode("p", "paper-copy", buildPaperSummary(paper)));

  const roleList = createNode("div", "paper-role-list");
  getRoleChips(paper).forEach((chip) => {
    roleList.append(createNode("span", "paper-role-chip", chip));
  });
  body.append(roleList);

  const actionRow = createNode("div", "paper-action-row");
  const selectButton = createNode("button", "paper-action-button", "Seleccionar");
  selectButton.type = "button";
  selectButton.addEventListener("click", (event) => {
    event.stopPropagation();
    selectPaper(paper.id);
  });

  const touchButton = createNode("button", "paper-action-button", "Tocar");
  touchButton.type = "button";
  touchButton.addEventListener("click", (event) => {
    event.stopPropagation();
    touchPaper(paper.id);
  });

  actionRow.append(selectButton, touchButton);
  body.append(actionRow);
  card.append(grip, body);
  shell.append(card);

  shell.addEventListener("click", () => {
    selectPaper(paper.id);
  });

  enableDragging(shell, (nextPosition) => {
    paper.position = nextPosition;
  }, () => {
    bringPaperToFront(paper);
    shell.style.zIndex = String(paper.zIndex);
  });

  return shell;
}

function enableDragging(shell, onMove, onStart) {
  const handle = shell.querySelector(".widget-grip");

  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    const stageRect = stage.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const offsetX = event.clientX - shellRect.left;
    const offsetY = event.clientY - shellRect.top;

    shell.classList.add("dragging");
    handle.setPointerCapture(event.pointerId);

    if (typeof onStart === "function") {
      onStart();
    }

    const onPointerMove = (moveEvent) => {
      const maxX = Math.max(0, stageRect.width - shellRect.width);
      const maxY = Math.max(0, stageRect.height - shellRect.height);
      const nextX = clamp(moveEvent.clientX - stageRect.left - offsetX, 0, maxX);
      const nextY = clamp(moveEvent.clientY - stageRect.top - offsetY, 0, maxY);

      shell.style.left = `${nextX}px`;
      shell.style.top = `${nextY}px`;
      onMove({ x: nextX, y: nextY });
    };

    const stopDragging = () => {
      shell.classList.remove("dragging");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function createPanelShell(panelKey) {
  const blueprint = panelBlueprints[panelKey];
  const shell = createNode("section", `widget-shell panel-shell ${blueprint.shellClass}`);
  const initialPosition = blueprint;

  appState.panelPositions[panelKey] = { x: initialPosition.x, y: initialPosition.y };

  shell.style.left = `${initialPosition.x}px`;
  shell.style.top = `${initialPosition.y}px`;
  shell.style.zIndex = String(++appState.highestLayer);

  const card = createNode("article", "widget-card panel-card");
  const grip = createNode("div", "widget-grip");
  grip.append(createNode("span", "widget-tag", blueprint.title));
  grip.append(createNode("span", "widget-dots"));

  const body = createNode("div", "panel-body");
  card.append(grip, body);
  shell.append(card);
  stage.append(shell);

  enableDragging(shell, (nextPosition) => {
    appState.panelPositions[panelKey] = nextPosition;
  }, () => {
    shell.style.zIndex = String(++appState.highestLayer);
  });

  appState.panels[panelKey] = { shell, body };
}

function ensurePanels() {
  Object.keys(panelBlueprints).forEach((panelKey) => {
    if (!appState.panels[panelKey]) {
      createPanelShell(panelKey);
    }
  });
}

function renderPaperLayer() {
  stage.querySelectorAll(".paper-shell").forEach((node) => node.remove());

  const sortedPapers = [...appState.papers].sort((left, right) => left.zIndex - right.zIndex);

  sortedPapers.forEach((paper) => {
    stage.append(buildPaperShell(paper));
  });
}

function renderInspectorPanel() {
  const panel = appState.panels.inspector;
  const paper = getSelectedPaper();

  if (!panel) {
    return;
  }

  panel.body.replaceChildren();

  if (!paper) {
    panel.body.append(createNode("div", "empty-state", "No hay papel seleccionado."));
    return;
  }

  const intro = createNode("div", "panel-section");
  intro.append(createNode("p", "panel-copy", `Papel ${paper.id} sigue siendo la misma unidad que los demas. Solo cambia por sus marcas, su programa al tocar y sus enlaces.`));

  const browserSection = createNode("div", "panel-section");
  const browserHeader = createNode("div", "panel-section-header");
  browserHeader.append(createNode("p", "panel-section-title", "Mapa de papeles"));
  browserHeader.append(createNode("p", "panel-copy", `${appState.papers.length} total`));
  browserSection.append(browserHeader);

  const browserList = createNode("div", "target-list");
  renderPaperBrowser(browserList);
  browserSection.append(browserList);
  panel.body.append(browserSection);

  const summaryList = createNode("div", "summary-list");
  getRoleChips(paper).forEach((chip) => {
    summaryList.append(createNode("span", "summary-chip", chip));
  });
  intro.append(summaryList);
  panel.body.append(intro);

  const quickActions = createNode("div", "panel-section");
  const quickButtons = createNode("div", "panel-button-row");

  const touchButton = createNode("button", "panel-button", "Tocar ahora");
  touchButton.type = "button";
  touchButton.addEventListener("click", () => {
    touchPaper(paper.id);
  });

  const assemblyButton = createNode("button", "panel-button", "Volverlo ensamblador");
  assemblyButton.type = "button";
  assemblyButton.addEventListener("click", () => {
    setAssemblyPaper(paper.id);
  });

  const removeMarkButton = createNode("button", "panel-button", "Quitar ultima tinta");
  removeMarkButton.type = "button";
  removeMarkButton.addEventListener("click", () => {
    removeLastMark();
  });

  const newPaperButton = createNode("button", "panel-button", "Crear papel vacio");
  newPaperButton.type = "button";
  newPaperButton.addEventListener("click", () => {
    const createdPaper = createPaperFromRecipe("blank");
    appState.selectedPaperId = createdPaper.id;
    ensureFocusTarget();
    showToast(`Papel ${createdPaper.id} creado.`);
    renderApp();
  });

  quickButtons.append(touchButton, assemblyButton, removeMarkButton, newPaperButton);
  quickActions.append(quickButtons);
  panel.body.append(quickActions);

  const markSection = createNode("div", "panel-section");
  const markHeader = createNode("div", "panel-section-header");
  markHeader.append(createNode("p", "panel-section-title", "Tinta local"));
  markHeader.append(createNode("p", "panel-copy", `${paper.marks.length} marca${paper.marks.length === 1 ? "" : "s"}`));
  markSection.append(markHeader);

  if (paper.marks.length === 0) {
    markSection.append(createNode("div", "empty-state", "Todavia no hay circulos o lineas en este papel."));
  } else {
    const marksList = createNode("div", "summary-list");
    paper.marks.forEach((mark, index) => {
      marksList.append(createNode("span", "summary-chip", `${mark.kind} ${index + 1}`));
    });
    markSection.append(marksList);
  }

  panel.body.append(markSection);

  const touchSection = createNode("div", "panel-section");
  const touchHeader = createNode("div", "panel-section-header");
  touchHeader.append(createNode("p", "panel-section-title", "Programa al tocar"));
  touchHeader.append(createNode("p", "panel-copy", `${paper.touchProgram.length} paso${paper.touchProgram.length === 1 ? "" : "s"}`));
  touchSection.append(touchHeader);

  if (paper.touchProgram.length === 0) {
    touchSection.append(createNode("div", "empty-state", "Configura un salto o una escritura para que el papel reaccione al tocarlo."));
  } else {
    const stepsList = createNode("div", "panel-section");
    paper.touchProgram.forEach((step, index) => {
      stepsList.append(createNode("p", "panel-copy", `${index + 1}. ${describeTouchStep(step)}`));
    });
    touchSection.append(stepsList);
  }

  panel.body.append(touchSection);
}

function renderTargetButtons(container) {
  const selectedPaper = getSelectedPaper();
  const candidates = appState.papers.filter((paper) => paper.id !== selectedPaper?.id);

  if (candidates.length === 0) {
    container.append(createNode("div", "empty-state", "Crea otro papel para poder escribir en el."));
    return;
  }

  candidates.forEach((paper) => {
    const button = createNode("button", "target-button");
    button.type = "button";

    if (paper.id === appState.focusTargetId) {
      button.classList.add("is-active");
    }

    const meta = createNode("span", "target-meta");
    meta.append(createNode("span", "target-title", `Papel ${paper.id}`));
    meta.append(createNode("span", "target-copy", buildPaperSummary(paper)));
    button.append(meta);
    button.addEventListener("click", () => {
      appState.focusTargetId = paper.id;
      renderApp();
    });
    container.append(button);
  });
}

function renderPaperBrowser(container) {
  appState.papers
    .slice()
    .sort((left, right) => left.id - right.id)
    .forEach((paper) => {
      const button = createNode("button", "target-button paper-browser-button");
      button.type = "button";

      if (paper.id === appState.selectedPaperId) {
        button.classList.add("is-active");
      }

      const meta = createNode("span", "target-meta");
      const flags = [];

      if (paper.id === appState.selectedPaperId) {
        flags.push("activo");
      }

      if (paper.id === appState.assemblyPaperId) {
        flags.push("ensamblador");
      }

      meta.append(createNode("span", "target-title", `Papel ${paper.id}`));
      meta.append(createNode("span", "target-copy", flags.length > 0 ? flags.join(" · ") : buildPaperSummary(paper)));
      button.append(meta);
      button.addEventListener("click", () => {
        selectPaper(paper.id);
      });
      container.append(button);
    });
}

function renderStudioPanel() {
  const panel = appState.panels.studio;
  const selectedPaper = getSelectedPaper();

  if (!panel) {
    return;
  }

  panel.body.replaceChildren();

  if (!selectedPaper) {
    panel.body.append(createNode("div", "empty-state", "No hay papel activo para editar."));
    return;
  }

  const localInkSection = createNode("div", "panel-section");
  localInkSection.append(createNode("p", "panel-copy", `Editando papel ${selectedPaper.id}. Aqui decides si pinta en si mismo, escribe en otro o genera nuevos papeles.`));

  const localButtons = createNode("div", "panel-button-row");
  const addCircleButton = createNode("button", "panel-button", "Agregar circulo aqui");
  addCircleButton.type = "button";
  addCircleButton.addEventListener("click", () => {
    addMarkToSelected("circle");
  });

  const addLineButton = createNode("button", "panel-button", "Agregar linea aqui");
  addLineButton.type = "button";
  addLineButton.addEventListener("click", () => {
    addMarkToSelected("line");
  });

  localButtons.append(addCircleButton, addLineButton);
  localInkSection.append(localButtons);
  panel.body.append(localInkSection);

  const targetSection = createNode("div", "panel-section");
  const targetHeader = createNode("div", "panel-section-header");
  targetHeader.append(createNode("p", "panel-section-title", "Destino para escribir"));

  const targetPaper = getPaperById(appState.focusTargetId);
  targetHeader.append(createNode("p", "panel-copy", targetPaper ? `Objetivo: papel ${targetPaper.id}` : "Sin objetivo"));
  targetSection.append(targetHeader);

  const targetList = createNode("div", "target-list");
  renderTargetButtons(targetList);
  targetSection.append(targetList);

  const writeButtons = createNode("div", "panel-button-row");
  const writeCircleButton = createNode("button", "panel-button", "Escribir circulo ahora");
  writeCircleButton.type = "button";
  writeCircleButton.addEventListener("click", () => {
    writeMarkNow("circle");
  });

  const writeLineButton = createNode("button", "panel-button", "Escribir linea ahora");
  writeLineButton.type = "button";
  writeLineButton.addEventListener("click", () => {
    writeMarkNow("line");
  });

  writeButtons.append(writeCircleButton, writeLineButton);
  targetSection.append(writeButtons);
  panel.body.append(targetSection);

  const touchProgramSection = createNode("div", "panel-section");
  touchProgramSection.append(createNode("p", "panel-section-title", "Construir programa al tocar"));
  touchProgramSection.append(createNode("p", "panel-copy", "Cada click agrega un paso. Limpialo cuando quieras redefinir el comportamiento."));

  const touchButtons = createNode("div", "panel-button-row");
  const spawnBlankButton = createNode("button", "panel-button", "Agregar: crear vacio");
  spawnBlankButton.type = "button";
  spawnBlankButton.addEventListener("click", () => {
    addTouchStep({ type: "spawn", recipe: "blank" });
  });

  const spawnCircleButton = createNode("button", "panel-button", "Agregar: crear circulo");
  spawnCircleButton.type = "button";
  spawnCircleButton.addEventListener("click", () => {
    addTouchStep({ type: "spawn", recipe: "circle" });
  });

  const spawnLineButton = createNode("button", "panel-button", "Agregar: crear linea");
  spawnLineButton.type = "button";
  spawnLineButton.addEventListener("click", () => {
    addTouchStep({ type: "spawn", recipe: "line" });
  });

  const programWriteCircle = createNode("button", "panel-button", "Agregar: escribir circulo");
  programWriteCircle.type = "button";
  programWriteCircle.addEventListener("click", () => {
    const target = getPaperById(appState.focusTargetId);

    if (!target) {
      showToast("Selecciona un papel objetivo para programar la escritura.");
      return;
    }

    addTouchStep({ type: "write", targetId: target.id, recipe: "circle" });
  });

  const programWriteLine = createNode("button", "panel-button", "Agregar: escribir linea");
  programWriteLine.type = "button";
  programWriteLine.addEventListener("click", () => {
    const target = getPaperById(appState.focusTargetId);

    if (!target) {
      showToast("Selecciona un papel objetivo para programar la escritura.");
      return;
    }

    addTouchStep({ type: "write", targetId: target.id, recipe: "line" });
  });

  const clearProgramButton = createNode("button", "panel-button", "Limpiar programa");
  clearProgramButton.type = "button";
  clearProgramButton.addEventListener("click", () => {
    clearTouchProgram();
  });

  touchButtons.append(
    spawnBlankButton,
    spawnCircleButton,
    spawnLineButton,
    programWriteCircle,
    programWriteLine,
    clearProgramButton
  );

  touchProgramSection.append(touchButtons);
  panel.body.append(touchProgramSection);
}

function createAssemblyPiece(slot, paperId) {
  const paper = getPaperById(paperId);

  if (!paper) {
    return null;
  }

  const piece = createNode("div", "assembly-piece");
  piece.style.left = `${slot.x}px`;
  piece.style.top = `${slot.y}px`;
  piece.style.transform = `translate(-50%, -50%) rotate(${slot.rotate}deg)`;

  const card = createNode("div", "assembly-piece-card");
  const preview = createNode("div", "paper-preview");
  preview.innerHTML = buildPaperPreviewSVG(paper);
  const label = createNode("div", "assembly-piece-label", `Papel ${paper.id}`);
  card.append(preview, label);
  piece.append(card);
  return piece;
}

function renderAssemblyPanel() {
  const panel = appState.panels.assembly;
  const assemblyPaper = getAssemblyPaper();
  const selectedPaper = getSelectedPaper();

  if (!panel) {
    return;
  }

  panel.body.replaceChildren();

  const intro = createNode("div", "panel-section");
  intro.append(createNode("p", "panel-copy", assemblyPaper ? `Papel ${assemblyPaper.id} esta acomodando otros papeles para formar una figura compuesta.` : "Elige cualquier papel y vuelvelo ensamblador para que ordene a los demas."));

  const introButtons = createNode("div", "panel-button-row");
  const setAssemblyButton = createNode("button", "panel-button", selectedPaper ? `Usar papel ${selectedPaper.id}` : "Selecciona un papel");
  setAssemblyButton.type = "button";
  setAssemblyButton.disabled = !selectedPaper;
  setAssemblyButton.addEventListener("click", () => {
    if (selectedPaper) {
      setAssemblyPaper(selectedPaper.id);
    }
  });

  const clearAssemblyButton = createNode("button", "panel-button", "Limpiar enlaces");
  clearAssemblyButton.type = "button";
  clearAssemblyButton.disabled = !assemblyPaper;
  clearAssemblyButton.addEventListener("click", () => {
    clearAssemblyAssignments();
  });

  introButtons.append(setAssemblyButton, clearAssemblyButton);
  intro.append(introButtons);
  panel.body.append(intro);

  if (!assemblyPaper) {
    panel.body.append(createNode("div", "empty-state", "Cuando un papel se vuelve ensamblador, sus referencias siguen vivas: si cambias una pieza, el cuerpo cambia tambien."));
    return;
  }

  const slotSection = createNode("div", "panel-section");
  const slotHeader = createNode("div", "panel-section-header");
  slotHeader.append(createNode("p", "panel-section-title", "Slots del humanoide"));
  slotHeader.append(createNode("p", "panel-copy", selectedPaper ? `Asignando desde papel ${selectedPaper.id}` : "Selecciona una pieza"));
  slotSection.append(slotHeader);

  const slotList = createNode("div", "slot-list");
  slotDefinitions.forEach((slot) => {
    const slotButton = createNode("button", "slot-button");
    slotButton.type = "button";

    if (Number.isFinite(assemblyPaper.assemblySlots[slot.key])) {
      slotButton.classList.add("is-filled");
    }

    const slotMeta = createNode("span", "slot-meta");
    slotMeta.append(createNode("span", "slot-label", slot.label));
    slotMeta.append(createNode("span", "assembly-slot-copy", Number.isFinite(assemblyPaper.assemblySlots[slot.key]) ? `Papel ${assemblyPaper.assemblySlots[slot.key]}` : "Vacio"));
    slotButton.append(slotMeta);
    slotButton.addEventListener("click", () => {
      if (!selectedPaper) {
        return;
      }

      assignSelectedToSlot(slot.key);
    });

    slotList.append(slotButton);
  });
  slotSection.append(slotList);
  panel.body.append(slotSection);

  const clearButtons = createNode("div", "panel-button-row");
  slotDefinitions.forEach((slot) => {
    const button = createNode("button", "panel-button", `Vaciar ${slot.label}`);
    button.type = "button";
    button.addEventListener("click", () => {
      clearSlot(slot.key);
    });
    clearButtons.append(button);
  });
  panel.body.append(clearButtons);

  const canvas = createNode("div", "assembly-canvas");
  slotDefinitions.forEach((slot) => {
    const marker = createNode("div", "assembly-slot-marker", slot.label);
    marker.style.left = `${slot.x}px`;
    marker.style.top = `${slot.y}px`;
    canvas.append(marker);

    const piece = createAssemblyPiece(slot, assemblyPaper.assemblySlots[slot.key]);

    if (piece) {
      canvas.append(piece);
    }
  });
  panel.body.append(canvas);
}

function renderApp() {
  ensureSelectedPaper();
  ensureFocusTarget();
  ensureAssemblyPaper();
  renderPaperLayer();
  renderInspectorPanel();
  renderStudioPanel();
  renderAssemblyPanel();
}

function resetDemo() {
  appState.papers = [];
  appState.selectedPaperId = null;
  appState.focusTargetId = null;
  appState.assemblyPaperId = null;
  appState.nextPaperId = 0;

  const rootPaper = createPaper({
    id: 0,
    touchProgram: [{ type: "spawn", recipe: "blank" }],
    position: { x: 28, y: 108 }
  });

  appState.papers.push(rootPaper);
  appState.selectedPaperId = rootPaper.id;
  ensureFocusTarget();
  renderApp();
  showToast("Demo reiniciada: papel 0 ya puede crear otro papel al tocarlo.");
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-command]");

  if (!button) {
    return;
  }

  if (button.dataset.command === "new-paper") {
    const createdPaper = createPaperFromRecipe("blank");
    appState.selectedPaperId = createdPaper.id;
    ensureFocusTarget();
    renderApp();
    showToast(`Papel ${createdPaper.id} creado.`);
    return;
  }

  if (button.dataset.command === "touch-selected") {
    const selectedPaper = getSelectedPaper();

    if (selectedPaper) {
      touchPaper(selectedPaper.id);
    }

    return;
  }

  if (button.dataset.command === "make-assembly") {
    const selectedPaper = getSelectedPaper();

    if (selectedPaper) {
      setAssemblyPaper(selectedPaper.id);
    }

    return;
  }

  if (button.dataset.command === "reset-demo") {
    resetDemo();
  }
});

ensurePanels();
resetDemo();