# Manual de RMC MockupTool

## Parte del RMC Control System

**Sistema paraguas:** RMC Control System  
**Herramienta detectada:** RMC MockupTool  
**Tipo:** Panel CEP independiente para Adobe Illustrator  
**Desarrollado y documentado por:** Alberto Villarreal

> [INSERTAR IMAGEN: Panel principal de RMC MockupTool]

## 1. Descripcion general

RMC MockupTool es una extension CEP para Adobe Illustrator que lee listas de produccion Nike, valida pedidos, genera PDFs anotados de mockups y apoya la revision e impresion de cola. Opera con dos secciones visibles: **Personalizadas** y **Genericas**.

La herramienta automatiza tareas repetitivas de preparacion de mockups, conserva rutas operativas y registra resultados en SQLite para consulta posterior desde el ecosistema interno.

## 2. Objetivo

Reducir el trabajo manual necesario para preparar, validar, generar y rastrear mockups de pedidos Nike. El objetivo central es que el operador valide primero, genere solo lo faltante y mantenga trazabilidad de archivos, Excel fuente, fecha de embarque, disenador y estado de impresion.

## 3. Relacion con el RMC Control System

RMC MockupTool forma parte del RMC Control System como modulo operativo de mockups. Se integra mediante una base SQLite central, pero usa tablas propias y reglas independientes. La relacion esperada con Control Center es de consulta y trazabilidad: rutas de Excel, corridas, PDFs generados, claves antiduplicado y estado de impresion.

No comparte codigo ni tablas de escritura con RMCOp-Nike; solamente convive dentro de la misma base central.

## 4. Que hace actualmente

- Lee archivos Excel de pedidos Nike en modos Personalizadas y Genericas.
- Valida que el nombre del Excel corresponda a la seccion activa.
- Consolida pedidos antes de generar, incluyendo pedidos multitalle en Personalizadas.
- Detecta faltantes, ya creados, conflictos e inconsistencias archivo/BD.
- Genera PDFs anotados usando mockups base, fuente Aldrich o respaldo Helvetica Bold y firma del disenador.
- Registra corridas e items generados en SQLite.
- Escribe logs JSON tecnicos por corrida.
- Prepara cola de impresion sin imprimir.
- Imprime cola con confirmacion usando `lp` y marca `impreso=1` solo si macOS acepta el trabajo.
- Lee catalogo `rmc_nike_style_variants` para variantes activas de Genericas y disenos especiales.

> [INSERTAR IMAGEN: Generacion o consulta de maqueta]

## 5. Problemas que resuelve

- Trabajo manual repetitivo al buscar plantillas y preparar PDFs.
- Riesgo de generar duplicados o reemplazar archivos existentes.
- Falta de trazabilidad entre Excel, archivo generado y corrida.
- Dependencia de revision manual para saber que falta producir.
- Errores por capturar datos de pedidos a mano.
- Desorden en carpetas de salida y nombres de archivos.
- Dificultad para saber que ya fue enviado a impresion.

## 6. Ventajas operativas

- Ahorra tiempo en validacion, preparacion y registro de mockups.
- Reduce errores al generar solo pedidos `FALTANTE`.
- Mantiene estructura de carpetas por seccion, Excel, style y fecha/talla.
- Mejora consistencia en nombres de PDFs.
- Deja evidencia en SQLite y logs JSON.
- Permite revisar cola antes de imprimir.
- Apoya la consulta futura desde RMC Control Center.

## 7. Areas de oportunidad que ataca

**Validacion previa.** Evita producir sin revisar si el archivo ya existe o si la clave esta registrada.  
**Trazabilidad.** Relaciona cada PDF con Excel, corrida, fecha de embarque, disenador y clave.  
**Orden operativo.** Respeta filtros, consolidacion y orden de cola para produccion e impresion.  
**Estandarizacion.** Usa nombres de herramienta y secciones estables en SQLite.  
**Control de errores.** Reporta mockups faltantes, conflictos e inconsistencias sin reemplazar archivos.

## 8. Entradas de informacion

| Entrada | Fuente | Uso dentro de la herramienta |
| --- | --- | --- |
| Excel Nike | Selector del panel | Datos de WO, style, roster, color/equipo, talla, piezas y embarque. |
| Carpeta de salida | Selector del panel | Raiz donde se crean las carpetas operativas y PDFs. |
| Mockups base | Ruta local configurada | Plantillas PDF que se anotan para producir mockups. |
| Firmas | Ruta local configurada | Firma del disenador en PDF final. |
| Fuente Aldrich | Ruta local configurada | Tipografia principal para anotaciones. |
| SQLite | `RMC_CEP.sqlite` | Historial, items, claves y estado de impresion. |
| Catalogo de variantes | `rmc_nike_style_variants` | Variantes activas, aliases y mockups especiales. |

## 9. Salidas generadas

| Salida | Descripcion | Uso operativo |
| --- | --- | --- |
| PDFs anotados | Mockups finales por pedido consolidado. | Revision, aprobacion interna e impresion. |
| Corrida SQLite | Resumen de ejecucion real. | Trazabilidad y consulta. |
| Items SQLite | Detalle de cada PDF generado. | Estado vigente, clave e impresion. |
| Log JSON | Respaldo tecnico por corrida. | Diagnostico y reconciliacion. |
| Cola de impresion | Lista ordenada de PDFs encontrados. | Revision previa y envio controlado a impresora. |

> [INSERTAR IMAGEN: Registro de mockup en base de datos]

## 10. Flujo general de uso

1. Abrir Illustrator y entrar a `Ventana > Extensiones > RMC MockupTool`.
2. Elegir `Personalizadas` o `Genericas`.
3. Seleccionar el Excel correcto y la carpeta raiz de salida.
4. Elegir disenador y filtros de style/talla cuando aplique.
5. Presionar `Validar` para revisar faltantes, creados, conflictos e inconsistencias.
6. Presionar `Generar PDFs`; el sistema vuelve a validar y procesa solo `FALTANTE`.
7. Revisar resumen, BD y log JSON.
8. Usar `Revisar cola` para ubicar PDFs listos para impresion.
9. Usar `Imprimir cola` solo despues de confirmar; el sistema marca impresos si `lp` acepta el trabajo.

## 11. Estado actual

| Componente | Estado | Comentario |
| --- | --- | --- |
| Panel CEP | Funcional | UI operativa en Illustrator con selectores, filtros y consola. |
| Lectura Excel | Funcional | Soporta Personalizadas y Genericas. |
| Validacion incremental | Funcional | No escribe archivos ni SQLite. |
| Generacion PDF | Funcional | Procesa solo faltantes y no reemplaza existentes. |
| Historial SQLite | Funcional | Registra corridas/items y conserva rutas completas. |
| Impresion | Funcional | Usa `lp`, confirmacion y estado `impreso`. |
| Variantes especiales | En prueba operativa | Depende del catalogo y mockups base disponibles. |
| Reestructura historica | Pendiente de validar | Recomendacion documentada, no implementada. |

## 12. Limitaciones actuales

- Requiere rutas locales especificas para Excel, mockups, firmas, fuente y SQLite.
- Depende de Adobe Illustrator con CEP y Node habilitado.
- Solo anota mockups base en PDF; fuentes JPG requieren conversion o flujo adicional.
- La impresion confirma aceptacion por macOS, no salida fisica de impresora.
- La estructura historica actual usa upsert por clave; una reestructura mas robusta esta pendiente de autorizacion.
- Si falta un mockup base, el pedido se reporta y no se registra como generado.

## 13. Mejoras futuras / Roadmap

| Mejora | Descripcion | Prioridad | Estado |
| --- | --- | --- | --- |
| Reestructura de historial | Separar corridas, items inmutables, assets e impresion. | Alta | Pendiente de validar |
| Mayor cobertura de variantes | Completar PDF base o conversion para variantes con fuente JPG. | Media | En evaluacion |
| Panel de diagnostico | Mostrar causas agrupadas de mockups faltantes. | Media | Pendiente |
| Integracion visual con Control Center | Consulta mas directa de assets y estado. | Media | Pendiente |
| Mas pruebas automatizadas | Cubrir mas formatos reales de Excel. | Media | En progreso |

## 14. Mantenimiento tecnico

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura del panel CEP. |
| `css/styles.css` | Tema visual compacto RMC. |
| `js/app.js` | Estado UI, selectores, filtros, validacion y acciones. |
| `src/generate.js` | Lectura Excel, consolidacion, validacion, PDF e impresion. |
| `src/history.js` | SQLite, migraciones propias y logs JSON. |
| `src/variantCatalog.js` | Catalogo de variantes y resolucion de disenos especiales. |
| `tests/*.test.js` | Regresiones de consolidacion y variantes. |

**Dependencias principales:** `xlsx`, `pdf-lib`, `@pdf-lib/fontkit`.  
**Checks:** `npm run check`.  
**CLI:** `npm run generate` con opciones `--excel`, `--mockups`, `--out`, `--font`, `--designer`, `--signatures`, `--mode`, `--styles`, `--sizes`, `--limit`.

## 15. Espacios para imagenes

> [INSERTAR IMAGEN: Panel principal de RMC MockupTool]

> [INSERTAR IMAGEN: Generacion o consulta de maqueta]

> [INSERTAR IMAGEN: Registro de mockup en base de datos]

> [INSERTAR IMAGEN: Relacion con RMC Control Center]

## Pendientes de validar

- Alcance final de consulta desde RMC Control Center.
- Reestructura recomendada de historial antes de cualquier migracion.
- Flujo para mockups cuyo catalogo existe pero cuya fuente sea JPG.
- Configuracion final de rutas si se instala en otra maquina o usuario.
