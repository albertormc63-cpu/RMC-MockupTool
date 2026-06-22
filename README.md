# RMC MockupTool

Extension CEP independiente para Adobe Illustrator que lee listas Nike, valida trabajo previo, genera PDFs anotados de mockups y permite revisar/imprimir cola respetando el orden operativo del Excel.

Comparte la base SQLite central con otras herramientas RMC, pero usa codigo, tablas y reglas de escritura propias.

## Modos Activos

| Seccion UI | Modo interno | Excel admitido | Herramienta SQLite |
| --- | --- | --- | --- |
| `Personalizadas` | `bulk` | token `OD` | `RMC MockupTool Personalizada` |
| `Genericas` | `samples` | tokens `ST`, `IH`, `TB`, `AS` | `RMC MockupTool Genericas` |

No usar `Por lote`, `Genericas Muestras` ni `RMC MockupTool Por Lote` en registros nuevos.

## Flujo Resumido

```text
Preparar -> Validar -> Generar -> Registrar -> Imprimir
```

- Preparar: seleccionar Excel, salida, disenador y filtros.
- Validar: calcular el plan contra archivos y SQLite sin escribir.
- Generar: volver a validar y procesar solamente `FALTANTE`.
- Registrar: guardar corrida e items despues de escribir PDFs.
- Imprimir: revisar cola, confirmar, ejecutar `lp` y marcar aceptados.

Detalle: [`docs/processes/PRODUCTION_FLOW.md`](docs/processes/PRODUCTION_FLOW.md).

## Mapa De Documentacion

| Tema | Documento |
| --- | --- |
| Estado actual breve | [`CURRENT_STATE.md`](CURRENT_STATE.md) |
| Enrutamiento por tarea | [`TASK_ROUTER.md`](TASK_ROUTER.md) |
| Flujo completo de produccion | [`docs/processes/PRODUCTION_FLOW.md`](docs/processes/PRODUCTION_FLOW.md) |
| Excel, pedidos, filtros, multitalle, claves y embarque | [`docs/processes/EXCEL_AND_CONSOLIDATION.md`](docs/processes/EXCEL_AND_CONSOLIDATION.md) |
| Estados, validacion y generacion segura | [`docs/processes/VALIDATION_AND_GENERATION.md`](docs/processes/VALIDATION_AND_GENERATION.md) |
| Mockups, firmas, nombres y carpetas | [`docs/processes/PDF_OUTPUT_AND_NAMING.md`](docs/processes/PDF_OUTPUT_AND_NAMING.md) |
| Revision de cola e impresion | [`docs/processes/PRINTING.md`](docs/processes/PRINTING.md) |
| SQLite, paths, logs y modelo de historial | [`docs/sqlite/SQLITE_AND_LOGS.md`](docs/sqlite/SQLITE_AND_LOGS.md) |
| Componentes y limites arquitectonicos | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Contrato UI/UX | [`docs/ui/RMC_CEP_UI_UX_MANIFEST.md`](docs/ui/RMC_CEP_UI_UX_MANIFEST.md) |

## Instalacion Y Checks

Carpeta CEP:

```text
/Users/rmlsub1/Library/Application Support/Adobe/CEP/extensions/RMC MockupTool
```

```bash
npm install
npm run check
```

`npm run check` valida sintaxis de `src/generate.js`, `src/history.js` y `js/app.js`, y ejecuta la regresion de consolidacion multitalle en `tests/consolidation.test.js`.

El uso CLI y sus opciones se documentan en [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Invariantes Criticas

- Validar primero y generar despues.
- `Validar` no escribe archivos ni SQLite.
- `Generar PDFs` vuelve a validar y procesa solamente `FALTANTE`.
- Si existe `CONFLICTO`, no generar.
- No crear corrida si no hay faltantes.
- No reemplazar PDFs existentes.
- El destino parte siempre de la raiz elegida por el operador.
- Personalizadas inicia archivos con WO.
- Genericas inicia archivos con Roster y no agrega WO al inicio.
- Consolidar multitalle antes del filtro de talla y producir/imprimir una sola plantilla.
- Guardar `fecha_embarque` como `DD/MM`.
- Guardar `excel_path`, path de corrida y path completo de cada PDF.
- Los items nuevos inician con `impreso=0`.
- Marcar `impreso=1` solamente cuando `lp` termina correctamente.
- `impreso=1` confirma aceptacion en la cola de macOS, no impresion fisica.
- No usar `impreso` para decidir regeneracion.
- No tocar tablas ni nombres de herramientas de `RMCOp-Nike`.
- No cambiar el esquema SQLite ni implementar la reestructura recomendada sin autorizacion explicita.

Las reglas completas viven en los documentos tematicos; este README funciona solamente como indice ejecutivo.
