# RMC CEP UI/UX Manifest

Ultima actualizacion: 2026-06-15.

Este archivo define la estetica, estructura, reglas de interfaz y metricas visuales para paneles CEP de RMC.

Origen: el patron visual viene de `RMCOp-Nike`, que actualmente es la referencia con mejor apariencia.
Aplicacion en este repo: `RMC MockupTool` hereda esa identidad porque antes vivia anidado dentro de `RMCOp-Nike`,
pero debe mantenerse como CEP separado, con sus propios textos, rutas, README, historial y comportamiento.

Usalo como referencia para crear o ajustar otros paneles CEP de RMC con una identidad visual parecida.

## Objetivo De Diseno

Los paneles CEP de RMC deben sentirse como herramientas de produccion: compactas, claras, oscuras, rapidas y enfocadas en evitar errores.
No deben sentirse como landing pages, dashboards decorativos ni interfaces de marketing.

La prioridad es que el operador pueda:

- Seleccionar rapido.
- Revisar rutas y datos sin perderse.
- Detectar errores antes de procesar.
- Detectar PDFs existentes, faltantes y duplicados antes de regenerar lotes.
- Procesar lotes sin romper el flujo manual.
- Leer logs y estados dentro del panel.

## Paleta Base

Tomada de la familia visual de `RMCOp-Nike` y alineada con `css/styles.css` de este repo.

```css
:root {
  --bg: #1f2023;
  --panel: #292b30;
  --panel-2: #23252a;
  --field: #17191d;
  --line: #444952;
  --line-soft: #343941;
  --text: #f2f2ef;
  --muted: #aeb4bf;
  --muted-2: #7f8794;
  --accent: #b91f35;
  --accent-dark: #841727;
  --ok: #38c172;
  --danger: #c83f52;
  --focus: #f2c94c;
}
```

Uso recomendado:

- `--bg`: fondo general del panel.
- `--panel`: contenedores principales, tarjetas y bloques de revision.
- `--panel-2`: botones secundarios, tabs o superficies interactivas.
- `--field`: inputs, selects, filtros y superficies editables.
- `--line`: bordes discretos.
- `--line-soft`: bordes internos de baja jerarquia.
- `--text`: texto principal.
- `--muted`: etiquetas, ayudas y texto secundario.
- `--muted-2`: subtitulos y texto terciario.
- `--accent`: accion principal y paso activo.
- `--accent-dark`: hover de accion principal.
- `--ok`: estado listo, exito o corrida terminada.
- `--danger`: errores, estado offline o fallos.
- `--focus`: foco de teclado, advertencias suaves y timers importantes.

Colores auxiliares actuales:

- Exito/log corriendo heredado: `#7ee787`.
- Error heredado: `#ff6b6b`.
- Fondo consola: `#151719` o `#15171b`.
- Inputs heredados: `#181a1d`.

## Tipografia

- Fuente base: `Arial, Helvetica, sans-serif`.
- Fuente tecnica/rutas/logs: `Menlo, Monaco, Consolas, monospace`.
- Tamano base CEP: `12px`.
- Labels y ayudas: `9px` a `10px`.
- Titulos internos: `16px`, sin hero type.
- No usar letter spacing negativo.

## Layout General

El panel esta disenado para espacios pequenos dentro de Illustrator.

Reglas:

- `body` con padding compacto de `10px` a `14px`, segun ancho disponible.
- Ancho minimo operativo: `280px`.
- Navegacion por pasos, no sidebar pesada.
- Secciones con `display: none/block` para mostrar una pagina a la vez.
- Grids compactos de 2 o 3 columnas segun el contexto.
- Evitar cards anidadas.
- Usar paneles solo para agrupar informacion accionable.

Estructura recomendada:

```text
header marca/estado
nav pasos principales o tabs de modo
main
  page activa
log interno o panel de estado
footer credito
```

## Componentes Base

### Header

- Grid de 3 columnas cuando haya logos, titulo y accion rapida.
- Flex compacto cuando el panel solo necesite titulo y estado.
- Logos compactos.
- Accion rapida de reset como icon button.
- Borde inferior con `--line`.

### Navegacion

- Botones por paso.
- Paso activo con `--accent`.
- Texto corto: `1 Equipo`, `2 Pedido`, `3 Proceso`, `Por lote`, `Rutas`.

### Botones

- Radio de borde: `5px`.
- Altura minima: `30px` a `34px`.
- Boton primario: fondo `--accent`.
- Boton secundario: fondo oscuro `#24262a`, borde `#555b64`.
- Hover: cambiar borde, no hacer animaciones grandes.
- Focus: borde u outline visible con `--focus`.

### Inputs Y Selects

- Fondo `--field` o `#181a1d`.
- Borde `#555b64`.
- Radio `5px`.
- Altura minima `32px` a `33px`.
- Texto principal `--text`.
- Labels en `--muted`, `10px`.

### Tarjetas

- Usar solo para equipos, resumenes repetidos o bloques accionables.
- Fondo `--panel`.
- Borde `--line`.
- Radio `5px` o `6px`.
- Seleccion activa con borde `--accent` o variante fuerte heredada.

### Previews

- Imagen como `background-image`.
- `background-size: cover`.
- Borde interno oscuro.
- Placeholder visual cuando falte imagen.

### Batch / Produccion

- Mostrar conteos visibles: validas, errores, tallas.
- Timer con fuente monospace.
- Detalles largos en bloque con scroll.
- Filtros por style y talla como cards compactas.
- Para lotes con PDFs ya generados, mostrar conteos de existentes, faltantes, duplicados y omitidos.
- La accion segura debe permitir generar solo `FALTANTE` cuando el Excel fue actualizado despues del lote inicial.

### Logs

- Consola interna fija debajo del flujo.
- Fondo `#151719`.
- Monospace `10px` a `11px`.
- Colores por estado:
  - Exito: `#7ee787`.
  - Error: `#ff6b6b`.
  - Warning: `#f7c948`.

## Tono De UI

El texto debe ser directo y operativo.

Usar:

- `Importar Excel`
- `Elegir destino por lote`
- `Crear, aplicar y cerrar talla seleccionada`
- `Validar muestras de documento`
- `Sin Excel seleccionado`
- `Pendiente`

Evitar:

- Textos largos explicando funcionalidades dentro de la UI.
- Copys tipo marketing.
- Mensajes ambiguos como `Continuar` cuando la accion real es especifica.

## Reglas UX Para CEP De Produccion

- El operador siempre debe ver que selecciono antes de procesar.
- Rutas largas deben usar monospace y permitir wrap.
- Los errores no deben tumbar el panel completo; deben aparecer en log.
- Las acciones destructivas o de sobreescritura deben pedir confirmacion.
- Las acciones que pueden duplicar PDFs o registros de BD deben mostrar validacion previa.
- Los flujos manual y batch deben mantenerse separados.
- Los estados de batch deben incluir conteo de OK, errores y tiempo.
- No hardcodear rutas nuevas en archivos de coordinacion UI como `js/app.js`; usar configuracion o helpers.

## Manual Vs Batch

El flujo manual existe para pedidos individuales y pruebas controladas.
El flujo batch existe para produccion desde Excel.

No mezclar comportamiento entre ambos sin una razon clara.

## Validacion De Lotes Existentes

Para `RMC MockupTool`, el flujo batch debe considerar que el Excel `Por lote` puede cambiar despues de que ya se generaron PDFs. La UI debe soportar una revision previa antes de generar:

- `Esperados`: grupos consolidados segun Excel, filtros por style/talla y modo activo.
- `FALTANTE`: no existe PDF exacto y la clave no esta registrada; es lo unico que debe generar el flujo seguro.
- `YA_CREADO`: existe PDF exacto y la clave esta registrada en SQLite.
- `ARCHIVO_SIN_REGISTRO`: existe PDF exacto en disco pero falta el item en SQLite; requiere backfill o revision.
- `REGISTRADO_SIN_ARCHIVO`: la clave existe en SQLite pero el PDF exacto ya no esta en la carpeta elegida.
- `CONFLICTO`: claves o archivos destino duplicados dentro del Excel filtrado.

Reglas de interfaz:

- Mostrar estos conteos en el panel de revision o log antes de generar.
- El operador debe poder entender si se hara una generacion completa o parcial.
- El comportamiento seguro debe ser `solo FALTANTE`.
- Si hay `CONFLICTO`, detener la generacion y mostrar ejemplos.
- No generar ni registrar items durante la accion `Validar`; validar primero, generar despues.
- Mantener los filtros por style/talla como fuente del alcance de la validacion.
- En impresion, mostrar el orden real de envio a cola y mantener el orden invertido cuando se busque que la pila fisica quede como el Excel.

Reglas de BD para items:

- `rmc_mockuptool_runs.id` debe ser TEXT generado por el CEP en formato `AAAAMMDD-HHMMSS`, igual que `rmcop_nike_runs.id`.
- `rmc_mockuptool_items.run_id` debe apuntar a ese mismo valor textual.
- `rmc_mockuptool_items` debe seguir el orden operativo de `rmcop_nike_items`.
- `archivo` debe guardar solo el nombre del PDF, no rutas completas.
- `run_id` debe verse como `AAAAMMDD-HHMMSS`.
- `tiempo` debe usarse como duracion o marcador operativo, por ejemplo `00:00:00`; no mezclar fecha y hora aqui.
- Mantener `clave` como base anti-duplicados.

## Variantes RMCOp-Nike

Reglas heredadas de `RMCOp-Nike` que otros chats deben respetar cuando trabajen con ese flujo o con un CEP derivado:

- `Standard`: texto.
- `Throwback`: texto con sufijo `TB`; no es Indigenous Heritage.
- `Indigenous Heritage`: numero armado con arte/raster; conservar gap obligatorio de `0.25in` entre digitos.

## Metricas Auditables

Estas metricas convierten el manifiesto en una revision objetiva antes de cerrar cambios de UI.

| Area | Criterio | Umbral |
| --- | --- | --- |
| Ancho compacto | El panel no debe desbordar horizontalmente. | Funcional desde `280px`. |
| Densidad | Controles principales deben mantenerse compactos. | Botones/inputs entre `30px` y `34px` de alto. |
| Foco | Todo control interactivo debe mostrar foco visible. | Borde u outline con `--focus`. |
| Accion principal | Cada pantalla debe tener una accion primaria clara. | Identificable en menos de 2 segundos. |
| Logs | El estado debe quedar dentro del panel. | Scroll interno, monospace, sin romper layout. |
| Rutas | Rutas largas deben seguir siendo legibles. | Wrap o scroll horizontal controlado; sin overflow de pagina. |
| Batch | El operador debe ver resultado y alcance. | OK, errores/faltantes, seleccionados y salida visibles. |
| Validacion | El operador debe ver existentes/faltantes antes de regenerar. | Conteos y primeros casos visibles. |
| Manual/Batch | Los flujos no deben mezclarse accidentalmente. | Tabs, pasos o secciones separadas. |
| Cards | No crear decoracion innecesaria. | 0 cards anidadas; cards solo para grupos accionables. |
| Texto UI | El copy debe ser operacional. | Sin marketing, sin parrafos explicativos largos. |

## Prompt Para Otro Chat

Puedes pegar esto en otro chat:

```text
Analiza el archivo RMC_CEP_UI_UX_MANIFEST.md y crea una interfaz CEP con estetica RMC similar.
El patron visual viene de RMCOp-Nike, pero adapta nombres, rutas y comportamiento al repo actual:

- Tema oscuro compacto.
- Paleta basada en variables CSS del manifiesto y del `css/styles.css` existente.
- Interfaz de produccion, no landing page.
- Navegacion por pasos.
- Botones primarios rojos, foco amarillo, logs monospace.
- Inputs compactos y legibles.
- Cards solo para elementos repetidos o accionables.
- Respetar flujos separados: manual, batch, rutas/logs.
- Texto corto, operativo y claro.
- No usar heroes, gradientes decorativos ni UI de marketing.

Antes de implementar, revisa el CSS existente del proyecto y copia sus patrones de espaciado, radios, botones, formularios, timers, logs y tarjetas.
No mezcles repos: si el repo actual es RMC MockupTool, conserva su identidad funcional aunque use la estetica heredada de RMCOp-Nike.
```

## Checklist Visual

Antes de cerrar cualquier nuevo CEP:

- Los textos caben en botones y cards.
- El foco de teclado se ve.
- El panel funciona en ancho compacto.
- Los logs se leen sin romper layout.
- Las rutas largas no desbordan.
- El paso activo es evidente.
- La accion principal de cada pantalla se identifica en menos de 2 segundos.
- No hay cards dentro de cards.
- No hay decoracion innecesaria.
