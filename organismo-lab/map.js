const diarsaba = new Map();

// Definir funciones
async function saludar(nombre) {
  console.log(`Hola ${nombre}`);
}

async function sumar(a, b) {
  console.log(`Suma: ${a + b}`);
}

// Estructura en diarsaba
diarsaba.set("mainThread", ["thread", "<subThread", "funcSaludo"]);
diarsaba.set("subThread", ["thread", "funcSuma"]);
diarsaba.set("funcSaludo", ["function", saludar, "Juan"]);
diarsaba.set("funcSuma", ["function", sumar, 5, 3]);
diarsaba.set(saludar, saludar);
diarsaba.set(sumar, sumar);

// Ejecutar

window.addEventListener("DOMContentLoaded", async (e) => {
  window.addEventListener("load", async (e) => {
    diarsaba.set("last-event", e);

    executeThreadsAndFunctions("mainThread");
  });
  window.addEventListener("dblclick", async (e) => {
    diarsaba.set("last-event", e);
  });
  window.addEventListener("pointerup", async (e) => {
    diarsaba.set("last-event", e);
  });
  window.addEventListener("pointerdown", async (e) => {
    diarsaba.set("last-event", e);
  });
  window.addEventListener("pointermove", async (e) => {
    diarsaba.set("last-event", e);
    diarsaba.set("pointer-x", e.clientX);
    diarsaba.set("pointer-y", e.clientY);
  });
  window.addEventListener("click", async (e) => {
    diarsaba.set("last-event", e);
  });
  // Desactivar gestos de zoom
  window.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  });

  window.addEventListener("gesturechange", function (e) {
    e.preventDefault();
  });

  window.addEventListener("gestureend", function (e) {
    e.preventDefault();
  });

  // Prevenir acciones de contexto (menú contextual)
  window.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    diarsaba.set("last-event", e);
    //THREAD aparecer menu
    const body = document.querySelector("body");
    body.innerHTML = ` <div class="horizontal border shrink-to-fit padding gap">
        <button class="border-left" data-btn="wd-test-button">···</button>
        <input type="text" class="input-field border-rigth" placeholder="···">
    </div>`;
  });

  // Prevenir arrastrar imágenes u otros elementos
  window.addEventListener("dragstart", function (e) {
    e.preventDefault();
  });

  // Prevenir selección de texto
  window.addEventListener("selectstart", function (e) {
    e.preventDefault();
  });
  window.addEventListener("resize", async (e) => {
    diarsaba.set("last-event", e);
  });
  // Prevenir scroll con rueda del ratón
  window.addEventListener(
    "wheel",
    function (e) {
      diarsaba.set("last-event", e);
      e.preventDefault();
    },
    { passive: false }
  );

  // Prevenir scroll táctil
  window.addEventListener(
    "touchmove",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener("keyup", async (e) => {
    diarsaba.set("last-event", e);
  });
  window.addEventListener("keypress", async (e) => {
    diarsaba.set("last-event", e);
  });
  // Prevenir navegación con teclado (teclas de dirección, espacio, etc.)
  window.addEventListener("keydown", function (e) {
    diarsaba.set("last-event", e);
    // Teclas: espacio, page up/down, inicio/fin, flechas
    if ([32, 33, 34, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
    }
  });
  window.addEventListener("scroll", async (e) => {
    diarsaba.set("last-event", e);
  });
});

// Función auxiliar para crear elementos con scroll personalizado
function createScrollableElement(tagName = "div", className = "") {
  const element = document.createElement(tagName);
  element.className = `${className} scroll`.trim();
  return element;
}
