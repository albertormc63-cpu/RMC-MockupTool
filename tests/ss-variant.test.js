const assert = require("assert");
const XLSX = require("xlsx");
const variantCatalog = require("../src/variantCatalog");
const {
  DEFAULT_MOCKUPS,
  buildMockupPath,
  buildSamplesOutputPath,
  readExcelBuffer,
  validateExcelMode
} = require("../src/generate");

variantCatalog.__setRowsForTesting([
  {
    variant_code: "SS",
    variant_name: "Special / Foundation Designs",
    requires_design_code: 1,
    design_code: "GNB1",
    design_name: "Green Beret Foundation",
    aliases: "Green Beret; Green Beret Fundation; Green Beret Foundation; GBF",
    mockup_folder: "STARS STRIPES",
    mockup_file_pattern: "PLL-GBF.pdf",
    mockup_source_type: "pdf",
    mockup_status: "ready_pdf"
  },
  {
    variant_code: "SS",
    variant_name: "Special / Foundation Designs",
    requires_design_code: 1,
    design_code: "NYS1",
    design_name: "Navy SEAL Foundation",
    aliases: "Navy SEALs; Navy Seal Foundation; Navy SEALs Foundation; NSF",
    mockup_folder: "STARS STRIPES",
    mockup_file_pattern: "PLL-NSF.pdf",
    mockup_source_type: "pdf",
    mockup_status: "ready_pdf"
  },
  {
    variant_code: "JR",
    variant_name: "JR Championship",
    aliases: "JR Championship; Jr.Champ; Jr Champ; JR Champ"
  },
  {
    variant_code: "AS",
    variant_name: "All Star",
    design_code: "AS-F-TB",
    design_name: "Home / West",
    aliases: "Home; West; TeamB; Team B; HAS1",
    mockup_folder: "ALL STARS",
    mockup_file_pattern: "WLL All Star Game Home.pdf",
    mockup_source_type: "pdf",
    mockup_status: "ready_pdf",
    liga: "WLL"
  },
  {
    variant_code: "AS",
    variant_name: "All Star",
    design_code: "AS-M-TB",
    design_name: "Home / West",
    aliases: "Home; West; TeamB; Team B; HAS1",
    mockup_folder: "ALL STARS",
    mockup_file_pattern: "PLL All Star Game Home.pdf",
    mockup_source_type: "pdf",
    mockup_status: "ready_pdf",
    liga: "PLL"
  }
]);

const modeValidation = validateExcelMode("NIKE SS 3 JUL.xlsx", "samples");
assert.strictEqual(modeValidation.valid, true, "SS debe ser un codigo valido de Genericas.");
assert.strictEqual(validateExcelMode("NIKE JR 3 JUL.xlsx", "samples").valid, true, "JR activo en BD debe cargar en Genericas.");
assert.strictEqual(validateExcelMode("NIKE AS 3 JUL.xlsx", "samples").valid, true, "AS activo en BD debe cargar en Genericas.");

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ["WO", "Style", "Roster", "QTY", "Color", "Emb"],
  ["173833", "A1000SS", "79229-26", "250", "79405-26 PLL-GBF.jpg", "3-JUL"],
  ["173829", "A1000SS", "79230-26", "48", "79406-26 PLL-NSF.jpg", "3-JUL"],
  ["173830", "A1000AS", "79231-26", "12", "Team B", "3-JUL"],
  ["173840", "A1000JR", "79234-26", "8", "PLL Utah Archers JR Champ", "3-JUL"],
  ["173841", "Y1000JR", "79235-26", "9", "PLL New York Atlas JR Champ", "3-JUL"],
  ["173842", "A1500JR", "79236-26", "10", "PLL Philadelphia Waterdogs JR Champ Shorts", "3-JUL"],
  ["173843", "Y1500JR", "79237-26", "11", "PLL California Redwoods JR Champ Shorts", "3-JUL"],
  ["173831", "A1000", "79232-26", "24", "Utah-Archers-Home-Fields-5.jpg", "3-JUL"],
  ["173832", "Y1000", "79233-26", "36", "New-York-Atlas-Away-Baptiste-9.jpg", "3-JUL"]
]);
XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");

const excel = readExcelBuffer(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), "samples");
const greenBeret = excel.rows[0];
const navySeal = excel.rows[1];
const allStar = excel.rows[2];
const adultJrChamp = excel.rows[3];
const youthJrChamp = excel.rows[4];
const adultJrChampShorts = excel.rows[5];
const youthJrChampShorts = excel.rows[6];
const standardHome = excel.rows[7];
const standardAway = excel.rows[8];

assert.strictEqual(greenBeret.variant, "SS");
assert.strictEqual(greenBeret.designInfo.designName, "Green Beret Foundation");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, greenBeret).endsWith("STARS STRIPES/PLL-GBF.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", greenBeret),
  "/tmp/out/A1000/3-JUL/79229-26 - PLL Green Beret Foundation - A1000SS - 250pz.pdf"
);

assert.strictEqual(navySeal.variant, "SS");
assert.strictEqual(navySeal.designInfo.designName, "Navy SEAL Foundation");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, navySeal).endsWith("STARS STRIPES/PLL-NSF.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", navySeal),
  "/tmp/out/A1000/3-JUL/79230-26 - PLL Navy SEAL Foundation - A1000SS - 48pz.pdf"
);

assert.strictEqual(allStar.variant, "AS");
assert.strictEqual(allStar.designInfo.code, "AS-M-TB");
assert.strictEqual(allStar.designInfo.designName, "Home / West");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, allStar).endsWith("ALL STARS/PLL All Star Game Home.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", allStar),
  "/tmp/out/A1000/3-JUL/79231-26 - PLL Home West - A1000AS - 12pz.pdf"
);

assert.strictEqual(adultJrChamp.variant, "JR");
assert.strictEqual(adultJrChamp.variantLabel, "JR Champ");
assert.strictEqual(adultJrChamp.garmentType, "top");
assert.strictEqual(adultJrChamp.teamInfo.nickname, "Archers");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, adultJrChamp).endsWith("JR CHAMPIONSHIP/PLL Utah Archers JR Champ.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", adultJrChamp),
  "/tmp/out/A1000/3-JUL/79234-26 - PLL Utah Archers JR Champ - A1000JR - 8pz.pdf"
);

assert.strictEqual(youthJrChamp.variant, "JR");
assert.strictEqual(youthJrChamp.variantLabel, "JR Champ");
assert.strictEqual(youthJrChamp.garmentType, "top");
assert.strictEqual(youthJrChamp.teamInfo.nickname, "Atlas");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, youthJrChamp).endsWith("JR CHAMPIONSHIP/PLL New York Atlas JR Champ.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", youthJrChamp),
  "/tmp/out/Y1000/3-JUL/79235-26 - PLL New York Atlas JR Champ - Y1000JR - 9pz.pdf"
);

assert.strictEqual(adultJrChampShorts.variant, "JR");
assert.strictEqual(adultJrChampShorts.variantLabel, "JR Champ Shorts");
assert.strictEqual(adultJrChampShorts.garmentType, "shorts");
assert.strictEqual(adultJrChampShorts.teamInfo.nickname, "Waterdogs");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, adultJrChampShorts).endsWith("JR CHAMPIONSHIP/PLL Philadelphia Waterdogs JR Champ Shorts.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", adultJrChampShorts),
  "/tmp/out/A1500/3-JUL/79236-26 - PLL Philadelphia Waterdogs JR Champ Shorts - A1500JR - 10pz.pdf"
);

assert.strictEqual(youthJrChampShorts.variant, "JR");
assert.strictEqual(youthJrChampShorts.variantLabel, "JR Champ Shorts");
assert.strictEqual(youthJrChampShorts.garmentType, "shorts");
assert.strictEqual(youthJrChampShorts.teamInfo.nickname, "Redwoods");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, youthJrChampShorts).endsWith("JR CHAMPIONSHIP/PLL California Redwoods JR Champ Shorts.pdf"), true);
assert.strictEqual(
  buildSamplesOutputPath("/tmp/out", youthJrChampShorts),
  "/tmp/out/Y1500/3-JUL/79237-26 - PLL California Redwoods JR Champ Shorts - Y1500JR - 11pz.pdf"
);

assert.strictEqual(standardHome.variant, "STANDARD");
assert.strictEqual(standardHome.version, "Home");
assert.strictEqual(standardHome.teamInfo.nickname, "Archers");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, standardHome).endsWith("STANDARD/MASCULINO/PLL Utah Archers Home.pdf"), true);

assert.strictEqual(standardAway.variant, "STANDARD");
assert.strictEqual(standardAway.version, "Away");
assert.strictEqual(standardAway.teamInfo.nickname, "Atlas");
assert.strictEqual(buildMockupPath(DEFAULT_MOCKUPS, standardAway).endsWith("STANDARD/MASCULINO/PLL New York Atlas Away.pdf"), true);

console.log("ss-variant.test.js OK");
