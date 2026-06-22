# Arquitectura

## Componentes Actuales

```text
CSXS/manifest.xml          Registro CEP para Illustrator/CSXS
index.html                 Controles y estructura del panel
css/styles.css             Tema visual compacto RMC
js/CSInterface.js          Bridge CEP de Adobe
js/app.js                  Estado UI, selectores, filtros y acciones
src/generate.js            Excel, consolidacion, PDFs, validacion e impresion
src/history.js             SQLite compartido, migraciones y logs JSON
tests/consolidation.test.js Regresion de consolidacion multitalle
assets/                    Marca visual
```

El panel requiere Node habilitado dentro de CEP. No usa navegador externo ni servidor local.

## Dependencias

- `xlsx`: lectura de Excel.
- `pdf-lib`: edicion y escritura PDF.
- `@pdf-lib/fontkit`: soporte de fuente embebida.

## Responsabilidades Logicas

```text
UI                 seleccion, mensajes y acciones
Produccion         lectura, filtros, consolidacion y plan validado
PDF                resolucion de mockup y escritura del archivo
Registros          esquema, corridas, items y reconciliacion
Impresion          preparacion de cola, envio y estado de impresion
```

Actualmente `src/generate.js` concentra Produccion, PDF e Impresion. Una futura separacion debe mover comportamiento sin cambiar reglas operativas en la misma ronda.

## Limites Del Repo

- Es independiente de `RMCOp-Nike`.
- No comparte codigo ni reglas de escritura con ese repo.
- Usa tablas SQLite propias dentro de una base central compartida.
- No debe modificar tablas `rmcop_nike_*`.
- Los nombres de herramientas SQLite son contratos estables.

## Documentacion

- Estado breve: [`../../CURRENT_STATE.md`](../../CURRENT_STATE.md).
- Enrutamiento de contexto: [`../../TASK_ROUTER.md`](../../TASK_ROUTER.md).
- Flujo productivo: [`../processes/PRODUCTION_FLOW.md`](../processes/PRODUCTION_FLOW.md).
- Excel y consolidacion: [`../processes/EXCEL_AND_CONSOLIDATION.md`](../processes/EXCEL_AND_CONSOLIDATION.md).
- Validacion y generacion: [`../processes/VALIDATION_AND_GENERATION.md`](../processes/VALIDATION_AND_GENERATION.md).
- Salida PDF: [`../processes/PDF_OUTPUT_AND_NAMING.md`](../processes/PDF_OUTPUT_AND_NAMING.md).
- Impresion: [`../processes/PRINTING.md`](../processes/PRINTING.md).
- SQLite y logs: [`../sqlite/SQLITE_AND_LOGS.md`](../sqlite/SQLITE_AND_LOGS.md).
- UI/UX: [`../ui/RMC_CEP_UI_UX_MANIFEST.md`](../ui/RMC_CEP_UI_UX_MANIFEST.md).

## Instalacion Y Checks

Carpeta CEP esperada:

```text
/Users/rmlsub1/Library/Application Support/Adobe/CEP/extensions/RMC MockupTool
```

```bash
npm install
npm run check
```

`npm run check` valida sintaxis de `src/generate.js`, `src/history.js` y `js/app.js`, y ejecuta `tests/consolidation.test.js`.

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
