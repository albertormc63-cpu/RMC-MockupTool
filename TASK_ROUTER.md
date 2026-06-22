# RMC MockupTool - Task Router Para Codex

Usa este archivo para abrir solamente el contexto necesario para cada tarea.

## Siempre Leer Primero

```text
AGENTS.md
CURRENT_STATE.md
```

## UI / Layout / CSS

Leer:

```text
docs/ui/RMC_CEP_UI_UX_MANIFEST.md
index.html
css/styles.css
js/app.js
```

Agregar `docs/processes/PRODUCTION_FLOW.md` solamente si cambia el comportamiento visible del flujo.

## Excel / Interpretacion / Consolidacion / Filtros

Leer:

```text
docs/processes/EXCEL_AND_CONSOLIDATION.md
src/generate.js
tests/consolidation.test.js
```

Incluye validacion del nombre, formatos OD y ST/IH/TB/AS, equipos, variantes, multitalle, claves y fecha de embarque.

## Validacion / Estados / Generacion

Leer:

```text
docs/processes/VALIDATION_AND_GENERATION.md
docs/processes/EXCEL_AND_CONSOLIDATION.md
src/generate.js
src/history.js
tests/consolidation.test.js
```

Reglas centrales: `Validar` no escribe; generar solamente `FALTANTE`; `CONFLICTO` bloquea; no reemplazar PDFs.

## PDFs / Mockups / Firmas / Fuente / Nombres

Leer:

```text
docs/processes/PDF_OUTPUT_AND_NAMING.md
docs/processes/VALIDATION_AND_GENERATION.md
src/generate.js
```

## Impresion

Leer:

```text
docs/processes/PRINTING.md
docs/processes/EXCEL_AND_CONSOLIDATION.md
src/generate.js
src/history.js
```

Reglas centrales: `Revisar cola` no imprime; `Imprimir cola` recalcula y confirma; marcar `impreso=1` solamente si `lp` termina correctamente.

## SQLite / Historial / Paths / Logs

Leer:

```text
docs/sqlite/SQLITE_AND_LOGS.md
src/history.js
```

Agregar `docs/processes/EXCEL_AND_CONSOLIDATION.md` si cambia `clave` o `fecha_embarque`.

No cambiar schema ni migraciones sin autorizacion explicita. No implementar la reestructura recomendada de historial sin permiso.

## Arquitectura / Dependencias / CLI

Leer:

```text
docs/architecture/ARCHITECTURE.md
package.json
```

Abrir los modulos de codigo solamente segun la responsabilidad afectada.

## Flujo Completo De Produccion

Leer:

```text
docs/processes/PRODUCTION_FLOW.md
```

Seguir sus enlaces hacia el tema especifico; no cargar todos los documentos por defecto.

## Control Center

Leer solamente:

```text
docs/sqlite/SQLITE_AND_LOGS.md
src/history.js
```

Enfocarse en `excel_path`, paths de corrida/item, `archivo`, `fecha_embarque`, `impreso` y `clave`.

No modificar `RMC Control Center` desde este repo salvo instruccion explicita.

## Tarea Solo De Documentacion

Leer:

```text
CURRENT_STATE.md
TASK_ROUTER.md
documento tematico afectado
```

Leer `README.md` solamente si cambia el indice ejecutivo, los modos, el flujo resumido, instalacion/checks o una invariante critica.

No reescribir `docs/ui/RMC_CEP_UI_UX_MANIFEST.md` completo para cambios ajenos a UI/UX.

## Si El Usuario Dice "Que tranza"

Responder corto usando `CURRENT_STATE.md` como fuente principal:

- Que es el repo.
- Estado actual.
- Modos activos.
- Validacion/generacion/impresion.
- SQLite.
- Pendientes.
- Checks.
