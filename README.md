# RMC MockupTool

Extension CEP separada para Adobe Illustrator. Genera mockups PDF listos para imprimir desde listas Nike On Demand.

Este repo es herramienta hermana de `RMCOp-Nike`, no modulo interno del panel Nike. Mantener repos, README, dependencias y memoria separados.

## Alcance

- Leer Excel de `Por lote` y `Genericas/Muestras`.
- Detectar familia de style, equipo, version y mockup PDF base.
- Estampar fecha, WO, style, talla/roster, piezas y firma.
- Generar PDFs en carpeta de salida.
- Preparar cola de impresion desde los PDFs ya generados, respetando orden del Excel y filtros por style/talla.
- Validar lotes ya generados contra el Excel para detectar PDFs existentes y faltantes antes de regenerar.
- Trabajar dentro de Illustrator como panel CEP, sin navegador ni server local.

## Instalacion Local

Carpeta CEP esperada:

```text
/Users/rmlsub1/Library/Application Support/Adobe/CEP/extensions/RMC MockupTool
```

Instalar dependencias:

```bash
npm install
```

Abrir Illustrator y buscar el panel:

```text
Ventana > Extensiones > RMC MockupTool
```

## Repo Remoto

Remoto esperado:

```text
https://github.com/albertormc63-cpu/RMC-MockupTool.git
```

Alterno SSH:

```text
git@github.com:albertormc63-cpu/RMC-MockupTool.git
```

## Estructura

```text
CSXS/manifest.xml      Registro CEP para Illustrator
index.html             UI del panel
css/styles.css         Estilos del panel
js/CSInterface.js      Bridge CEP oficial
js/app.js              Coordinacion UI + Node
src/generate.js        Core de lectura Excel y escritura PDF
package.json           Dependencias Node
```

## Checks

```bash
npm run check
```

## Flujo Operativo Actual

El flujo real de produccion Nike On Demand queda asi:

- Jueves: se genera la lista `Por lote`.
- Viernes: se procesa el mismo Excel en `RMCOp-Nike`.
- Despues: se generan los PDFs en `RMC MockupTool`.
- Lunes: los impresores empiezan a trabajar.

Riesgo operativo detectado: el lunes a veces se agregan mas pedidos al mismo Excel `Por lote`. Como ese Excel se comparte entre `RMCOp-Nike` y `RMC MockupTool`, el panel debe poder comparar la lista cargada contra la carpeta de PDFs ya generados.

Objetivo del siguiente ajuste:

- Leer el Excel cargado y construir la lista esperada de PDFs por WO/roster, style, talla y carpeta de salida.
- Revisar en disco cuales PDFs ya existen.
- Mostrar resumen de existentes, faltantes y duplicados antes de generar.
- Permitir generar solo los faltantes.
- Evitar duplicar PDFs y evitar registros duplicados en la BD de historial.
- Mantener filtros por style/talla para que la validacion pueda hacerse por rango operativo.

## Historial y Logs

El panel registra cada corrida terminada en una base SQLite central para que otros CEPs puedan convivir en la misma BD con sus propias tablas.

BD central:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
```

Tabla de este CEP:

```text
rmc_mockuptool_runs
```

Tambien se mantiene un registro de apps/tablas disponibles:

```text
cep_registry
```

Logs JSON por corrida:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC MockupTool portafolio interno/06_Logs
```

Campos principales guardados por corrida:

- Fecha en formato `DD/MM/AAAA`.
- Hora en formato `HH:MM:SS`.
- Seccion: `Por lote` o `Genericas Muestras`.
- Excel y disenador.
- Filas Excel, filas seleccionadas, grupos consolidados, PDFs generados y mockups faltantes.
- Styles y tallas como texto legible.

La tabla `rmc_mockuptool_runs` es intencionalmente corta para consulta diaria. Los detalles tecnicos de respaldo se guardan en logs JSON dentro de `06_Logs`, no como columnas de la tabla.

Cuando se agregue la validacion de existentes/faltantes, el historial debe registrar una corrida como regeneracion parcial cuando aplique. Idealmente debe separar:

- `existentes`: PDFs detectados antes de generar.
- `faltantes`: PDFs esperados que no estaban en disco.
- `generados`: PDFs creados en esa corrida.
- `omitidos`: PDFs no generados porque ya existian.
- `duplicados`: candidatos multiples encontrados para la misma clave.

Para revisar o borrar pruebas manualmente, usar DB Browser for SQLite o SQLiteStudio y abrir `RMC_BD/RMC_CEP.sqlite`.

## Validacion De PDFs Existentes

Estado: pendiente de implementar.

La validacion debe reutilizar la misma logica de nombres y carpetas que `generateMockups`:

```text
Por lote/<Excel>/<StyleFamily>/<Talla>/<WO> - <Equipo> - <Style> - <Qty>pz.pdf
Genericas Muestras/<Excel>/<StyleFamily>/<Fecha>/<Roster>.pdf
```

Reglas deseadas:

- Si existe el PDF exacto esperado, marcarlo como existente y no regenerarlo por default.
- Si no existe el exacto, buscar candidatos por WO en `Por lote` o por roster/WO en `Genericas`.
- Si hay candidatos multiples como `archivo.pdf` y `archivo 2.pdf`, elegir el base para impresion, pero marcar duplicado para revision.
- Si el Excel nuevo trae filas adicionales, generar solo esas faltantes.
- La UI debe tener una accion tipo `Validar PDFs` o integrarlo antes de `Generar PDFs`.
- El boton `Generar PDFs` debe poder operar en modo completo o `solo faltantes`; el modo seguro por default debe ser `solo faltantes` cuando existan archivos previos.
- No borrar ni reemplazar PDFs existentes sin confirmacion explicita.

## Impresion

El panel incluye dos acciones para impresion:

- `Revisar cola`: arma una lista de PDFs existentes usando los filtros activos de style/talla. No imprime. La cola se muestra en orden de envio a impresora.
- `Imprimir cola`: pide confirmacion y manda cada PDF a `lp`. Usa la impresora predeterminada de macOS, opciones `fit-to-page` y `landscape`, y orden inverso al Excel para que la pila fisica quede arriba-abajo como el Excel.

Para evitar dobles impresiones, si existen copias como `archivo.pdf` y `archivo 2.pdf`, se elige el nombre base y se deja aviso en el log.

## Notas

- No mezclar este repo con `RMCOp-Nike`.
- La impresion usa `lp`; probar en macOS real con la impresora predeterminada correcta antes de usar en produccion.
- Si se cambian coordenadas o rutas de mockups, documentarlo aqui.
