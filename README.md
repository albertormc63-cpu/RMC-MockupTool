# RMC MockupTool

Extension CEP separada para Adobe Illustrator. Genera mockups PDF listos para imprimir desde listas Nike On Demand.

Este repo es herramienta hermana de `RMCOp-Nike`, no modulo interno del panel Nike. Mantener repos, README, dependencias y memoria separados.

## Alcance

- Leer Excel de `Por lote` y `Genericas/Muestras`.
- Detectar familia de style, equipo, version y mockup PDF base.
- Estampar fecha, WO, style, talla/roster, piezas y firma.
- Generar PDFs en carpeta de salida.
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

## Notas

- No mezclar este repo con `RMCOp-Nike`.
- Si se agrega impresion directa, probar `lp`/selector de impresora en macOS real.
- Si se cambian coordenadas o rutas de mockups, documentarlo aqui.
