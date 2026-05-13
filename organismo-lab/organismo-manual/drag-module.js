export function initDrag(target = "#canvas") {
  const canvas = typeof target === "string" ? document.querySelector(target) : target;

  if (!canvas) {
    return 0;
  }

  const draggableItems = canvas.querySelectorAll("[data-draggable]");

  draggableItems.forEach((item) => {
    const handle = item.querySelector("[data-handle]") || item;

    if (handle.dataset.dragBound === "true") {
      return;
    }

    handle.dataset.dragBound = "true";
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialCenterX = itemRect.left - canvasRect.left + itemRect.width / 2 + canvas.scrollLeft;
      const initialCenterY = itemRect.top - canvasRect.top + itemRect.height / 2 + canvas.scrollTop;

      item.classList.add("is-dragging");

      if (typeof handle.setPointerCapture === "function") {
        handle.setPointerCapture(event.pointerId);
      }

      const onPointerMove = (moveEvent) => {
        const nextX = initialCenterX + (moveEvent.clientX - startX);
        const nextY = initialCenterY + (moveEvent.clientY - startY);

        item.style.left = `${Math.round(nextX)}px`;
        item.style.top = `${Math.round(nextY)}px`;
      };

      const stopDragging = () => {
        item.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stopDragging);
        window.removeEventListener("pointercancel", stopDragging);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDragging, { once: true });
      window.addEventListener("pointercancel", stopDragging, { once: true });
    });
  });

  return draggableItems.length;
}