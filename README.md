# RMC MockupTool

Extension CEP para Adobe Illustrator que lee listas Nike, valida trabajo previo y genera PDFs anotados de mockups. Tambien permite revisar e imprimir los PDFs existentes respetando el orden operativo del Excel.

Este proyecto es hermano de `RMCOp-Nike`, pero es un CEP independiente. No comparte codigo, tablas ni reglas de escritura con ese repo; solamente utiliza la misma base SQLite central mediante tablas propias.

## Estado Actual

El CEP trabaja con dos secciones visibles:

| Seccion UI | Modo interno | Excel admitido | Herramienta en BD |
| --- | --- | --- | --- |
| `Personalizadas` | `bulk` | Nombre con token `OD` | `RMC MockupTool Personalizada` |
| `Genericas` | `samples` | Nombre con token `ST`, `IH`, `TB` o `AS` | `RMC MockupTool Genericas` |

No usar `Por lote`, `Genericas Muestras` ni `RMC MockupTool Por Lote` en registros nuevos.

## Flujo Del Operador

1. Abrir `Ventana > Extensiones > RMC MockupTool` en Illustrator.
2. Elegir `Personalizadas` o `Genericas`.
3. Seleccionar el Excel. El nombre se valida antes de leerlo.
4. Seleccionar manualmente la carpeta raiz de salida.
5. Elegir disenador.
6. Revisar las familias de Style y, en Personalizadas, las tallas.
7. Pulsar `Validar` para comparar Excel, archivos y SQLite sin generar nada.
8. Pulsar `Generar PDFs`. El CEP vuelve a validar y procesa solamente `FALTANTE`.
9. Usar `Revisar cola` antes de `Imprimir cola` cuando se requiera impresion.

El destino nunca se decide automaticamente. El operador elige la raiz; el CEP agrega la seccion, el nombre del Excel y las carpetas operativas.

## Validacion Del Nombre Del Excel

Los codigos se reconocen como tokens aislados, no como fragmentos dentro de otras palabras.

- Personalizadas requiere `OD`.
- Genericas requiere al menos uno de `ST`, `IH`, `TB` o `AS`.
- `NIKE OD 26 JUN.xlsx` es valido en Personalizadas.
- `NIKE ST 17 JUL.xlsx` es valido en Genericas.
- Un OD seleccionado en Genericas se bloquea.
- Un ST/IH/TB/AS seleccionado en Personalizadas se bloquea.
- Un nombre sin codigo reconocido se bloquea.
- Un nombre que mezcla OD con codigos de Genericas se considera ambiguo y se bloquea.

La proteccion existe en `js/app.js` al examinar y en `src/generate.js` antes de validar, generar o preparar impresion. El CEP no cambia de seccion automaticamente; muestra la seccion correcta en el log.

## Formato De Excel

### Personalizadas / OD

Se usa la primera hoja. La lectura actual espera:

- Titulo en fila 2, columna A. De ahi se obtiene la fecha operativa, por ejemplo `26 JUNIO`.
- Encabezados hasta la fila 3.
- Datos desde la fila 4.
- Columnas fijas: A Ship Order, B WO, C Style, D Color/Equipo, E Talla, F Piezas, G Apellido, H Numero.

Una fila se conserva si contiene Ship Order, WO, Style o Color.

### Genericas / ST-IH-TB-AS

Se usa la primera hoja. El CEP busca el encabezado dentro de las primeras 25 filas. Para reconocerlo deben existir WO, Style, Roster y cantidad. Si no lo encuentra, usa la fila 2 como respaldo.

Alias aceptados:

| Dato | Encabezados aceptados |
| --- | --- |
| WO | `WO`, `WO#`, `WORK ORDER` |
| Style | `STYLE`, `ESTILO` |
| Roster | `ROSTER`, `ROSTER#` |
| Piezas | `QTY`, `PZS`, `PZ`, `QTY/PZS` |
| Equipo | `COLOR`, `COLOR / EQUIPO`, `EQUIPO`, `TEAM` |
| Embarque | `FECHA EMBARQUE`, `EMBARQUE`, `EMB`, `SHIP DATE` |

Una fila se conserva si contiene WO, Style, Roster o Color/Equipo.

## Interpretacion De Pedidos

### Familia Y Linea

- Styles `A1000...` y `Y1000...` pertenecen a PLL.
- Styles `A2000...` y `Y2000...` pertenecen a WLL.
- La familia de salida es el prefijo `A####` o `Y####`; si no se reconoce se usa `SIN_STYLE`.

### Variante

- Sufijo `IH`: Indigenous Heritage.
- Sufijo `TB`: Throwback.
- Sufijo `H`: Standard Home.
- Sufijo `A`: Standard Away.
- En Genericas, linea y variante tambien pueden inferirse desde el texto de Color/Equipo.

### Equipos Reconocidos

PLL: Archers, Atlas, Cannons, Chaos, Outlaws, Whipsnakes, Waterdogs y Redwoods.

WLL: Guard, Palms, Charm y Charging.

Si no se puede resolver linea, equipo, variante o version Standard, no existe una ruta valida de mockup y el item se reporta como mockup faltante durante la generacion.

## Filtros Y Consolidacion

- Los filtros de Style trabajan por familia, por ejemplo `A1000`.
- Las tallas se muestran solamente en Personalizadas y dependen de las familias seleccionadas.
- Cambiar Excel, seccion, destino, Style o talla invalida la validacion previa.
- La validacion vigente se identifica por Excel, destino, modo y filtros.

Personalizadas consolida por:

```text
Ship Order + WO + Style + Color/Equipo
```

Suma piezas y combina tallas diferentes en el orden encontrado, por ejemplo `XLG-LGE`. El grupo consolidado produce un PDF.

Genericas consolida por:

```text
WO + Roster + Style + Color/Equipo
```

Suma piezas y no usa jugador, apellido ni numero en la clave.

## Mockups Y Anotacion PDF

Raiz predeterminada de mockups:

```text
/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/MOCKUPS
```

Resolucion de archivos base:

```text
STANDARD/<MASCULINO|FEMENINO>/<Linea> <Ciudad> <Equipo> <Home|Away>.pdf
INDIGENOUS HERITAGE/<Linea> <Ciudad> <Equipo> IH.pdf
THROWBACK/<Linea> <Ciudad> <Equipo> TB.pdf
```

Personalizadas estampa fecha del titulo, WO, Style, piezas, talla y firma. Genericas estampa fecha de `Emb`, WO, Roster, Style, piezas y firma.

Fuente preferida:

```text
/Users/rmlsub1/Library/Fonts/Aldrich-Regular.ttf
```

Si Aldrich no existe se usa Helvetica Bold. Las firmas deben ser PNG, JPG o JPEG. Un SVG sin version raster provoca error para evitar una firma invisible.

Disenadores admitidos:

- `F-ALBERTO`
- `F-THANIA`
- `F-ANTONIO`

## Carpetas Y Nombres De Salida

Raiz predeterminada, modificable manualmente:

```text
/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND
```

Personalizadas:

```text
<raiz>/Personalizadas/<Excel sin extension>/<StyleFamily>/<Talla>/
<WO> - <Linea Ciudad Equipo> - <Style> - <Piezas>pz.pdf
```

Genericas:

```text
<raiz>/Genericas/<Excel sin extension>/<StyleFamily>/<Emb>/
<Roster> - <Linea Ciudad Equipo> - <Style> - <Piezas>pz.pdf
```

Reglas importantes:

- Personalizadas inicia el archivo con WO.
- Genericas inicia con Roster y no agrega WO al nombre.
- La carpeta fisica `<Emb>` conserva el valor operativo del Excel sanitizado.
- Las familias separan adulto/nino y hombre/mujer mediante `A1000`, `Y1000`, `A2000`, `Y2000`, etc.
- El CEP no reemplaza archivos existentes ni crea copias durante el flujo seguro.

## Validacion Incremental

`Validar` construye todos los nombres esperados y compara cada grupo con el destino seleccionado y `rmc_mockuptool_items`. No genera PDFs, no registra corridas y no escribe items.

| Estado | Archivo esperado | Clave SQLite | Accion |
| --- | --- | --- | --- |
| `FALTANTE` | No | No | Puede generarse |
| `YA_CREADO` | Si | Si | Se omite |
| `ARCHIVO_SIN_REGISTRO` | Si | No | Se omite y requiere revision/backfill |
| `REGISTRADO_SIN_ARCHIVO` | No | Si | Se omite y requiere revision |
| `CONFLICTO` | Duplicado en el Excel filtrado | No aplica | Bloquea la generacion |

Un conflicto aparece si dos grupos producen la misma `clave` o el mismo archivo destino.

`Generar PDFs` siempre vuelve a validar. Si no hay faltantes, la UI termina sin crear corrida. Si existen faltantes, procesa solamente esos grupos. Un mockup base ausente se reporta y no crea item SQLite.

## Claves Antiduplicado

Personalizadas:

```text
bulk || Ship Order || WO || Style || Equipo/Color || Talla consolidada
```

Genericas:

```text
samples || WO || Roster || Style || Equipo/Color
```

La columna `clave` es `UNIQUE`. Al registrar una clave existente, SQLite actualiza su item en lugar de crear un duplicado.

## Fecha De Embarque

`fecha_embarque` es la fecha operativa del pedido, separada de la fecha y hora de ejecucion.

- Personalizadas la extrae del titulo superior.
- Genericas la extrae de la columna `Emb` de cada item.
- Acepta meses en espanol o ingles, completos o abreviados.
- Acepta entrada numerica con guion, diagonal o espacio.
- Se guarda como `DD/MM`: `17 JUNIO`, `17-Jun` y `17/06` terminan como `17/06`.
- Si una corrida de Genericas contiene varias fechas, el run conserva la lista y cada item conserva su fecha propia.
- No se agrega ano porque `fecha` ya registra el dia de ejecucion con ano.

## SQLite Compartido

Base central:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
```

Tablas propias:

- `rmc_mockuptool_runs`: una fila por ejecucion real de generacion.
- `rmc_mockuptool_items`: una fila por PDF generado correctamente.
- `cep_registry`: registra la herramienta y su tabla de runs.

No modificar `rmcop_nike_runs` ni `rmcop_nike_items` desde este CEP.

### rmc_mockuptool_runs

Orden de columnas:

```text
id, fecha, hora, fecha_embarque, seccion, herramienta, excel, disenador,
filas_excel, filas_seleccionadas, grupos_consolidados, pdfs_generados,
mockups_faltantes, styles, tallas
```

- `id`: `AAAAMMDD-HHMMSS` en hora local.
- `fecha`: `DD/MM/AAAA`.
- `hora`: `HH:MM:SS`.
- `fecha_embarque`: `DD/MM`.
- `seccion`: `Personalizadas` o `Genericas`.

### rmc_mockuptool_items

Orden de columnas:

```text
id, run_id, herramienta, fila_excel, wo, ship_order, style, style_family,
equipo, variante, version, talla, piezas, archivo, estado, error, tiempo,
clave, fecha_embarque
```

- `id` es INTEGER autoincremental.
- `run_id` apunta al ID textual de la corrida.
- `archivo` guarda solo el nombre del PDF, no la ruta completa.
- `tiempo` usa `HH:MM:SS`; actualmente los items generados usan `00:00:00`.
- `clave` es la base de validacion y tiene restriccion `UNIQUE`.

Al iniciar una operacion de historial, `ensureDatabase()` crea o migra solamente las tablas de MockupTool, normaliza etiquetas historicas y convierte fechas de embarque antiguas al formato vigente.

## Logs

Cada corrida de generacion escribe un JSON detallado en:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC MockupTool portafolio interno/06_Logs
```

El nombre incluye timestamp, seccion y Excel. El JSON conserva contexto tecnico que deliberadamente no se agrega como columnas a `rmc_mockuptool_runs`.

La consola visible del CEP muestra lectura, validacion, primeros estados, archivos generados, faltantes, conflictos, BD y ruta del log. Se puede limpiar sin afectar archivos ni SQLite.

## Impresion

`Revisar cola` no imprime. Busca PDFs bajo la carpeta exacta de la seccion y Excel seleccionados, aplica filtros y muestra:

- PDFs encontrados.
- Faltantes.
- Multiples candidatos.
- Primeros elementos en orden de envio.

Busqueda:

- Personalizadas usa WO.
- Genericas intenta Roster y WO.
- Se restringe a la familia de Style; Personalizadas tambien restringe la carpeta de talla.
- Si existen `archivo.pdf` y `archivo 2.pdf`, se prefiere el nombre base y se reporta duplicidad.

`Imprimir cola` pide confirmacion y ejecuta `lp` por cada PDF. Usa la impresora predeterminada de macOS, `fit-to-page`, `landscape` y orden inverso al Excel para que la pila fisica quede en el orden visual del Excel.

## Interfaz

Controles visibles:

- Tabs `Personalizadas` y `Genericas`.
- Excel y salida mediante selector CEP.
- Disenador.
- Filtros de Style y talla.
- `Validar`, `Generar PDFs`, `Revisar cola`, `Imprimir cola`.
- Resumen y consola interna.
- Reset limpia Excel, filtros y validacion en memoria; no borra archivos ni BD.

Rutas tecnicas de mockups, firmas y fuente son inputs ocultos con valores predeterminados en `index.html`.

## Arquitectura

```text
CSXS/manifest.xml          Registro CEP para Illustrator/CSXS
index.html                 Controles y estructura del panel
css/styles.css             Tema visual compacto RMC
js/CSInterface.js          Bridge CEP de Adobe
js/app.js                  Estado UI, selectores, filtros y acciones
src/generate.js            Excel, consolidacion, PDFs, validacion e impresion
src/history.js             SQLite compartido, migraciones y logs JSON
assets/                    Marca visual
```

El panel requiere Node habilitado dentro de CEP. No usa navegador externo ni servidor local.

Dependencias principales:

- `xlsx`
- `pdf-lib`
- `@pdf-lib/fontkit`

## Instalacion Y Checks

Carpeta CEP esperada:

```text
/Users/rmlsub1/Library/Application Support/Adobe/CEP/extensions/RMC MockupTool
```

```bash
npm install
npm run check
```

`npm run check` valida sintaxis de `src/generate.js`, `src/history.js` y `js/app.js`.

El comando `npm run generate` ejecuta el motor por CLI con rutas predeterminadas. Opciones soportadas:

```text
--excel --mockups --out --font --designer --signatures
--mode --styles --sizes --limit
```

La validacion de nombre y las reglas incrementales tambien aplican por CLI.

## Repositorio

```text
https://github.com/albertormc63-cpu/RMC-MockupTool.git
git@github.com:albertormc63-cpu/RMC-MockupTool.git
```

## Invariantes De Produccion

- Validar primero y generar despues.
- Generar solamente `FALTANTE`.
- No reemplazar PDFs existentes.
- No registrar items durante `Validar`.
- No usar rutas automaticas distintas a la raiz elegida por el operador.
- No agregar WO al inicio de archivos Genericas.
- No quitar WO al inicio de archivos Personalizadas.
- Guardar `fecha_embarque` como `DD/MM`.
- Mantener tablas y nombres de RMCOp-Nike intactos.
- Documentar aqui cualquier cambio de columnas, clave, carpetas, nombres, coordenadas o impresion.
