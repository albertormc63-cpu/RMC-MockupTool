# Validacion Y Generacion

## Validacion Incremental

`Validar` construye todos los nombres esperados y compara cada grupo con el destino seleccionado y `rmc_mockuptool_items`. No genera PDFs, no registra corridas y no escribe items.

| Estado | Archivo esperado | Clave SQLite | Accion |
| --- | --- | --- | --- |
| `FALTANTE` | No | No | Puede generarse |
| `YA_CREADO` | Si | Si | Se omite |
| `ARCHIVO_SIN_REGISTRO` | Si | No | Se omite y requiere revision/backfill |
| `REGISTRADO_SIN_ARCHIVO` | No | Si | Se omite y requiere revision |
| `CONFLICTO` | Duplicado en Excel filtrado | No aplica | Bloquea la generacion |

Un conflicto aparece si dos grupos producen la misma `clave` o el mismo archivo destino.

## Estado De Impresion

La impresion se revisa como una dimension independiente del estado de generacion:

- `IMPRESO`: la clave existe y `impreso=1`.
- `NO IMPRESO`: existe PDF y registro, pero `impreso=0`.
- `SIN REGISTRO`: no existe item donde guardar el estado de impresion.

La validacion muestra totales de `IMPRESOS` y `PENDIENTES DE IMPRESION`. Esta bandera nunca convierte un item en `FALTANTE` ni provoca que se regenere el PDF.

## Generacion Segura

`Generar PDFs` siempre vuelve a validar.

- Si no hay faltantes, la UI termina sin crear corrida.
- Si existe `CONFLICTO`, la generacion se bloquea.
- Si existen faltantes, procesa solamente esos grupos.
- Las inconsistencias archivo/BD se muestran como warning y no se regeneran automaticamente.
- Un mockup base ausente se reporta y no crea item SQLite.
- Un archivo existente no se reemplaza.

## Resultado Y Registro

Por cada PDF generado correctamente:

1. Se escribe el archivo en su ruta final.
2. Se prepara el item con nombre, ruta, clave y datos operativos.
3. Al terminar la corrida se registra el run.
4. Se registran los items generados.
5. Se conserva un log JSON tecnico.

La consola debe mostrar filas Excel, seleccionadas, grupos consolidados, pedidos multitalle, faltantes validados, PDFs generados, mockups faltantes, items registrados, filtros, disenador, salida, BD y log.

El PDF puede existir aunque falle SQLite. El warning de historial debe permanecer visible para permitir reconciliacion posterior.

## Reglas Criticas

- Validar primero y generar despues.
- `Validar` no escribe archivos ni SQLite.
- Generar solamente `FALTANTE`.
- No crear corrida si no hay faltantes.
- No reemplazar PDFs existentes.
- No usar `impreso` para decidir regeneracion.
- Consolidar multitalle antes del filtro y producir una sola plantilla.
- Guardar `fecha_embarque` como `DD/MM`.
- Guardar rutas completas de Excel, corrida y PDF.

La persistencia detallada se documenta en [`../sqlite/SQLITE_AND_LOGS.md`](../sqlite/SQLITE_AND_LOGS.md).
