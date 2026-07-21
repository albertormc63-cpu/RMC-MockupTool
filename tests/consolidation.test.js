const assert = require("assert");
const { MODE_BULK, formatBulkSizeValue, getBulkQtyX, parseLpRequestId, selectJobRows } = require("../src/generate");

const shared = {
  shipOrder: "5484880",
  wo: "173888",
  style: "A1000H",
  color: "X007 OD WATERDOGS"
};
const rows = [
  Object.assign({ sourceRow: 7, size: "2XL", qty: 1 }, shared),
  Object.assign({ sourceRow: 16, size: "XLG", qty: 1 }, shared),
  {
    sourceRow: 20,
    shipOrder: "OTRO",
    wo: "OTRO",
    style: "A1000H",
    color: "X001 OD ARCHERS",
    size: "2XL",
    qty: 1
  }
];

const selection = selectJobRows(rows, {
  styles: ["A1000"],
  sizes: ["XLG"]
}, MODE_BULK);

assert.strictEqual(selection.filteredRows.length, 2, "El filtro debe conservar las dos filas del pedido.");
assert.strictEqual(selection.consolidatedRows.length, 1, "El pedido multitalle debe producir un solo grupo.");
assert.strictEqual(selection.consolidatedRows[0].size, "2XL-XLG");
assert.strictEqual(selection.consolidatedRows[0].qty, 2);
assert.deepStrictEqual(selection.consolidatedRows[0].sourceRows, [7, 16]);
assert.strictEqual(
  formatBulkSizeValue({ size: "2XL-XLG-LGE-MED-SML", sizes: ["2XL", "XLG", "LGE", "MED", "SML"] }),
  "2XL-XLG-LGE\nMED-SML",
  "La anotacion debe partir multitalle despues de la tercera talla."
);
assert.strictEqual(getBulkQtyX({ qty: 9 }), 0.80, "Una cantidad de un digito conserva la posicion normal.");
assert.strictEqual(getBulkQtyX({ qty: 10 }), 0.58, "Una cantidad de dos digitos se alinea con el WO.");
assert.strictEqual(
  parseLpRequestId("request id is Zebra_RMC-123 (1 file(s))"),
  "Zebra_RMC-123",
  "La impresion debe conservar el job id que devuelve CUPS."
);

console.log("consolidation.test.js OK");
