const DRAG_THRESHOLD = 6;

function isPrimaryPointer(event) {
  return event.button === 0;
}

export function initDrag(target = "#canvas") {
  const canvas = typeof target === "string" ? document.querySelector(target) : target;

  if (!canvas) {
    return 0;
  }

  const draggableItems = canvas.querySelectorAll("[data-draggable]");

  draggableItems.forEach((item) => {
    if (item.dataset.dragBound === "true") {
      return;
    }

    item.dataset.dragBound = "true";
    item.addEventListener("pointerdown", (event) => {
      if (!isPrimaryPointer(event)) {
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialCenterX = itemRect.left - canvasRect.left + itemRect.width / 2 + canvas.scrollLeft;
      const initialCenterY = itemRect.top - canvasRect.top + itemRect.height / 2 + canvas.scrollTop;
      let isDragging = false;

      const onPointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (!isDragging) {
          const distance = Math.hypot(deltaX, deltaY);

          if (distance < DRAG_THRESHOLD) {
            return;
          }

          isDragging = true;
          item.classList.add("is-dragging");

          if (typeof item.setPointerCapture === "function") {
            item.setPointerCapture(event.pointerId);
          }
        }

        const nextX = initialCenterX + deltaX;
        const nextY = initialCenterY + deltaY;

        item.style.left = `${Math.round(nextX)}px`;
        item.style.top = `${Math.round(nextY)}px`;
      };

      const stopDragging = () => {
        item.classList.remove("is-dragging");

        if (typeof item.releasePointerCapture === "function" && item.hasPointerCapture?.(event.pointerId)) {
          item.releasePointerCapture(event.pointerId);
        }

        if (isDragging) {
          item.dataset.dragJustEnded = "true";
          window.setTimeout(() => {
            delete item.dataset.dragJustEnded;
          }, 0);
        }

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