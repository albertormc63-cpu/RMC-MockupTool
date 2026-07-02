const assert = require("assert");
const {
  MODE_BULK,
  MODE_SAMPLES,
  getJobOutputRoot
} = require("../src/generate");

assert.strictEqual(
  getJobOutputRoot({
    excel: "/Volumes/Fullsize/TO PRINT/LISTAS ON DEMAND/NIKE JR 3 JUL.xlsx",
    out: "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND"
  }, MODE_SAMPLES, "Genericas", "NIKE JR 3 JUL.xlsx"),
  "/Volumes/Fullsize/TO PRINT/LISTAS ON DEMAND/Genericas/NIKE JR 3 JUL"
);

assert.strictEqual(
  getJobOutputRoot({
    excel: "/Volumes/Fullsize/TO PRINT/LISTAS ON DEMAND/NIKE OD 3 JUL.xlsx",
    out: "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND"
  }, MODE_BULK, "Personalizadas", "NIKE OD 3 JUL.xlsx"),
  "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND/Personalizadas/NIKE OD 3 JUL"
);

assert.strictEqual(
  getJobOutputRoot({
    excelName: "NIKE JR 3 JUL.xlsx",
    out: "/tmp/rmc-out"
  }, MODE_SAMPLES, "Genericas", "NIKE JR 3 JUL.xlsx"),
  "/tmp/rmc-out/Genericas/NIKE JR 3 JUL"
);

console.log("output-root.test.js OK");
