# SQLite Y Logs

## Base Compartida

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
```

Tablas propias:

- `rmc_mockuptool_runs`: una fila por ejecucion real de generacion.
- `rmc_mockuptool_items`: una fila por PDF generado correctamente.
- `cep_registry`: registra la herramienta y su tabla de runs.

No modificar `rmcop_nike_runs`, `rmcop_nike_items` ni otras tablas `rmcop_nike_*` desde este CEP.

## Catalogo Compartido De Variantes

`rmc_nike_style_variants` es una tabla compartida de catalogo. Este CEP la lee para reconocer variantes activas de Genericas y resolver disenos especiales.

Columnas de mockup agregadas con autorizacion operativa:

- `mockup_folder`: carpeta relativa dentro de la raiz de mockups.
- `mockup_file_pattern`: nombre exacto o patron del asset base.
- `mockup_source_type`: tipo disponible (`pdf` o `jpg`).
- `mockup_status`: estado operativo, por ejemplo `ready_pdf`, `pattern_pdf` o `image_only`.

El generador actual solo puede anotar PDFs base. Las variantes con `mockup_source_type='jpg'` se reconocen como catalogo, pero no se generan hasta tener PDF base o un flujo explicito de conversion.

## Herramientas Y Secciones

| Seccion | Herramienta SQLite |
| --- | --- |
| `Personalizadas` | `RMC MockupTool Personalizada` |
| `Genericas` | `RMC MockupTool Genericas` |

No usar `Por lote`, `Genericas Muestras` ni `RMC MockupTool Por Lote` en registros nuevos.

## rmc_mockuptool_runs

Orden de columnas:

```text
id, fecha, hora, fecha_embarque, seccion, herramienta, excel, excel_path, path, disenador,
filas_excel, filas_seleccionadas, grupos_consolidados, pdfs_generados,
mockups_faltantes, styles, tallas
```

- `id`: `AAAAMMDD-HHMMSS` en hora local.
- `fecha`: `DD/MM/AAAA`.
- `hora`: `HH:MM:SS`.
- `fecha_embarque`: `DD/MM`; una corrida Genericas puede guardar una lista.
- `seccion`: `Personalizadas` o `Genericas`.
- `excel`: nombre visible del archivo fuente.
- `excel_path`: ruta completa del Excel seleccionado.
- `path`: carpeta efectiva de la corrida, incluyendo seccion y Excel sin extension.

No se crea corrida cuando la validacion no encuentra faltantes por generar.

## rmc_mockuptool_items

Orden de columnas:

```text
id, run_id, herramienta, fila_excel, wo, ship_order, style, style_family,
equipo, variante, version, talla, piezas, archivo, path, estado, error, tiempo,
clave, fecha_embarque, impreso
```

- `id`: INTEGER autoincremental.
- `run_id`: ID textual de la corrida.
- `archivo`: nombre del PDF.
- `path`: ruta completa y actual del PDF.
- `tiempo`: `HH:MM:SS`; actualmente los items generados usan `00:00:00`.
- `clave`: identificador antiduplicado con restriccion `UNIQUE`.
- `fecha_embarque`: fecha operativa propia del item en `DD/MM`.
- `impreso`: INTEGER restringido a `0/1`.

Los PDFs nuevos se registran con `impreso=0`. Los registros existentes antes de incorporar la columna se migraron como `impreso=1` por instruccion operativa.

Un upsert conserva `impreso=1`; nunca lo baja accidentalmente a `0`.

## Escritura Y Migracion

`ensureDatabase()` crea o migra solamente las tablas de MockupTool, normaliza etiquetas historicas y convierte fechas de embarque antiguas al formato vigente.

`Validar` no escribe SQLite. La escritura ocurre despues de generar PDFs:

1. Registrar corrida.
2. Registrar items creados correctamente.
3. Conservar paths de Excel, corrida y PDF.

Un fallo de SQLite no revierte un PDF que ya fue escrito; debe comunicarse como warning.

No cambiar schema ni migraciones sin autorizacion explicita.

## Claves Antiduplicado

Personalizadas:

```text
bulk || Ship Order || WO || Style || Equipo/Color || Talla consolidada
```

Genericas:

```text
samples || WO || Roster || Style || Equipo/Color
```

Al registrar una clave existente, SQLite actualiza el item en lugar de crear un duplicado.

## Comportamiento Actual

- `rmc_mockuptool_runs` funciona como bitacora de ejecuciones.
- `rmc_mockuptool_items` funciona a la vez como detalle de corrida y estado vigente de cada plantilla.
- `clave UNIQUE` evita duplicados mediante upsert.
- Si una clave vuelve a registrarse, el item existente puede recibir un `run_id` nuevo.

La ultima regla mantiene una fila vigente por plantilla, pero debilita el historial: una corrida antigua puede dejar de mostrar todos los items que genero. Tambien mezcla estado de produccion y estado de impresion.

## Reestructura Recomendada, No Implementada

| Capa | Responsabilidad | Escritura |
| --- | --- | --- |
| `runs` | Contexto inmutable de cada ejecucion | Una fila por intento real |
| `run_items` | Resultado inmutable de cada pedido dentro de la corrida | Una fila por resultado |
| `assets` | Estado vigente de la plantilla identificada por `clave` | Upsert controlado |
| `print_events` | Cada intento de impresion y su resultado | Una fila por envio |

Reglas propuestas:

1. Una corrida cerrada no cambia ni pierde items.
2. La deduplicacion vive en `assets`, no en el detalle historico.
3. Imprimir agrega un evento; no reescribe la historia de generacion.
4. `path`, `estado_actual` y ultima impresion pueden consultarse desde `assets`.
5. RMC Control Center puede mostrar historial y estado actual sin inferir uno desde el otro.

Esta reestructura requiere migracion y cambios coordinados con Control Center. No forma parte del esquema actual y no debe implementarse sin permiso.

## Logs JSON

Cada corrida de generacion escribe un JSON detallado en:

```text
/Users/rmlsub1/Documents/RMC - CEP/RMC MockupTool portafolio interno/06_Logs
```

El nombre incluye timestamp, seccion y Excel. El JSON conserva contexto tecnico y permite reconciliar SQLite con archivos. Las rutas principales tambien se guardan en `excel_path` y `path`.

La consola visible del CEP muestra lectura, validacion, estados, archivos generados, faltantes, conflictos, BD y ruta del log. Limpiar la consola no afecta archivos ni SQLite.

## Contrato Para Control Center

Campos principales:

- `excel_path`: fuente de informacion.
- `rmc_mockuptool_runs.path`: carpeta efectiva de la corrida.
- `rmc_mockuptool_items.path`: PDF exacto.
- `archivo`: nombre visible del PDF.
- `fecha_embarque`: fecha operativa.
- `impreso`: estado de envio a cola.
- `clave`: identidad antiduplicado.

Control Center no debe reconstruir rutas a partir de nombres cuando exista un `path` persistido.
