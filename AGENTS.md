# RMC MockupTool - Instrucciones Para Codex

Este repo es el CEP independiente `RMC MockupTool`.

Antes de trabajar, lee primero:

1. `CURRENT_STATE.md`
2. `TASK_ROUTER.md`

No leas `README.md` completo ni `docs/ui/RMC_CEP_UI_UX_MANIFEST.md` completo salvo que la tarea lo requiera según `TASK_ROUTER.md`.

## Reglas Base

* No mezclar este repo con `RMCOp-Nike`.
* No tocar tablas `rmcop_nike_*`.
* No cambiar nombres de herramientas en SQLite:

  * `RMC MockupTool Personalizada`
  * `RMC MockupTool Genericas`
* No usar etiquetas antiguas:

  * `Por lote`
  * `Genericas Muestras`
  * `RMC MockupTool Por Lote`
* Mantener secciones visibles:

  * `Personalizadas`
  * `Genericas`
* Validar primero y generar después.
* `Validar` no debe escribir archivos ni SQLite.
* `Generar PDFs` siempre debe volver a validar y procesar sólo `FALTANTE`.
* `Revisar cola` no imprime.
* `Imprimir cola` debe confirmar, usar `lp` y marcar `impreso=1` sólo cuando macOS acepte el trabajo.
* No reemplazar PDFs existentes.
* No cambiar la estructura SQLite sin autorización explícita.
* No implementar la reestructura recomendada de historial sin permiso.

## Archivos Clave

* `index.html`: estructura del panel CEP.
* `css/styles.css`: tema visual RMC.
* `js/app.js`: estado UI, selectores, filtros y acciones.
* `src/generate.js`: Excel, consolidación, validación, generación PDF e impresión.
* `src/history.js`: SQLite, migraciones y logs JSON.
* `tests/consolidation.test.js`: regresión de consolidación multitalle.

## Checks

Antes de cerrar cambios de código, ejecutar:

```bash
npm run check
```

Si el cambio toca sólo documentación, no es obligatorio ejecutar checks.
