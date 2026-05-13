# Organismo Core

Base minima para programar sobre un grafo de datos y usar tecnologia web existente sin meter toda esa complejidad dentro del nucleo.

## Idea

- `core.js` no contiene negocio ni widgets especiales.
- `graph.json` describe nodos, enlaces, orden de flujo y configuracion.
- `adapters/` conecta el grafo con DOM, CSS y JavaScript.
- El mismo patron puede crecer hacia canvas, Three.js, audio, fetch o almacenamiento.

## Modelo minimo

Cada nodo tiene:

- `id`
- `kind`
- `label`
- `position`
- `data`

Cada enlace tiene:

- `from`
- `to`
- `type`
- `order` cuando el enlace representa flujo secuencial

## Nodo thread

El nodo `thread` toma el papel de tu runtime anterior:

- en listas recorrias posiciones
- en grafos recorre enlaces `flow`

## Nodo action

Un nodo `action` no contiene la implementacion. Solo declara:

- `adapter`
- `action`
- `source`
- `target`

El adaptador decide como ejecutar eso.

## Uso

1. Abrir `index.html` en un navegador.
2. Editar el contenido de `editor html`, `editor css` o `editor js` desde el inspector.
3. Ejecutar `boot` para reproyectar todo el sistema.
4. Descargar el `graph.json` actualizado desde la interfaz.

## Nota

Si el navegador bloquea `fetch` sobre `graph.json` al abrir el archivo directamente, `core.js` usa una copia embebida para que el prototipo siga funcionando. Si lo sirves por HTTP, cargara `graph.json` de forma normal.