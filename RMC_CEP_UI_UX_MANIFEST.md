# RMC CEP UI/UX Manifest

Ultima actualizacion: 2026-06-17.

Contrato visual y operativo de `RMC MockupTool`. El panel hereda la identidad de RMCOp-Nike, pero mantiene codigo, textos, rutas y tablas propias.

El comportamiento funcional detallado vive en `README.md`. Este archivo define como debe presentarse ese comportamiento y que protecciones no pueden perderse al modificar la interfaz.

## Objetivo

El CEP es una herramienta de produccion compacta para Illustrator. Debe permitir que el operador identifique rapidamente:

- Que seccion esta activa.
- Que Excel y destino selecciono.
- Que Style y tallas entran en el proceso.
- Que archivos faltan, existen o presentan inconsistencias.
- Que se generara o imprimira antes de ejecutar la accion.
- Donde se guardaron PDFs, historial y logs.

No debe sentirse como landing page, dashboard decorativo ni sistema administrativo general.

## Jerarquia Actual

```text
header
  logo RMC
  reset
  estado CEP
workspace
  panel principal
    tabs Personalizadas / Genericas
    Excel
    Salida
    Disenador
    Validar / Generar PDFs / Revisar cola / Imprimir cola
  panel lateral
    resumen
    filtros Style / Tallas
consola
footer
```

El primer viewport debe mostrar el trabajo real, no una portada.

## Paleta

La fuente de verdad es `css/styles.css`. Base vigente:

```css
:root {
  --rmc-bg: #2b2b2b;
  --rmc-surface: #3a3a3a;
  --rmc-surface-soft: #333333;
  --rmc-surface-deep: #1e1e1e;
  --rmc-field: #181a1d;
  --rmc-border: #444444;
  --rmc-border-strong: #666666;
  --rmc-text: #ffffff;
  --rmc-muted: #cccccc;
  --rmc-primary: #821424;
  --rmc-primary-hover: #a21a2f;
  --rmc-primary-strong: #bd1f36;
  --rmc-focus: #f7c948;
}
```

Colores de consola:

- Texto base: `#00ff00`.
- Exito: `#50fa7b`.
- Error: `#ff5555`.
- Warning: `#f1fa8c`.
- Fondo profundo: `#1e1e1e`.

Evitar gradientes decorativos, orbes, ilustraciones de marketing y paletas dominadas por un solo tono.

## Tipografia Y Densidad

- Base: `Arial, Helvetica, sans-serif`.
- Rutas y logs: `Menlo, Monaco, Consolas, monospace`.
- Texto base CEP: alrededor de `12px`.
- Labels y ayudas: `9px` a `10px`.
- Titulos internos: maximo aproximado `16px`.
- Letter spacing: `0`; nunca negativo.
- Botones e inputs: entre `30px` y `34px` de alto.
- Radios de borde: `5px` o `6px`; nunca estilo capsula salvo estado compacto existente.

## Layout

- Tamano inicial CEP: `620x760`.
- Minimo declarado: `420x560`.
- Maximo declarado: `1100x1200`.
- El contenido debe responder sin overflow horizontal.
- Usar grids compactos; no cards dentro de cards.
- Las rutas largas deben envolver o usar overflow controlado.
- Resumen, filtros y consola deben conservar dimensiones estables al cambiar conteos.
- En anchos reducidos, priorizar Excel, salida, acciones y log.

## Controles

### Header

- Logo centrado.
- Reset como boton de icono con `title` y `aria-label`.
- Estado CEP visible: listo o sin Node.
- Reset limpia Excel, filtros y validacion en memoria; nunca borra archivos o BD.

### Seccion

- Control segmentado con `Personalizadas` y `Genericas`.
- La opcion activa debe distinguirse con `--accent`.
- El cambio de seccion invalida la validacion, limpia el Excel seleccionado y reinicia los filtros; no reutiliza ni vuelve a analizar el archivo anterior.
- No usar las etiquetas antiguas `Por lote` o `Genericas Muestras`.

### Selectores

- Excel y salida son campos readonly con boton de exploracion.
- El destino siempre lo selecciona el usuario.
- Mockups, firmas y fuente permanecen ocultos mientras sean configuracion estable.
- Rutas seleccionadas deben permanecer visibles y legibles.

### Disenador

Select con:

- `F-ALBERTO`
- `F-THANIA`
- `F-ANTONIO`

### Filtros

- Style se presenta por familia.
- `Todos` debe reflejar el estado real del grupo.
- Tallas se muestran solamente en Personalizadas.
- Las tallas disponibles se recalculan segun Styles activos.
- Seleccionar una talla incluye el pedido consolidado completo cuando comparte Ship Order, WO, Style y equipo con otras tallas.
- Un pedido multitalle debe mostrarse y procesarse una sola vez con su talla combinada, por ejemplo `2XL-XLG`.
- Cambiar un filtro invalida la validacion incremental.
- Cambiar de seccion limpia el Excel y restablece Style/tallas a `Todos`, dejando lista la seleccion del archivo correcto.

### Acciones

- `Validar`: secundaria y no destructiva.
- `Generar PDFs`: accion primaria.
- `Revisar cola`: secundaria y no imprime.
- `Imprimir cola`: accion sensible; pide confirmacion.
- Mientras una accion esta en curso, los cuatro botones quedan deshabilitados.
- El texto del boton debe describir la accion; no usar `Continuar` o copys ambiguos.

## Validacion De Seccion

Antes de leer el archivo:

- `OD` corresponde a Personalizadas.
- `ST`, `IH`, `TB` y `AS` corresponden a Genericas.
- Los codigos deben ser tokens aislados.
- Nombre sin codigo: bloquear.
- Codigo de otra seccion: bloquear y explicar donde corresponde.
- OD mezclado con codigo de Genericas: bloquear como ambiguo.
- No cambiar de seccion automaticamente.

El error debe aparecer en consola con prefijo `EXCEL NO CARGADO` y el Excel no debe poblar filtros ni resumen.

## Resumen

El bloque `Revision` muestra:

- Modo.
- Filas o alcance actual.
- Styles activos.
- Tallas activas; en Genericas debe comunicar que no aplica.

No usar este bloque para explicaciones largas. El detalle pertenece a la consola.

## Validacion Incremental

`Validar` es una operacion de lectura. No genera, imprime ni registra.

Estados obligatorios:

| Estado | Significado visual | Severidad |
| --- | --- | --- |
| `FALTANTE` | No hay archivo ni clave | Accionable |
| `YA_CREADO` | Archivo y clave existen | Correcto |
| `ARCHIVO_SIN_REGISTRO` | Archivo sin item SQLite | Warning |
| `REGISTRADO_SIN_ARCHIVO` | Item SQLite sin archivo | Warning |
| `CONFLICTO` | Clave o destino duplicado | Error bloqueante |

La consola debe mostrar:

- Seccion y fecha de embarque.
- Filas Excel, seleccionadas y grupos consolidados.
- Conteo de cada estado.
- Conteos separados de impresos y pendientes de impresion.
- Conteo de pedidos multitalle consolidados; no presentarlos como `CONFLICTO`.
- Styles y tallas aplicables.
- Salida calculada.
- Primeros estados y primeros conflictos.

Reglas:

- Generar solamente `FALTANTE`.
- Si no hay faltantes, informar y terminar sin registrar corrida.
- Si existe `CONFLICTO`, bloquear generacion.
- Las inconsistencias archivo/BD se muestran como warning y no se regeneran automaticamente.
- `impreso` es informativo para impresion y no modifica el estado de generacion.
- Cambiar Excel, salida, modo o filtros invalida la validacion.
- `Generar PDFs` vuelve a validar antes de escribir.

## Generacion

Al terminar, la consola debe indicar:

- Seccion y fecha de embarque.
- Filas Excel, seleccionadas y grupos consolidados.
- Faltantes validados.
- PDFs generados y mockups faltantes.
- Items registrados.
- Styles y tallas.
- Disenador y salida.
- Ruta de BD y log JSON.
- Primeros archivos generados.

No ocultar errores de historial: el PDF puede haberse generado aunque SQLite falle, por lo que el warning debe ser visible.

## Nombres Y Carpetas

La UI y sus mensajes deben reflejar estas reglas:

- Personalizadas: carpeta `Personalizadas`, archivo iniciado por WO.
- Genericas: carpeta `Genericas`, archivo iniciado por Roster.
- Genericas no lleva WO al inicio del archivo.
- Ambas se separan por nombre de Excel y familia de Style.
- Personalizadas agrega carpeta de talla.
- Genericas agrega carpeta de fecha `Emb`.
- El destino mostrado es la raiz seleccionada; el log debe mostrar la salida calculada completa.

## Fecha De Embarque

- Es distinta de fecha/hora de proceso.
- Se presenta y registra como `DD/MM`.
- Personalizadas obtiene el valor del titulo del Excel.
- Genericas obtiene el valor de `Emb`.
- Si existen varias fechas, el run puede mostrar una lista; cada item conserva la propia.
- Nunca mostrar formatos mezclados como `17-JUN` y `17-Jul` en BD o resumen normalizado.

## Impresion

`Revisar cola` debe mostrar orden, coincidencia, faltantes y duplicados sin ejecutar `lp`.

Tambien debe mostrar `IMPRESO`, `NO IMPRESO` o `SIN REGISTRO` por item, junto con los totales ya impresos y pendientes.

Para pedidos multitalle, la cola debe usar exclusivamente el PDF consolidado. No aceptar como reemplazo un PDF ubicado en una carpeta de talla individual y no repetir el pedido por cada fila original.

`Imprimir cola` debe:

- Recalcular la cola.
- Bloquear si no hay PDFs.
- Mostrar confirmacion con cantidad y warnings.
- Advertir cuantos PDFs ya estaban marcados como impresos; permitir reenvio solamente despues de la confirmacion existente.
- Explicar que se envia de abajo hacia arriba para ordenar la pila como el Excel.
- Usar `landscape` y `fit-to-page`.
- Reportar enviados y fallidos.
- Marcar `impreso=1` unicamente para claves cuyo comando `lp` termino correctamente.

En UI, `impreso` significa enviado correctamente a la cola de macOS, no confirmacion fisica del papel. Un fallo al actualizar SQLite despues del envio debe mostrarse como warning independiente.

Los duplicados no se imprimen dos veces por defecto: se prefiere el nombre base y se informa la cantidad de candidatos.

## Consola

- Siempre visible debajo del flujo.
- Monospace entre `10px` y `11px`.
- Scroll interno.
- Boton `Limpiar` afecta solo la vista.
- Errores en rojo, warnings en amarillo y exito en verde.
- Limitar lineas en memoria para no degradar el panel.
- No usar alerts para validaciones normales; reservar confirmacion modal para imprimir.

## Estado Y Errores

- Sin Node: mostrar `Sin Node` y deshabilitar acciones.
- Error de lectura: mantener panel vivo y escribir detalle en consola.
- Firma SVG sin PNG/JPG: error explicito.
- Mockup no resuelto: continuar con otros items y contarlo como faltante.
- Fallo SQLite: mostrar warning sin fingir que el item quedo registrado.
- Fallo `lp`: listar archivo y error.

## Contrato SQLite Visible Desde UI

- Herramientas: `RMC MockupTool Personalizada` y `RMC MockupTool Genericas`.
- Secciones: `Personalizadas` y `Genericas`.
- Run ID: `AAAAMMDD-HHMMSS`.
- Fecha de proceso: `DD/MM/AAAA`.
- Hora: `HH:MM:SS`.
- Fecha de embarque: `DD/MM`.
- `archivo`: nombre, no ruta completa.
- `clave`: identificador antiduplicado.
- `impreso`: INTEGER `0/1`; nuevos items inician en `0`, items aceptados por `lp` pasan a `1`.
- No tocar tablas `rmcop_nike_*`.

## Accesibilidad Operativa

- Todo control debe tener foco visible con `--focus`.
- Botones de icono requieren tooltip y nombre accesible.
- Labels deben estar asociados con sus controles.
- No depender solo del color para distinguir estado; incluir texto.
- Los textos deben caber sin solaparse en el minimo declarado.
- El orden de tabulacion debe seguir el flujo visual.

## Metricas De Revision

| Area | Criterio |
| --- | --- |
| Seccion | Activa evidente y sin etiquetas antiguas |
| Excel | Codigo validado antes de cargar |
| Destino | Elegido manualmente y visible |
| Filtros | Styles/tallas coherentes con el modo |
| Validacion | Cinco estados y conteos visibles |
| Generacion | Solo faltantes, conflictos bloqueados |
| Nombres | WO para Personalizadas, Roster para Genericas |
| Fecha | `fecha_embarque` visible como `DD/MM` |
| Impresion | Estado impreso separado de la validacion de generacion |
| Historial | BD/log reportados o warning explicito |
| Impresion | Preview, confirmacion, orden y errores visibles |
| Compacto | Sin overflow en `420px` de ancho |
| Cards | Cero cards anidadas |
| Texto | Operativo, corto y sin marketing |

## Checklist Antes De Cerrar Cambios

- Probar Personalizadas con nombre OD valido e invalido.
- Probar Genericas con ST/IH/TB/AS valido e invalido.
- Confirmar que cambiar modo o filtros invalida la validacion.
- Confirmar que `Validar` no modifica disco ni SQLite.
- Confirmar conteos de los cinco estados.
- Confirmar que un conflicto bloquea `Generar PDFs`.
- Confirmar nombres y carpetas de ambos modos.
- Confirmar `fecha_embarque` como `DD/MM` en runs e items.
- Confirmar preview de impresion antes de ejecutar `lp`.
- Confirmar que un `lp` exitoso marca `impreso=1` y uno fallido conserva `0`.
- Confirmar que filtrar una talla de un pedido multitalle conserva todas sus tallas y produce una sola entrada de cola.
- Ejecutar `npm run check`.
- Revisar layout en ancho minimo y tamano inicial.
- Actualizar `README.md` si cambia logica, esquema, nombres o rutas.
