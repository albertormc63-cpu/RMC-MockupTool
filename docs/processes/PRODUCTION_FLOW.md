# Flujo De Produccion

## Alcance

`RMC MockupTool` es una extension CEP para Adobe Illustrator que lee listas Nike, valida trabajo previo, genera PDFs anotados y permite revisar e imprimir los archivos existentes respetando el orden operativo del Excel.

Es un proyecto independiente de `RMCOp-Nike`. No comparte codigo, tablas ni reglas de escritura; solamente utiliza la misma base SQLite central mediante tablas propias.

## Etapas

```text
Preparar -> Validar -> Generar -> Registrar -> Imprimir
```

### 1. Preparar

1. Abrir `Ventana > Extensiones > RMC MockupTool` en Illustrator.
2. Elegir `Personalizadas` o `Genericas`.
3. Seleccionar el Excel; su nombre se valida antes de leerlo.
4. Seleccionar manualmente la carpeta raiz de salida.
5. Elegir disenador y filtros de Style/talla.

Esta etapa trabaja en memoria. El destino nunca se decide automaticamente: el CEP agrega seccion, nombre del Excel y carpetas operativas a la raiz elegida por el operador.

Al cambiar entre Personalizadas y Genericas, el CEP limpia Excel, filtros y validacion en memoria. Conserva salida, disenador y rutas tecnicas.

### 2. Validar

`Validar` consolida pedidos y compara cada clave contra el archivo esperado y SQLite. No genera PDFs, no crea corridas y no escribe items.

La validacion funciona como plan de produccion: clasifica cada pedido como `FALTANTE`, `YA_CREADO`, inconsistente o en conflicto.

### 3. Generar

`Generar PDFs` vuelve a validar y procesa exclusivamente `FALTANTE`. Cada PDF se escribe primero en su ruta final. Si el mockup base falta, el pedido se reporta y no se registra como generado.

### 4. Registrar

Cuando termina una generacion con faltantes:

- Se crea una corrida en `rmc_mockuptool_runs`.
- Se registra un item por PDF creado correctamente.
- Se conservan el Excel fuente, la carpeta efectiva de la corrida y la ruta exacta de cada PDF.
- Se escribe un JSON tecnico de respaldo.

Un fallo de historial no elimina un PDF ya generado; debe mostrarse como warning para reconciliacion posterior.

### 5. Imprimir

`Revisar cola` localiza y ordena PDFs sin imprimir. `Imprimir cola` recalcula la cola, pide confirmacion, ejecuta `lp` y marca `impreso=1` solamente para trabajos aceptados por macOS.

## Interfaz Operativa

Controles visibles:

- Tabs `Personalizadas` y `Genericas`.
- Excel y salida mediante selector CEP.
- Disenador.
- Filtros de Style y talla.
- `Validar`, `Generar PDFs`, `Revisar cola`, `Imprimir cola`.
- Resumen y consola interna.
- Reset que limpia Excel, filtros y validacion en memoria sin borrar archivos ni BD.

Las rutas tecnicas de mockups, firmas y fuente son inputs ocultos con valores predeterminados en `index.html`.

El contrato detallado de presentacion vive en [`../ui/RMC_CEP_UI_UX_MANIFEST.md`](../ui/RMC_CEP_UI_UX_MANIFEST.md).

## Documentos Relacionados

- Excel y reglas de agrupacion: [`EXCEL_AND_CONSOLIDATION.md`](EXCEL_AND_CONSOLIDATION.md).
- Estados y escritura de PDFs: [`VALIDATION_AND_GENERATION.md`](VALIDATION_AND_GENERATION.md).
- Mockups, nombres y carpetas: [`PDF_OUTPUT_AND_NAMING.md`](PDF_OUTPUT_AND_NAMING.md).
- Cola e impresion: [`PRINTING.md`](PRINTING.md).
- Persistencia: [`../sqlite/SQLITE_AND_LOGS.md`](../sqlite/SQLITE_AND_LOGS.md).
