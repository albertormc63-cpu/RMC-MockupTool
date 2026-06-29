# Excel Y Consolidacion

## Validacion Del Nombre

Los codigos se reconocen como tokens aislados, no como fragmentos dentro de otras palabras.

- Personalizadas requiere `OD`.
- Genericas requiere `ST` o una variante activa de `rmc_nike_style_variants` aplicable a Genericas, por ejemplo `IH`, `TB`, `AS`, `SS` o `JR`.
- `NIKE OD 26 JUN.xlsx` es valido en Personalizadas.
- `NIKE ST 17 JUL.xlsx` es valido en Genericas.
- Un OD seleccionado en Genericas se bloquea.
- Un ST o codigo de variante de Genericas seleccionado en Personalizadas se bloquea.
- Un nombre sin codigo reconocido se bloquea.
- Un nombre que mezcla OD con codigos de Genericas es ambiguo y se bloquea.

La proteccion existe en `js/app.js` al examinar y en `src/generate.js` antes de validar, generar o preparar impresion. El CEP no cambia de seccion automaticamente; muestra la seccion correcta en el log.

## Formato Personalizadas / OD

Se usa la primera hoja. La lectura actual espera:

- Titulo en fila 2, columna A. De ahi se obtiene la fecha operativa, por ejemplo `26 JUNIO`.
- Encabezados hasta la fila 3.
- Datos desde la fila 4.
- Columnas fijas: A Ship Order, B WO, C Style, D Color/Equipo, E Talla, F Piezas, G Apellido, H Numero.

Una fila se conserva si contiene Ship Order, WO, Style o Color.

## Formato Genericas / ST-IH-TB-AS-SS-JR

Se usa la primera hoja. El CEP busca el encabezado dentro de las primeras 25 filas. Para reconocerlo deben existir WO, Style, Roster y cantidad. Si no lo encuentra, usa la fila 2 como respaldo.

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
- Sufijo `SS`: Stars Stripes.
- Sufijo `AS`: All Star.
- Sufijo `JR`: JR Championship.
- Sufijo `H`: Standard Home.
- Sufijo `A`: Standard Away.
- En Genericas, linea y variante tambien pueden inferirse desde Color/Equipo.

### Equipos Reconocidos

PLL: Archers, Atlas, Cannons, Chaos, Outlaws, Whipsnakes, Waterdogs y Redwoods.

WLL: Guard, Palms, Charm y Charging.

Si no se puede resolver linea, equipo, variante o version Standard, no existe una ruta valida de mockup y el item se reporta como mockup faltante durante la generacion.

## Filtros

- Style trabaja por familia, por ejemplo `A1000`.
- Las tallas aparecen solamente en Personalizadas y dependen de las familias seleccionadas.
- En Personalizadas, una talla selecciona el pedido consolidado completo, no una fila aislada.
- Si un pedido contiene `2XL-XLG`, seleccionar `2XL` o `XLG` conserva ambas filas y usa la plantilla `2XL-XLG`.
- Cambiar Excel, destino, Style o talla invalida la validacion previa.
- Cambiar de seccion tambien limpia Excel y filtros.
- La validacion vigente se identifica por Excel, destino, modo y filtros.

## Consolidacion

Personalizadas consolida por:

```text
Ship Order + WO + Style + Color/Equipo
```

Suma piezas y combina tallas diferentes en el orden encontrado, por ejemplo `XLG-LGE`. El grupo consolidado produce un PDF.

La consolidacion ocurre antes del filtro de talla. Nunca se genera una plantilla separada por talla cuando Ship Order, WO, Style y Color/Equipo identifican el mismo pedido multitalle.

Los logs de validacion, generacion e impresion muestran `Pedidos multitalle consolidados` para distinguir estos grupos validos de un `CONFLICTO` real.

Genericas consolida por:

```text
WO + Roster + Style + Color/Equipo
```

Suma piezas y no usa jugador, apellido ni numero en la clave.

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
