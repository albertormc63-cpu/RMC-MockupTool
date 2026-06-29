# RMC MockupTool - Estado Actual

Última revisión: 2026-06-22

## Qué Es

`RMC MockupTool` es un CEP independiente para Adobe Illustrator que lee listas Nike, valida trabajo previo, genera PDFs anotados de mockups y permite revisar/imprimir cola respetando el orden operativo del Excel.

Es repo hermano de `RMCOp-Nike`, pero no comparte código, tablas ni reglas de escritura. Sólo comparte la base SQLite central mediante tablas propias.

## Modos Activos

| UI               | Modo interno | Excel válido                  | Herramienta SQLite             |
| ---------------- | ------------ | ----------------------------- | ------------------------------ |
| `Personalizadas` | `bulk`       | token `OD`                    | `RMC MockupTool Personalizada` |
| `Genericas`      | `samples`    | token `ST` + variantes activas de `rmc_nike_style_variants` | `RMC MockupTool Genericas`     |

## Flujo Principal

```text
Preparar -> Validar -> Generar -> Registrar -> Imprimir
```

* Preparar: seleccionar Excel, salida, diseñador y filtros.
* Validar: calcular plan contra archivos y SQLite.
* Generar: procesar únicamente faltantes.
* Registrar: escribir corrida/items sólo después de generar PDFs.
* Imprimir: revisar cola, confirmar, ejecutar `lp` y marcar impresos.

## Invariantes Críticas

* `Validar` no escribe disco ni SQLite.
* `Generar PDFs` procesa sólo `FALTANTE`.
* Si hay `CONFLICTO`, no generar.
* No reemplazar PDFs existentes.
* No crear corrida si no hay faltantes.
* No usar `impreso` para decidir regeneración.
* `impreso=1` significa que macOS aceptó el trabajo en cola, no que la impresora ya imprimió físicamente.
* Personalizadas inicia archivos con WO.
* Genericas inicia archivos con Roster y no agrega WO al inicio.
* Multitalle se consolida antes del filtro de talla.
* Una plantilla multitalle se genera/imprime una sola vez.

## SQLite

Base central:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
```

Tablas propias:

```text
rmc_mockuptool_runs
rmc_mockuptool_items
cep_registry
```

No tocar:

```text
rmcop_nike_runs
rmcop_nike_items
rmcop_nike_git_commits
```

## Checks

```bash
npm run check
```

Valida sintaxis de:

* `src/generate.js`
* `src/history.js`
* `js/app.js`

y ejecuta la regresión:

* `tests/consolidation.test.js`
