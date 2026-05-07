const stage = document.querySelector("#stage");
const toolbar = document.querySelector(".toolbar");

const widgetBlueprints = {
  button: { x: 28, y: 108 },
  input: { x: 252, y: 120 },
  toggle: { x: 34, y: 252 },
  card: { x: 270, y: 270 },
  image: { x: 490, y: 154 },
};

let highestLayer = 10;
const widgetCount = new Map();

function buildWidget(type, position) {
  const template = document.querySelector(`#widget-template-${type}`);

  if (!template) {
    throw new Error(`Widget template not found for type: ${type}`);
  }

  const shell = document.createElement("section");
  shell.className = "widget-shell";
  shell.dataset.widgetType = type;
  shell.style.left = `${position.x}px`;
  shell.style.top = `${position.y}px`;
  shell.style.zIndex = String(++highestLayer);
  shell.append(template.content.cloneNode(true));

  const currentCount = (widgetCount.get(type) ?? 0) + 1;
  widgetCount.set(type, currentCount);

  const tag = shell.querySelector(".widget-tag");
  if (tag) {
    tag.textContent = `${tag.textContent} ${currentCount}`;
  }

  enableDragging(shell);
  stage.append(shell);
  return shell;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function enableDragging(shell) {
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
    shell.style.zIndex = String(++highestLayer);
    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const nextX = clamp(moveEvent.clientX - stageRect.left - offsetX, 0, stageRect.width - shellRect.width);
      const nextY = clamp(moveEvent.clientY - stageRect.top - offsetY, 0, stageRect.height - shellRect.height);

      shell.style.left = `${nextX}px`;
      shell.style.top = `${nextY}px`;
    };

    const stopDragging = () => {
      shell.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  });
}

function getSpawnPosition(type) {
  const base = widgetBlueprints[type] ?? { x: 40, y: 40 };
  const repetitions = widgetCount.get(type) ?? 0;
  const offset = repetitions * 18;

  return {
    x: base.x + offset,
    y: base.y + offset,
  };
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-widget]");

  if (!button) {
    return;
  }

  const type = button.dataset.addWidget;
  buildWidget(type, getSpawnPosition(type));
});

["button", "input", "toggle", "card", "image"].forEach((type) => {
  buildWidget(type, getSpawnPosition(type));
});