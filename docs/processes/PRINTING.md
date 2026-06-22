# Impresion

## Revisar Cola

`Revisar cola` no imprime. Busca PDFs bajo la carpeta exacta de la seccion y Excel seleccionados, aplica filtros y muestra:

- PDFs encontrados.
- Faltantes.
- Multiples candidatos.
- Primeros elementos en orden de envio.
- Estado `IMPRESO`, `NO IMPRESO` o `SIN REGISTRO`.

## Busqueda De PDFs

- Personalizadas usa WO.
- Genericas intenta Roster y WO.
- La busqueda se restringe a la familia de Style.
- Personalizadas tambien restringe la carpeta de talla.
- Para multitalle, la carpeta debe contener exactamente el mismo conjunto de tallas; una carpeta individual no sustituye a la combinada.
- Un pedido consolidado entra una sola vez a la cola aunque provenga de varias filas.
- Si existen `archivo.pdf` y `archivo 2.pdf`, se prefiere el nombre base y se reporta duplicidad.

## Imprimir Cola

`Imprimir cola`:

1. Recalcula la cola.
2. Bloquea si no hay PDFs.
3. Mantiene visibles todos los PDFs encontrados y sus estados.
4. Selecciona para envio solamente items `NO IMPRESO`, es decir, con registro SQLite e `impreso=0`.
5. Omite por defecto los items `IMPRESO` y `SIN REGISTRO`.
6. Muestra confirmacion, cantidad y warnings.
7. Ejecuta `lp` por cada PDF pendiente.
8. Usa impresora predeterminada de macOS, `fit-to-page` y `landscape`.
9. Envia en orden inverso al Excel para que la pila fisica conserve el orden visual.
10. Reporta enviados, omitidos y fallidos.

Los duplicados no se imprimen dos veces por defecto.

Si todos los PDFs encontrados ya tienen `impreso=1`, no se ejecuta ningun comando `lp`. Los items `SIN REGISTRO` tampoco se envian porque no existe una clave SQLite cuyo estado pueda actualizarse de forma segura.

## Registro De Impresion

- Cada `lp` exitoso marca la clave correspondiente con `impreso=1`.
- Un fallo de `lp` conserva el estado anterior.
- Si SQLite falla despues del envio, la consola muestra un warning separado.
- `impreso=1` significa que `lp`/macOS acepto el trabajo en cola.
- No confirma que la impresora haya expulsado fisicamente el papel.
- `impreso` no participa en la decision de regenerar PDFs.

El modelo SQLite se documenta en [`../sqlite/SQLITE_AND_LOGS.md`](../sqlite/SQLITE_AND_LOGS.md).
