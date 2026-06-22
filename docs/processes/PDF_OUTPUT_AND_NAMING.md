# Salida PDF Y Nombres

## Mockups Base

Raiz predeterminada:

```text
/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/MOCKUPS
```

Resolucion:

```text
STANDARD/<MASCULINO|FEMENINO>/<Linea> <Ciudad> <Equipo> <Home|Away>.pdf
INDIGENOUS HERITAGE/<Linea> <Ciudad> <Equipo> IH.pdf
THROWBACK/<Linea> <Ciudad> <Equipo> TB.pdf
```

Si no puede resolverse linea, equipo, variante o version Standard, el pedido se reporta como mockup faltante.

## Anotacion

Personalizadas estampa fecha del titulo, WO, Style, piezas, talla y firma.

Genericas estampa fecha de `Emb`, WO, Roster, Style, piezas y firma.

Fuente preferida:

```text
/Users/rmlsub1/Library/Fonts/Aldrich-Regular.ttf
```

Si Aldrich no existe se usa Helvetica Bold. Las firmas deben ser PNG, JPG o JPEG. Un SVG sin version raster provoca error para evitar una firma invisible.

Disenadores admitidos:

- `F-ALBERTO`
- `F-THANIA`
- `F-ANTONIO`

## Raiz De Salida

Valor predeterminado, modificable manualmente:

```text
/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND
```

El operador siempre elige la raiz. El CEP agrega la seccion, el Excel sin extension y las carpetas operativas.

## Personalizadas

```text
<raiz>/Personalizadas/<Excel sin extension>/<StyleFamily>/<Talla>/
<WO> - <Linea Ciudad Equipo> - <Style> - <Piezas>pz.pdf
```

- El archivo inicia con WO.
- Un pedido multitalle usa una sola carpeta y plantilla combinada.

## Genericas

```text
<raiz>/Genericas/<Excel sin extension>/<StyleFamily>/<Emb>/
<Roster> - <Linea Ciudad Equipo> - <Style> - <Piezas>pz.pdf
```

- El archivo inicia con Roster.
- No agrega WO al inicio.
- La carpeta fisica `<Emb>` conserva el valor operativo del Excel sanitizado.

## Reglas Compartidas

- Las familias separan adulto/nino y hombre/mujer mediante `A1000`, `Y1000`, `A2000`, `Y2000`, etc.
- El CEP no reemplaza archivos existentes ni crea copias durante el flujo seguro.
- `archivo` conserva el nombre del PDF.
- `path` conserva la ruta completa del PDF.
- La carpeta efectiva de la corrida se registra en `rmc_mockuptool_runs.path`.
- La ruta del Excel se registra en `rmc_mockuptool_runs.excel_path`.
