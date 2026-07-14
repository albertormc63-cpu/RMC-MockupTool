#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const XLSX = require("xlsx");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const history = require("./history");
const variantCatalog = require("./variantCatalog");

let fontkit = null;

try {
  fontkit = require("@pdf-lib/fontkit");
} catch (error) {
  fontkit = null;
}

const INCH = 72;
const FONT_COLOR = rgb(0x31 / 255, 0x27 / 255, 0x83 / 255);
const DATE_COLOR = rgb(0xa9 / 255, 0x1e / 255, 0x2f / 255);

const DEFAULT_EXCEL = "/Volumes/Fullsize/TO PRINT/LISTAS ON DEMAND/NIKE OD 12 JUNIO.xlsx";
const DEFAULT_MOCKUPS = "/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/ASSETS/MOCKUPS";
const DEFAULT_OUT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND";
const DEFAULT_ALDRICH_FONT = "/Users/rmlsub1/Library/Fonts/Aldrich-Regular.ttf";
const DEFAULT_SIGNATURES_DIR = "/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/ASSETS/FIRMAS";
const DEFAULT_PRINT_OPTIONS = ["fit-to-page", "landscape"];
const PRINT_ORDER_EXCEL = "excel";
const PRINT_ORDER_STACK = "stack";
const MODE_BULK = "bulk";
const MODE_SAMPLES = "samples";
const SECTION_BULK = "Personalizadas";
const SECTION_SAMPLES = "Genericas";
const TOOL_BULK = "RMC MockupTool Personalizada";
const TOOL_SAMPLES = "RMC MockupTool Genericas";
const STATE_MISSING = "FALTANTE";
const STATE_CREATED = "YA_CREADO";
const STATE_FILE_WITHOUT_RECORD = "ARCHIVO_SIN_REGISTRO";
const STATE_RECORD_WITHOUT_FILE = "REGISTRADO_SIN_ARCHIVO";
const STATE_CONFLICT = "CONFLICTO";
const DESIGNERS = ["F-ALBERTO", "F-THANIA", "F-ANTONIO"];
const SIGNATURE_WIDTH = 1.20;
const BULK_SIGNATURE_POSITION = { x: 0.75, y: 2.05 };
const SAMPLES_SIGNATURE_POSITION = { x: 2.50, y: 1.88 };
const SAMPLES_TEXT_POSITION = {
  date: { x: 0.58, y: 7.38 },
  wo: { x: 0.58, y: 7.10 },
  roster: { x: 0.58, y: 6.89 },
  style: { x: 0.58, y: 4.30 },
  qty: { x: 0.58, y: 2.08, tracking: -72 }
};
const SAMPLES_SHORTS_TEXT_POSITION = {
  date: SAMPLES_TEXT_POSITION.date,
  wo: SAMPLES_TEXT_POSITION.wo,
  roster: SAMPLES_TEXT_POSITION.roster,
  style: { x: 2.02, y: 1.80 },
  qty: { x: 3.00, y: 6.60 }
};
const SAMPLES_SHORTS_SIGNATURE_POSITION = { x: 5.00, y: 1.30 };

const maleTeams = {
  ARCHERS: { team: "Utah", nickname: "Archers", code: "X001" },
  ATLAS: { team: "New York", nickname: "Atlas", code: "X002" },
  CANNONS: { team: "Boston", nickname: "Cannons", code: "X003" },
  CHAOS: { team: "Carolina", nickname: "Chaos", code: "X004" },
  OUTLAWS: { team: "Denver", nickname: "Outlaws", code: "X005" },
  WHIPSNAKES: { team: "Maryland", nickname: "Whipsnakes", code: "X006" },
  WATERDOGS: { team: "Philadelphia", nickname: "Waterdogs", code: "X007" },
  REDWOODS: { team: "California", nickname: "Redwoods", code: "X008" }
};

const femaleTeams = {
  GUARD: { team: "Boston", nickname: "Guard" },
  PALMS: { team: "California", nickname: "Palms" },
  CHARM: { team: "Maryland", nickname: "Charm" },
  CHARGING: { team: "New York", nickname: "Charging" }
};

const STYLE_LINE_BY_BASE = {
  "1000": "PLL",
  "1500": "PLL",
  "2000": "WLL"
};

const STYLE_GARMENT_BY_BASE = {
  "1000": "top",
  "1500": "shorts",
  "2000": "top"
};

const JR_CHAMPIONSHIP_BY_GARMENT = {
  top: {
    label: "JR Champ",
    mockupSuffix: "JR Champ"
  },
  shorts: {
    label: "JR Champ Shorts",
    mockupSuffix: "JR Champ Shorts"
  }
};

const SPECIAL_VARIANT_SUFFIXES = ["SS", "AS", "JR", "IH", "TB"];

function parseArgs(argv) {
  const args = {
    excel: DEFAULT_EXCEL,
    mockups: DEFAULT_MOCKUPS,
    out: DEFAULT_OUT,
    font: DEFAULT_ALDRICH_FONT,
    designer: DESIGNERS[0],
    signaturesDir: DEFAULT_SIGNATURES_DIR,
    mode: MODE_BULK,
    limit: 0
  };

  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--excel") {
      args.excel = next;
      index++;
    } else if (arg === "--mockups") {
      args.mockups = next;
      index++;
    } else if (arg === "--out") {
      args.out = next;
      index++;
    } else if (arg === "--font") {
      args.font = next;
      index++;
    } else if (arg === "--designer") {
      args.designer = normalizeDesigner(next);
      index++;
    } else if (arg === "--signatures") {
      args.signaturesDir = next;
      index++;
    } else if (arg === "--mode") {
      args.mode = normalizeMode(next);
      index++;
    } else if (arg === "--styles") {
      args.styles = parseFilterList(next);
      index++;
    } else if (arg === "--sizes") {
      args.sizes = parseFilterList(next);
      index++;
    } else if (arg === "--limit") {
      args.limit = Number(next || 0);
      index++;
    }
  }

  return args;
}

function clean(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function cleanUpper(value) {
  return clean(value).toUpperCase();
}

function parseFilterList(value) {
  return clean(value)
    .split(",")
    .map(cleanUpper)
    .filter(Boolean);
}

function sanitizeFilePart(value) {
  return clean(value)
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeMode(value) {
  const mode = cleanUpper(value);
  return mode === "SAMPLES" || mode === "GENERICAS" || mode === "GENERICAS/MUESTRAS" ? MODE_SAMPLES : MODE_BULK;
}

function validateExcelMode(excelPath, mode) {
  const cleanedPath = clean(excelPath);
  const fileName = path.basename(cleanedPath, path.extname(cleanedPath));
  const normalizedName = cleanUpper(fileName);
  const hasToken = function (token) {
    return new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(normalizedName);
  };
  const hasOd = hasToken("OD");
  const genericCodes = variantCatalog.getGenericExcelCodes().filter(hasToken);
  const selectedMode = normalizeMode(mode);
  let detectedMode = "";

  if (hasOd && !genericCodes.length) detectedMode = MODE_BULK;
  if (!hasOd && genericCodes.length) detectedMode = MODE_SAMPLES;

  if (!detectedMode) {
    return {
      valid: false,
      message: hasOd && genericCodes.length
        ? `El Excel \"${fileName}\" mezcla OD con ${genericCodes.join("/")}; no se puede determinar su seccion.`
        : `El Excel \"${fileName}\" no contiene OD ni un codigo de Genericas (${variantCatalog.getGenericExcelCodes().join(", ")}).`
    };
  }

  if (detectedMode !== selectedMode) {
    return {
      valid: false,
      detectedMode,
      message: detectedMode === MODE_BULK
        ? `El Excel \"${fileName}\" contiene OD y debe cargarse en Personalizadas.`
        : `El Excel \"${fileName}\" contiene ${genericCodes.join("/")} y debe cargarse en Genericas.`
    };
  }

  return { valid: true, detectedMode, genericCodes };
}

function normalizeDesigner(value) {
  const designer = cleanUpper(value);
  return DESIGNERS.indexOf(designer) !== -1 ? designer : DESIGNERS[0];
}

function normalizeFechaEmbarque(value) {
  const dateParts = clean(value).split(",").map(function (part) { return part.trim(); }).filter(Boolean);
  if (dateParts.length > 1) {
    return Array.from(new Set(dateParts.map(normalizeFechaEmbarque).filter(Boolean))).join(", ");
  }

  const normalized = cleanUpper(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const numericMatch = normalized.match(/\b(\d{1,2})[-/\s]+(\d{1,2})(?:[-/\s]+\d{2,4})?\b/);
  const textMatch = normalized.match(/\b(\d{1,2})[-/\s]+([A-Z]+)\b/);

  if (numericMatch) {
    const monthNumber = Number(numericMatch[2]);
    if (monthNumber >= 1 && monthNumber <= 12) {
      return `${String(Number(numericMatch[1])).padStart(2, "0")}/${String(monthNumber).padStart(2, "0")}`;
    }
  }

  if (!textMatch) return normalized;

  const monthMap = {
    ENE: 1, ENERO: 1, JAN: 1, JANUARY: 1,
    FEB: 2, FEBRERO: 2, FEBRUARY: 2,
    MAR: 3, MARZO: 3, MARCH: 3,
    ABR: 4, ABRIL: 4, APR: 4, APRIL: 4,
    MAY: 5, MAYO: 5,
    JUN: 6, JUNIO: 6, JUNE: 6,
    JUL: 7, JULIO: 7, JULY: 7,
    AGO: 8, AGOSTO: 8, AUG: 8, AUGUST: 8,
    SEP: 9, SEPT: 9, SEPTIEMBRE: 9, SEPTEMBER: 9,
    OCT: 10, OCTUBRE: 10, OCTOBER: 10,
    NOV: 11, NOVIEMBRE: 11, NOVEMBER: 11,
    DIC: 12, DICIEMBRE: 12, DEC: 12, DECEMBER: 12
  };
  const month = monthMap[textMatch[2]] || monthMap[textMatch[2].slice(0, 3)];

  return month
    ? `${String(Number(textMatch[1])).padStart(2, "0")}/${String(month).padStart(2, "0")}`
    : normalized;
}

function summarizeExcel(excel) {
  return {
    sheetName: excel.sheetName,
    title: excel.title,
    dateText: excel.dateText,
    rows: excel.rows.length,
    mode: excel.mode || MODE_BULK,
    styles: uniqueSorted(excel.rows.map(function (row) { return getStyleFamily(row.style); })),
    sizes: uniqueSorted(excel.rows.map(function (row) { return row.size; })),
    teams: uniqueSorted(excel.rows.map(function (row) {
      return row.teamInfo ? `${row.line} ${row.teamInfo.team} ${row.teamInfo.nickname}` : "";
    })),
    variants: uniqueSorted(excel.rows.map(getVariantFilterValue)),
    sizesByStyle: buildSizesByStyle(excel.rows),
    variantsByStyle: buildVariantsByStyle(excel.rows),
    variantsByStyleSize: buildVariantsByStyleSize(excel.rows)
  };
}

function uniqueSorted(values) {
  return Array.from(new Set(values.map(cleanUpper).filter(Boolean))).sort();
}

function buildSizesByStyle(rows) {
  const sizesByStyle = {};

  rows.forEach(function (row) {
    const family = getStyleFamily(row.style);
    if (!family || family === "SIN_STYLE" || !row.size) return;
    if (!sizesByStyle[family]) sizesByStyle[family] = [];
    sizesByStyle[family].push(row.size);
  });

  Object.keys(sizesByStyle).forEach(function (family) {
    sizesByStyle[family] = uniqueSorted(sizesByStyle[family]);
  });

  return sizesByStyle;
}

function buildVariantsByStyle(rows) {
  const variantsByStyle = {};

  rows.forEach(function (row) {
    const family = getStyleFamily(row.style);
    const variant = getVariantFilterValue(row);
    if (!family || family === "SIN_STYLE" || !variant) return;
    if (!variantsByStyle[family]) variantsByStyle[family] = [];
    variantsByStyle[family].push(variant);
  });

  Object.keys(variantsByStyle).forEach(function (family) {
    variantsByStyle[family] = uniqueSorted(variantsByStyle[family]);
  });

  return variantsByStyle;
}

function buildVariantsByStyleSize(rows) {
  const variantsByStyleSize = {};

  rows.forEach(function (row) {
    const family = getStyleFamily(row.style);
    const size = cleanUpper(row.size);
    const variant = getVariantFilterValue(row);
    if (!family || family === "SIN_STYLE" || !variant) return;

    const key = [family, size].join("||");
    if (!variantsByStyleSize[key]) variantsByStyleSize[key] = [];
    variantsByStyleSize[key].push(variant);
  });

  Object.keys(variantsByStyleSize).forEach(function (key) {
    variantsByStyleSize[key] = uniqueSorted(variantsByStyleSize[key]);
  });

  return variantsByStyleSize;
}

function readExcel(excelPath, mode) {
  const workbook = XLSX.readFile(excelPath, { cellDates: false });
  return readWorkbook(workbook, mode);
}

function readExcelBuffer(buffer, mode) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  return readWorkbook(workbook, mode);
}

function readWorkbook(workbook, mode) {
  if (normalizeMode(mode) === MODE_SAMPLES) {
    return readSamplesWorkbook(workbook);
  }

  return readBulkWorkbook(workbook);
}

function readBulkWorkbook(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });
  const title = clean(rows[1] && rows[1][0]);
  const dateText = extractDate(title);
  const dataRows = rows.slice(3)
    .map(function (cells, index) {
      return normalizeOrderRow(cells, index + 4);
    })
    .filter(function (row) {
      return row.shipOrder || row.wo || row.style || row.color;
    });

  return {
    mode: MODE_BULK,
    sheetName,
    title,
    dateText,
    rows: dataRows
  };
}

function readSamplesWorkbook(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });
  const headerRowIndex = findSamplesHeaderRow(rows);
  const headerCells = rows[headerRowIndex] || [];
  const columns = buildSamplesColumns(headerCells);
  const dataRows = rows.slice(headerRowIndex + 1)
    .map(function (cells, index) {
      return normalizeSampleRow(cells, headerRowIndex + index + 2, columns);
    })
    .filter(function (row) {
      return row.wo || row.style || row.roster || row.color;
    });

  return {
    mode: MODE_SAMPLES,
    sheetName,
    title: "",
    dateText: "",
    rows: dataRows
  };
}

function findSamplesHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 25); index++) {
    const normalized = (rows[index] || []).map(normalizeHeader);
    const hasWo = normalized.some(function (value) { return value === "WO" || value === "WO#"; });
    const hasStyle = normalized.some(function (value) { return value === "STYLE" || value === "ESTILO"; });
    const hasRoster = normalized.some(function (value) { return value.indexOf("ROSTER") !== -1; });
    const hasQty = normalized.some(function (value) { return value === "QTY" || value === "PZS" || value === "PZ"; });

    if (hasWo && hasStyle && hasRoster && hasQty) return index;
  }

  return 1;
}

function buildSamplesColumns(headerCells) {
  return {
    wo: findColumn(headerCells, ["WO", "WO#", "WORK ORDER"]),
    style: findColumn(headerCells, ["STYLE", "ESTILO"]),
    roster: findColumn(headerCells, ["ROSTER", "ROSTER#"]),
    qty: findColumn(headerCells, ["QTY", "PZS", "PZ", "QTY/PZS"]),
    color: findColumn(headerCells, ["COLOR", "COLOR / EQUIPO", "EQUIPO", "TEAM"]),
    shipDate: findColumn(headerCells, ["FECHA EMBARQUE", "EMBARQUE", "EMB", "SHIP DATE"])
  };
}

function findColumn(headerCells, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const index = headerCells.findIndex(function (cell) {
    const header = normalizeHeader(cell);
    return normalizedAliases.some(function (alias) {
      return header === alias || header.indexOf(alias) !== -1;
    });
  });

  return index === -1 ? null : index;
}

function normalizeHeader(value) {
  return cleanUpper(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readCell(cells, index) {
  return index == null || index < 0 ? "" : cells[index];
}

function normalizeSampleRow(cells, sourceRow, columns) {
  const style = cleanUpper(readCell(cells, columns.style));
  const color = clean(readCell(cells, columns.color));
  const line = inferLine(style) || inferLineFromColor(color);
  const variant = inferVariant(style) || inferVariantFromColor(color);
  const version = inferVersion(style) || inferVersionFromColor(color);
  const garmentType = inferGarmentType(style);
  const variantLabel = getVariantLabel({ style, variant, garmentType });
  const teamInfo = inferTeam(color, line);
  const designInfo = inferDesign(color, variant, line);

  return {
    sourceRow,
    shipOrder: "",
    wo: clean(readCell(cells, columns.wo)).replace(/[^0-9-]/g, ""),
    style,
    color,
    size: "",
    qty: Number(clean(readCell(cells, columns.qty)) || 1),
    roster: cleanUpper(readCell(cells, columns.roster)),
    shipDate: cleanUpper(readCell(cells, columns.shipDate)),
    lastName: "",
    playerNumber: "",
    line,
    variant,
    variantLabel,
    garmentType,
    version,
    teamInfo,
    designInfo
  };
}

function extractDate(title) {
  const normalized = cleanUpper(title);
  const match = normalized.match(/\b(\d{1,2}\s+[A-ZÁÉÍÓÚÑ]+)\b/);
  return match ? match[1] : normalized;
}

function normalizeOrderRow(cells, sourceRow) {
  const style = cleanUpper(cells[2]);
  const color = clean(cells[3]);
  const line = inferLine(style);
  const variant = inferVariant(style);
  const version = inferVersion(style) || inferVersionFromColor(color);
  const garmentType = inferGarmentType(style);
  const variantLabel = getVariantLabel({ style, variant, garmentType });
  const teamInfo = inferTeam(color, line);
  const designInfo = inferDesign(color, variant, line);

  return {
    sourceRow,
    shipOrder: clean(cells[0]),
    wo: clean(cells[1]).replace(/[^0-9-]/g, ""),
    style,
    color,
    size: cleanUpper(cells[4]),
    qty: Number(clean(cells[5]) || 1),
    lastName: cleanUpper(cells[6]),
    playerNumber: clean(cells[7]).replace(/[^0-9]/g, ""),
    line,
    variant,
    variantLabel,
    garmentType,
    version,
    teamInfo,
    designInfo
  };
}

function parseStyle(style) {
  const normalized = cleanUpper(style);
  const match = normalized.match(/^([AY])([0-9]{4})([A-Z]*)$/);
  const suffix = match ? match[3] : "";
  const specialSuffix = SPECIAL_VARIANT_SUFFIXES.find(function (candidate) {
    return suffix === candidate;
  });

  return {
    normalized,
    alpha: match ? match[1] : "",
    baseCode: match ? match[2] : "",
    family: match ? match[1] + match[2] : "",
    suffix,
    specialSuffix
  };
}

function inferLine(style) {
  const parsed = parseStyle(style);
  return STYLE_LINE_BY_BASE[parsed.baseCode] || "";
}

function inferVariant(style) {
  const parsed = parseStyle(style);
  if (parsed.specialSuffix) return parsed.specialSuffix;
  return "STANDARD";
}

function inferVersion(style) {
  const parsed = parseStyle(style);
  if (parsed.specialSuffix) return "";
  if (/A$/.test(style)) return "Away";
  if (/H$/.test(style)) return "Home";
  return "";
}

function inferGarmentType(style) {
  const parsed = parseStyle(style);
  return STYLE_GARMENT_BY_BASE[parsed.baseCode] || "";
}

function getVariantLabel(order) {
  const variant = cleanUpper(order && order.variant);
  if (variant === "JR") {
    const garmentType = order.garmentType || inferGarmentType(order.style);
    const jrInfo = JR_CHAMPIONSHIP_BY_GARMENT[garmentType] || JR_CHAMPIONSHIP_BY_GARMENT.top;
    return jrInfo.label;
  }

  return variant;
}

function getVariantFilterValue(order) {
  const variant = cleanUpper(order && order.variant);
  if (!variant) return "";
  if (variant === "STANDARD") return "Standard";

  return variantCatalog.getVariantDisplayName(variant) || variant;
}

function getJrChampionshipInfo(order) {
  if (cleanUpper(order && order.variant) !== "JR") return null;
  const garmentType = order.garmentType || inferGarmentType(order.style);
  return JR_CHAMPIONSHIP_BY_GARMENT[garmentType] || null;
}

function inferVersionFromColor(color) {
  const normalized = cleanUpper(color).replace(/[^A-Z0-9]+/g, " ");
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.indexOf("AWAY") !== -1) return "Away";
  if (tokens.indexOf("HOME") !== -1) return "Home";
  return "";
}

function inferLineFromColor(color) {
  const normalized = cleanUpper(color);
  if (normalized.indexOf("WLL") !== -1) return "WLL";
  if (normalized.indexOf("PLL") !== -1) return "PLL";
  return "";
}

function inferVariantFromColor(color) {
  const normalized = cleanUpper(color);
  if (variantCatalog.findDesign("SS", normalized)) return "SS";
  if (normalized.indexOf("ALL STAR") !== -1 || normalized.indexOf(" ALLSTARS") !== -1) return "AS";
  if (normalized.indexOf("JR CHAMP") !== -1 || normalized.indexOf("JR. CHAMP") !== -1) return "JR";
  if (normalized.indexOf("INDIGENOUS") !== -1 || normalized.indexOf(" IH") !== -1) return "IH";
  if (normalized.indexOf("THROWBACK") !== -1) return "TB";
  return "STANDARD";
}

function inferDesign(color, variant, line) {
  if (variant === "JR") return null;
  return variant ? variantCatalog.findDesign(variant, color, { line }) : null;
}

function inferTeam(color, line) {
  const normalized = cleanUpper(color);
  const source = line === "WLL" ? femaleTeams : maleTeams;
  const key = Object.keys(source).find(function (token) {
    return normalized.indexOf(token) !== -1;
  });

  return key ? source[key] : null;
}

function buildMockupPath(mockupsRoot, order) {
  if (!order.line) {
    return "";
  }

  if (order.designInfo) {
    const designMockupPath = variantCatalog.buildDesignMockupPath(mockupsRoot, order.designInfo);
    if (designMockupPath) return designMockupPath;
  }

  if (!order.teamInfo) {
    return "";
  }

  if (order.variant === "JR") {
    const jrInfo = getJrChampionshipInfo(order);
    if (!jrInfo) return "";

    return path.join(
      mockupsRoot,
      "JR CHAMPIONSHIP",
      `${order.line} ${order.teamInfo.team} ${order.teamInfo.nickname} ${jrInfo.mockupSuffix}.pdf`
    );
  }

  if (order.variant === "IH") {
    return path.join(
      mockupsRoot,
      "INDIGENOUS HERITAGE",
      `${order.line} ${order.teamInfo.team} ${order.teamInfo.nickname} IH.pdf`
    );
  }

  if (order.variant === "TB") {
    return path.join(
      mockupsRoot,
      "THROWBACK",
      `${order.line} ${order.teamInfo.team} ${order.teamInfo.nickname} TB.pdf`
    );
  }

  if (!order.version) {
    return "";
  }

  return path.join(
    mockupsRoot,
    "STANDARD",
    order.line === "PLL" ? "MASCULINO" : "FEMENINO",
    `${order.line} ${order.teamInfo.team} ${order.teamInfo.nickname} ${order.version}.pdf`
  );
}

async function annotatePdf({ mockupPath, outputPath, order, dateText, fontPath, signaturePath }) {
  // Las coordenadas llegan en pulgadas desde abajo/izquierda. PDF usa puntos.
  const bytes = fs.readFileSync(mockupPath);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await loadPreferredFont(pdf, fontPath);
  const boldFont = font;

  drawText(page, `WO# ${order.wo}`.toUpperCase(), {
    x: 0.58,
    y: 7.10,
    size: 18,
    font: boldFont
  });

  drawText(page, order.style.toUpperCase(), {
    x: 0.58,
    y: 6.78,
    size: 18,
    font: boldFont
  });

  drawText(page, dateText.toUpperCase(), {
    x: 0.58,
    y: 7.38,
    size: 12,
    font,
    color: DATE_COLOR
  });

  drawQty(page, String(order.qty || 1), {
    x: 0.80,
    y: 4.04,
    numberFont: boldFont,
    suffixFont: font
  });

  drawText(page, `Size: ${order.size}`.toUpperCase(), {
    x: getSizeTextX(order),
    y: 2.50,
    size: 18,
    font: boldFont
  });

  await drawSignature(pdf, page, signaturePath, BULK_SIGNATURE_POSITION);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, await pdf.save());
}

async function annotateSamplesPdf({ mockupPath, outputPath, order, fontPath, signaturePath }) {
  // Genericas usa otro acomodo: roster arriba, style a media pagina y PZ abajo.
  const bytes = fs.readFileSync(mockupPath);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await loadPreferredFont(pdf, fontPath);
  const boldFont = font;
  const positions = getSamplesTextPosition(order);

  drawText(page, `WO# ${order.wo}`.toUpperCase(), {
    x: positions.wo.x,
    y: positions.wo.y,
    size: 18,
    font: boldFont
  });

  drawText(page, order.style.toUpperCase(), {
    x: positions.style.x,
    y: positions.style.y,
    size: 18,
    font: boldFont
  });

  if (order.shipDate) {
    drawText(page, order.shipDate.toUpperCase(), {
      x: positions.date.x,
      y: positions.date.y,
      size: 12,
      font,
      color: DATE_COLOR
    });
  }

  drawQty(page, String(order.qty || 1), {
    x: positions.qty.x,
    y: positions.qty.y,
    tracking: positions.qty.tracking,
    numberFont: boldFont,
    suffixFont: font
  });

  drawText(page, `${order.roster || "SIN ROSTER"}`.toUpperCase(), {
    x: positions.roster.x,
    y: positions.roster.y,
    size: 18,
    font: boldFont
  });

  await drawSignature(pdf, page, signaturePath, getSamplesSignaturePosition(order));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, await pdf.save());
}

function getSamplesTextPosition(order) {
  return isShortsOrder(order) ? SAMPLES_SHORTS_TEXT_POSITION : SAMPLES_TEXT_POSITION;
}

function getSamplesSignaturePosition(order) {
  return isShortsOrder(order) ? SAMPLES_SHORTS_SIGNATURE_POSITION : SAMPLES_SIGNATURE_POSITION;
}

function isShortsOrder(order) {
  return (order.garmentType || inferGarmentType(order.style)) === "shorts";
}

function getSizeTextX(order) {
  if (!order.sizes || order.sizes.length <= 1) return 2.30;
  return order.sizes.length > 2 ? 1.55 : 1.80;
}

async function loadPreferredFont(pdf, fontPath) {
  if (fontkit && fontPath && fs.existsSync(fontPath)) {
    pdf.registerFontkit(fontkit);
    return pdf.embedFont(fs.readFileSync(fontPath));
  }

  return pdf.embedFont(StandardFonts.HelveticaBold);
}

function resolveSignaturePath(designer, signaturesDir) {
  // pdf-lib incrusta PNG/JPG de forma directa. Si solo existe SVG, avisamos para evitar una firma invisible.
  const selectedDesigner = normalizeDesigner(designer);
  const root = signaturesDir || DEFAULT_SIGNATURES_DIR;
  const candidates = [
    path.join(root, `${selectedDesigner}.png`),
    path.join(root, `${selectedDesigner}.jpg`),
    path.join(root, `${selectedDesigner}.jpeg`)
  ];
  const found = candidates.find(function (candidate) {
    return fs.existsSync(candidate);
  });

  if (found) return found;

  const fuzzyMatch = findSignatureByPrefix(root, selectedDesigner);
  if (fuzzyMatch) return fuzzyMatch;

  const svgPath = path.join(root, `${selectedDesigner}.svg`);
  if (fs.existsSync(svgPath)) {
    throw new Error(`La firma ${selectedDesigner} existe en SVG, pero el generador PDF necesita PNG/JPG: ${svgPath}`);
  }

  throw new Error(`No existe firma PNG/JPG para ${selectedDesigner} en ${root}.`);
}

function findSignatureByPrefix(root, designer) {
  if (!fs.existsSync(root)) return "";

  const prefix = cleanUpper(designer);
  return fs.readdirSync(root)
    .map(function (fileName) {
      return path.join(root, fileName);
    })
    .find(function (candidate) {
      const ext = path.extname(candidate).toLowerCase();
      const baseName = cleanUpper(path.basename(candidate, ext));
      return [".png", ".jpg", ".jpeg"].indexOf(ext) !== -1 && baseName.indexOf(prefix) === 0;
    }) || "";
}

async function drawSignature(pdf, page, signaturePath, position) {
  if (!signaturePath) return;

  const bytes = fs.readFileSync(signaturePath);
  const ext = path.extname(signaturePath).toLowerCase();
  const image = ext === ".jpg" || ext === ".jpeg"
    ? await pdf.embedJpg(bytes)
    : await pdf.embedPng(bytes);

  page.drawImage(image, {
    x: position.x * INCH,
    y: position.y * INCH,
    width: SIGNATURE_WIDTH * INCH,
    height: (SIGNATURE_WIDTH * INCH) * image.height / image.width
  });
}

function drawText(page, text, options) {
  page.drawText(text, {
    x: options.x * INCH,
    y: options.y * INCH,
    size: options.size,
    font: options.font,
    color: options.color || FONT_COLOR
  });
}

function drawQty(page, qtyText, options) {
  const x = options.x * INCH;
  const y = options.y * INCH;
  const numberSize = 70;
  const suffixSize = 12;
  const tracking = getTrackingPoints(options.tracking, numberSize);
  const suffixTracking = getTrackingPoints(options.tracking, suffixSize);
  const numberWidth = getTrackedTextWidth(qtyText, options.numberFont, numberSize, tracking);

  drawTrackedText(page, qtyText, {
    x,
    y,
    size: numberSize,
    font: options.numberFont,
    color: FONT_COLOR,
    tracking
  });

  drawTrackedText(page, "pz", {
    x: x + numberWidth + (options.tracking == null ? 3 : tracking),
    y: y + 7,
    size: suffixSize,
    font: options.suffixFont,
    color: FONT_COLOR,
    tracking: suffixTracking
  });
}

function getTrackingPoints(tracking, fontSize) {
  if (tracking == null) return 0;
  return Number(tracking) * fontSize / 1000;
}

function getTrackedTextWidth(text, font, size, tracking) {
  const value = String(text || "");
  const baseWidth = font.widthOfTextAtSize(value, size);
  return baseWidth + Math.max(0, value.length - 1) * (tracking || 0);
}

function drawTrackedText(page, text, options) {
  const value = String(text || "");
  const tracking = options.tracking || 0;

  if (!tracking || value.length <= 1) {
    page.drawText(value, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color || FONT_COLOR
    });
    return;
  }

  let cursor = options.x;
  value.split("").forEach(function (char) {
    page.drawText(char, {
      x: cursor,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color || FONT_COLOR
    });
    cursor += options.font.widthOfTextAtSize(char, options.size) + tracking;
  });
}

function buildOutputPath(outDir, order) {
  const teamPart = getOrderOutputName(order);
  const styleFamily = getStyleFamily(order.style);
  const fileName = [
    order.wo || `FILA ${String(order.sourceRow).padStart(3, "0")}`,
    teamPart,
    order.style,
    order.qty ? `${order.qty}pz` : "1pz"
  ].filter(Boolean).map(sanitizeFilePart).join(" - ");

  return path.join(outDir, styleFamily, order.size || "SIN_TALLA", `${fileName}.pdf`);
}

function buildSamplesOutputPath(outDir, order) {
  const styleFamily = getStyleFamily(order.style);
  const dateFolder = sanitizeFilePart(order.shipDate || "SIN_FECHA");
  const teamPart = getOrderOutputName(order);
  const fileName = [
    order.roster || "SIN_ROSTER",
    teamPart,
    order.style,
    order.qty ? `${order.qty}pz` : "1pz"
  ].filter(Boolean).map(sanitizeFilePart).join(" - ");

  return path.join(outDir, styleFamily, dateFolder, `${fileName}.pdf`);
}

function getAvailableOutputPath(outputPath) {
  if (!fs.existsSync(outputPath)) return outputPath;

  const dir = path.dirname(outputPath);
  const ext = path.extname(outputPath);
  const baseName = path.basename(outputPath, ext);
  let counter = 2;
  let candidate = path.join(dir, `${baseName} ${counter}${ext}`);

  while (fs.existsSync(candidate)) {
    counter++;
    candidate = path.join(dir, `${baseName} ${counter}${ext}`);
  }

  return candidate;
}

function getSectionOutputRoot(outDir, sectionName, excelName) {
  const baseName = sanitizeFilePart(path.basename(clean(excelName) || "Excel", path.extname(clean(excelName) || ""))) || "Excel";
  return path.join(outDir, sectionName, baseName);
}

function getJobOutputRoot(options, mode, sectionName, excelName) {
  const baseDir = mode === MODE_SAMPLES ? getSamplesOutputBaseDir(options) : options.out;
  return getSectionOutputRoot(baseDir, sectionName, excelName);
}

function getSamplesOutputBaseDir(options) {
  const excelPath = clean(options && options.excel);
  const excelDir = excelPath ? path.dirname(excelPath) : "";
  return excelDir && excelDir !== "." ? excelDir : options.out;
}

function getStyleFamily(style) {
  const match = cleanUpper(style).match(/^[AY][0-9]{4}/);
  return match ? match[0] : "SIN_STYLE";
}

function buildSelectedJob(options) {
  const mode = normalizeMode(options.mode);
  const excelName = options.excelName || options.excel || "Excel";
  const modeValidation = validateExcelMode(excelName, mode);

  if (!modeValidation.valid) {
    throw new Error(modeValidation.message);
  }

  const excel = options.excelBuffer ? readExcelBuffer(options.excelBuffer, mode) : readExcel(options.excel, mode);
  const selection = selectJobRows(excel.rows, options, mode);
  const filteredRows = selection.filteredRows;
  const consolidatedRows = selection.consolidatedRows;
  const rows = options.limit > 0 ? consolidatedRows.slice(0, options.limit) : consolidatedRows;
  const sectionName = mode === MODE_SAMPLES ? SECTION_SAMPLES : SECTION_BULK;
  const outputRoot = getJobOutputRoot(options, mode, sectionName, excelName);
  const fechaEmbarque = mode === MODE_SAMPLES
    ? uniqueSorted(consolidatedRows.map(function (row) { return normalizeFechaEmbarque(row.shipDate); })).join(", ")
    : normalizeFechaEmbarque(excel.dateText);

  return {
    mode,
    excelName,
    excel,
    filteredRows,
    rows,
    sectionName,
    outputRoot,
    fechaEmbarque
  };
}

function validateMockups(options) {
  const job = buildSelectedJob(options);
  return validateSelectedJob(job, options);
}

function validateSelectedJob(job, options) {
  const items = job.rows.map(function (order, index) {
    return buildValidationItem(job, order, index);
  });
  const keyCounts = countBy(items.map(function (item) { return item.clave; }));
  const pathCounts = countBy(items.map(function (item) { return item.expectedPath; }));
  const dbRecords = history.getItemRecordsByClaves(items.map(function (item) { return item.clave; }));

  items.forEach(function (item) {
    const fileExists = fs.existsSync(item.expectedPath);
    const dbRecord = dbRecords[item.clave] || null;
    const duplicatedKey = keyCounts[item.clave] > 1;
    const duplicatedPath = pathCounts[item.expectedPath] > 1;

    item.archivoExiste = fileExists;
    item.registroExiste = !!dbRecord;
    item.archivoRegistrado = dbRecord ? dbRecord.archivo : "";
    item.impreso = dbRecord ? dbRecord.impreso : false;

    if (duplicatedKey || duplicatedPath) {
      item.estado = STATE_CONFLICT;
      item.error = duplicatedKey ? "Clave duplicada en el Excel filtrado." : "Archivo destino duplicado en el Excel filtrado.";
      return;
    }

    if (fileExists && dbRecord) {
      item.estado = STATE_CREATED;
      return;
    }

    if (fileExists && !dbRecord) {
      item.estado = STATE_FILE_WITHOUT_RECORD;
      return;
    }

    if (!fileExists && dbRecord) {
      item.estado = STATE_RECORD_WITHOUT_FILE;
      item.error = dbRecord.archivo ? "Registrado en BD con archivo: " + dbRecord.archivo : "Registrado en BD sin archivo.";
      return;
    }

    item.estado = STATE_MISSING;
  });

  const counts = countBy(items.map(function (item) { return item.estado; }));
  const impresos = items.filter(function (item) { return item.registroExiste && item.impreso; }).length;
  const pendientesImpresion = items.filter(function (item) {
    return item.estado === STATE_CREATED && !item.impreso;
  }).length;

  return {
    mode: job.mode,
    sectionLabel: job.sectionName,
    excelName: job.excelName,
    excelPath: options.excel || "",
    sheetName: job.excel.sheetName,
    out: job.outputRoot,
    fechaEmbarque: job.fechaEmbarque,
    totalRows: job.excel.rows.length,
    selectedRows: job.filteredRows.length,
    rows: job.rows.length,
    pedidosMultitalle: countMultiSizeOrders(job.rows),
    counts,
    faltantes: counts[STATE_MISSING] || 0,
    yaCreados: counts[STATE_CREATED] || 0,
    archivosSinRegistro: counts[STATE_FILE_WITHOUT_RECORD] || 0,
    registradosSinArchivo: counts[STATE_RECORD_WITHOUT_FILE] || 0,
    conflictos: counts[STATE_CONFLICT] || 0,
    impresos,
    pendientesImpresion,
    items,
    styles: uniqueSorted(job.rows.map(function (row) { return getStyleFamily(row.style); })),
    sizes: uniqueSorted(job.rows.map(function (row) { return row.size; })),
    variants: uniqueSorted(job.rows.map(getVariantFilterValue))
  };
}

function buildValidationItem(job, order, index) {
  const expectedPath = job.mode === MODE_SAMPLES ? buildSamplesOutputPath(job.outputRoot, order) : buildOutputPath(job.outputRoot, order);
  const equipo = getOrderTeamName(order);

  return {
    excelOrder: index + 1,
    filaExcel: order.sourceRow,
    sourceRow: order.sourceRow,
    sourceRows: order.sourceRows || [order.sourceRow],
    herramienta: job.mode === MODE_SAMPLES ? TOOL_SAMPLES : TOOL_BULK,
    fechaEmbarque: job.mode === MODE_SAMPLES ? normalizeFechaEmbarque(order.shipDate) : job.fechaEmbarque,
    clave: buildItemKey(job.mode, order),
    expectedPath,
    archivo: path.basename(expectedPath),
    wo: order.wo || "",
    shipOrder: order.shipOrder || "",
    style: order.style || "",
    styleFamily: getStyleFamily(order.style),
    equipo,
    variante: order.variant || "",
    variantLabel: order.variantLabel || getVariantLabel(order),
    garmentType: order.garmentType || "",
    version: order.version || "",
    color: order.color || "",
    talla: order.size || "",
    size: order.size || "",
    piezas: normalizeQty(order.qty),
    estado: "",
    error: ""
  };
}

function buildItemKey(mode, order) {
  const colorOrTeam = getOrderTeamLabel(order) || cleanUpper(order.color);
  const parts = mode === MODE_SAMPLES
    ? [MODE_SAMPLES, order.wo, order.roster, order.style, colorOrTeam]
    : [MODE_BULK, order.shipOrder, order.wo, order.style, colorOrTeam, order.size];

  return parts.map(cleanUpper).join("||");
}

function getOrderTeamLabel(order) {
  if (order.designInfo) {
    return cleanUpper([order.line, order.designInfo.outputName || order.designInfo.designName].filter(Boolean).join(" "));
  }
  if (order.variant === "JR" && order.teamInfo) {
    return cleanUpper([order.line, order.teamInfo.team, order.teamInfo.nickname, order.variantLabel || getVariantLabel(order)].filter(Boolean).join(" "));
  }
  if (!order.teamInfo) return cleanUpper(order.color);
  return cleanUpper([order.line, order.teamInfo.team, order.teamInfo.nickname].filter(Boolean).join(" "));
}

function getOrderTeamName(order) {
  if (order.designInfo) return clean(order.designInfo.outputName || order.designInfo.designName);
  if (!order.teamInfo) return clean(order.color);
  return clean(order.teamInfo.team);
}

function getOrderOutputName(order) {
  if (order.designInfo) {
    return [order.line, order.designInfo.outputName || order.designInfo.designName].filter(Boolean).join(" ");
  }

  if (order.variant === "JR" && order.teamInfo) {
    return [order.line, order.teamInfo.team, order.teamInfo.nickname, order.variantLabel || getVariantLabel(order)].filter(Boolean).join(" ");
  }

  return order.teamInfo
    ? `${order.line} ${order.teamInfo.team} ${order.teamInfo.nickname}`
    : order.line || "SIN_EQUIPO";
}

function countBy(values) {
  return values.reduce(function (counts, value) {
    const key = value || "";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function countMultiSizeOrders(rows) {
  return (rows || []).filter(function (row) {
    return row.sizes && row.sizes.length > 1;
  }).length;
}

async function generateMockups(options) {
  // Flujo principal:
  // 1. Leer Excel segun modo.
  // 2. Filtrar/consolidar filas.
  // 3. Resolver mockup y firma.
  // 4. Anotar cada PDF y guardarlo en la estructura final.
  const job = buildSelectedJob(options);
  const mode = job.mode;
  const excelName = job.excelName;
  const excel = job.excel;
  const filteredRows = job.filteredRows;
  const rows = job.rows;
  const sectionName = job.sectionName;
  const outputRoot = job.outputRoot;
  const validation = validateSelectedJob(job, options);
  const validationByClave = validation.items.reduce(function (index, item) {
    index[item.clave] = item;
    return index;
  }, {});
  const rowsToGenerate = rows.filter(function (order) {
    const item = validationByClave[buildItemKey(mode, order)];
    return item && item.estado === STATE_MISSING;
  });
  const designer = normalizeDesigner(options.designer);
  const signaturePath = resolveSignaturePath(designer, options.signaturesDir);
  let ok = 0;
  let missing = 0;
  const outputs = [];
  const missingRows = [];
  const generatedItems = [];

  console.log(`Excel: ${options.excel || excelName || "upload"}`);
  console.log(`Modo: ${mode}`);
  console.log(`Hoja: ${excel.sheetName}`);
  console.log(`Fecha: ${excel.dateText}`);
  console.log(`Disenador: ${designer}`);
  console.log(`Firma: ${signaturePath}`);
  console.log(`Filas Excel: ${excel.rows.length}`);
  console.log(`Filas seleccionadas: ${filteredRows.length}`);
  console.log(`Grupos consolidados: ${rows.length}`);
  console.log(`Faltantes por generar: ${rowsToGenerate.length}`);

  for (const order of rowsToGenerate) {
    const validationItem = validationByClave[buildItemKey(mode, order)];
    const mockupPath = buildMockupPath(options.mockups, order);

    if (order.variant === "JR") {
      console.log(`JR Championship detectado fila ${order.sourceRow}: ${order.style} -> ${order.variantLabel || getVariantLabel(order)} (${order.garmentType || "sin tipo"}) | ${getOrderOutputName(order)}`);
    }

    if (!mockupPath || !fs.existsSync(mockupPath)) {
      missing++;
      missingRows.push({
        sourceRow: order.sourceRow,
        sourceRows: order.sourceRows || [order.sourceRow],
        clave: validationItem ? validationItem.clave : buildItemKey(mode, order),
        style: order.style,
        variantLabel: order.variantLabel || getVariantLabel(order),
        garmentType: order.garmentType || "",
        color: order.color,
        mockupPath
      });
      console.warn(`Mockup faltante fila ${order.sourceRow}: ${order.style} | ${order.color} | ${mockupPath || "sin ruta"}`);
      await yieldToEventLoop();
      continue;
    }

    const outputPath = validationItem ? validationItem.expectedPath : mode === MODE_SAMPLES ? buildSamplesOutputPath(outputRoot, order) : buildOutputPath(outputRoot, order);

    if (fs.existsSync(outputPath)) {
      console.warn(`Archivo ya existe antes de generar: ${outputPath}`);
      await yieldToEventLoop();
      continue;
    }

    const annotate = mode === MODE_SAMPLES ? annotateSamplesPdf : annotatePdf;
    await annotate({
      mockupPath,
      outputPath,
      order,
      dateText: excel.dateText,
      fontPath: options.font,
      signaturePath
    });
    ok++;
    outputs.push(outputPath);
    generatedItems.push(Object.assign({}, validationItem, {
      archivo: outputPath,
      path: outputPath,
      estado: STATE_CREATED,
      error: ""
    }));
    console.log(`OK fila ${order.sourceRow}: ${outputPath}`);
    await yieldToEventLoop();
  }

  console.log(`Terminado. OK: ${ok} | Faltantes: ${missing}`);

  const result = {
    ok,
    missing,
    outputs,
    missingRows,
    dateText: excel.dateText,
    fechaEmbarque: job.fechaEmbarque,
    mode,
    sectionLabel: sectionName,
    excelName,
    excelPath: options.excel || "",
    sheetName: excel.sheetName,
    designer,
    signaturePath,
    out: outputRoot,
    rows: rows.length,
    pedidosMultitalle: countMultiSizeOrders(rows),
    rowsToGenerate: rowsToGenerate.length,
    selectedRows: filteredRows.length,
    totalRows: excel.rows.length,
    validation,
    styles: uniqueSorted(rows.map(function (row) { return getStyleFamily(row.style); })),
    sizes: uniqueSorted(rows.map(function (row) { return row.size; })),
    variants: uniqueSorted(rows.map(getVariantFilterValue))
  };

  try {
    const historyResult = history.recordRun({
      mode,
      sectionLabel: sectionName,
      herramienta: mode === MODE_SAMPLES ? TOOL_SAMPLES : TOOL_BULK,
      fechaEmbarque: job.fechaEmbarque,
      excelName,
      excelPath: options.excel || "",
      sheetName: excel.sheetName,
      outputRoot,
      requestedOutputDir: options.out,
      mockupsDir: options.mockups,
      designer,
      totalRows: excel.rows.length,
      selectedRows: filteredRows.length,
      consolidatedRows: rows.length,
      pdfsGenerated: ok,
      missingMockups: missing,
      styles: result.styles,
      sizes: result.sizes,
      outputs,
      missingRows,
      status: "completed"
    });
    result.historyDb = historyResult.dbPath;
    result.historyLog = historyResult.logPath;
    result.historyRunId = historyResult.runId;
    result.itemsRecorded = history.recordItems(historyResult.runId, generatedItems);
  } catch (error) {
    result.historyWarning = error.message;
    console.warn(`Historial no registrado: ${error.message}`);
  }

  return result;
}

function consolidateSampleRows(rows) {
  const groups = new Map();

  rows.forEach(function (row) {
    const key = [
      row.wo,
      row.roster,
      row.style,
      cleanUpper(row.color)
    ].join("||");
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, Object.assign({}, row, {
        qty: normalizeQty(row.qty),
        sourceRows: [row.sourceRow]
      }));
      return;
    }

    existing.qty += normalizeQty(row.qty);
    existing.sourceRows.push(row.sourceRow);
  });

  return Array.from(groups.values());
}

function consolidateRows(rows) {
  const groups = new Map();

  rows.forEach(function (row) {
    const key = buildBulkGroupKey(row);
    const existing = groups.get(key);

    if (!existing) {
      const first = Object.assign({}, row, {
        qty: normalizeQty(row.qty),
        sizes: row.size ? [row.size] : [],
        sourceRows: [row.sourceRow]
      });
      groups.set(key, first);
      return;
    }

    existing.qty += normalizeQty(row.qty);
    existing.sourceRows.push(row.sourceRow);
    if (row.size && existing.sizes.indexOf(row.size) === -1) {
      existing.sizes.push(row.size);
      existing.size = existing.sizes.join("-");
    }
  });

  return Array.from(groups.values()).map(function (row) {
    if (row.sizes && row.sizes.length > 1) {
      row.size = row.sizes.join("-");
    }

    return row;
  });
}

function buildBulkGroupKey(row) {
  return [
    row.shipOrder,
    row.wo,
    row.style,
    cleanUpper(row.color)
  ].join("||");
}

function selectJobRows(rows, options, mode) {
  if (mode === MODE_SAMPLES) {
    const filteredRows = filterRows(rows, options);
    return {
      filteredRows,
      consolidatedRows: consolidateSampleRows(filteredRows)
    };
  }

  // Un filtro de talla selecciona el pedido completo. Consolidar primero evita
  // crear una plantilla individual cuando el mismo pedido contiene varias tallas.
  const styleFilteredRows = filterRows(rows, Object.assign({}, options, { sizes: [] }));
  const allConsolidatedRows = consolidateRows(styleFilteredRows);
  const selectedSizes = new Set((options.sizes || []).map(cleanUpper).filter(Boolean));
  const consolidatedRows = allConsolidatedRows.filter(function (row) {
    if (selectedSizes.size === 0) return true;
    if (selectedSizes.has(cleanUpper(row.size))) return true;
    return (row.sizes || []).some(function (size) {
      return selectedSizes.has(cleanUpper(size));
    });
  });
  const selectedSourceRows = new Set();

  consolidatedRows.forEach(function (row) {
    (row.sourceRows || [row.sourceRow]).forEach(function (sourceRow) {
      selectedSourceRows.add(sourceRow);
    });
  });

  return {
    filteredRows: styleFilteredRows.filter(function (row) {
      return selectedSourceRows.has(row.sourceRow);
    }),
    consolidatedRows
  };
}

function normalizeQty(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function yieldToEventLoop() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

function filterRows(rows, options) {
  const selectedStyles = new Set((options.styles || []).map(cleanUpper).filter(Boolean));
  const selectedSizes = new Set((options.sizes || []).map(cleanUpper).filter(Boolean));
  const selectedVariants = new Set((options.variants || []).map(cleanUpper).filter(Boolean));

  return rows.filter(function (row) {
    const rowFamily = getStyleFamily(row.style);
    const rowVariant = cleanUpper(getVariantFilterValue(row));
    const matchesStyle = selectedStyles.size === 0 || selectedStyles.has(rowFamily) || selectedStyles.has(row.style);
    const matchesSize = selectedSizes.size === 0 || selectedSizes.has(row.size);
    const matchesVariant = selectedVariants.size === 0 || selectedVariants.has(rowVariant);
    return matchesStyle && matchesSize && matchesVariant;
  });
}

function preparePrintQueue(options) {
  const job = buildSelectedJob(options);
  const pdfIndex = indexOutputPdfFiles(job.outputRoot);
  const dbRecords = history.getItemRecordsByClaves(job.rows.map(function (order) {
    return buildItemKey(job.mode, order);
  }));
  const items = [];
  const missingRows = [];
  const duplicateRows = [];
  const printOrder = normalizePrintOrder(options.printOrder);
  const printOptions = getPrintOptions(options);

  job.rows.forEach(function (order, index) {
    const clave = buildItemKey(job.mode, order);
    const dbRecord = dbRecords[clave] || null;
    const expectedPath = job.mode === MODE_SAMPLES ? buildSamplesOutputPath(job.outputRoot, order) : buildOutputPath(job.outputRoot, order);
    const candidates = findPrintCandidates(pdfIndex, job.outputRoot, job.mode, order);
    const exactExists = fs.existsSync(expectedPath);
    const chosenPath = exactExists ? expectedPath : chooseBestPrintCandidate(candidates);

    if (candidates.length > 1) {
      duplicateRows.push({
        sourceRow: order.sourceRow,
        sourceRows: order.sourceRows || [order.sourceRow],
        key: getPrintKeys(order, job.mode).join(" / "),
        style: order.style,
        variantLabel: order.variantLabel || getVariantLabel(order),
        garmentType: order.garmentType || "",
        size: order.size,
        chosenPath,
        candidates
      });
    }

    if (!chosenPath) {
      missingRows.push({
        sourceRow: order.sourceRow,
        sourceRows: order.sourceRows || [order.sourceRow],
        key: getPrintKeys(order, job.mode).join(" / "),
        style: order.style,
        variantLabel: order.variantLabel || getVariantLabel(order),
        garmentType: order.garmentType || "",
        size: order.size,
        expectedPath,
        candidates
      });
      return;
    }

    items.push({
      order: 0,
      excelOrder: index + 1,
      sourceRow: order.sourceRow,
      sourceRows: order.sourceRows || [order.sourceRow],
      clave,
      key: getPrintKeys(order, job.mode).join(" / "),
      style: order.style,
      variantLabel: order.variantLabel || getVariantLabel(order),
      garmentType: order.garmentType || "",
      size: order.size,
      qty: order.qty,
      path: chosenPath,
      impreso: dbRecord ? dbRecord.impreso : false,
      registroExiste: !!dbRecord,
      match: exactExists ? "exacto" : "por nombre"
    });
  });

  const orderedItems = printOrder === PRINT_ORDER_EXCEL ? items : items.slice().reverse();
  orderedItems.forEach(function (item, index) {
    item.order = index + 1;
  });

  return {
    mode: job.mode,
    sectionLabel: job.sectionName,
    excelName: job.excelName,
    excelPath: options.excel || "",
    sheetName: job.excel.sheetName,
    out: job.outputRoot,
    fechaEmbarque: job.fechaEmbarque,
    totalRows: job.excel.rows.length,
    selectedRows: job.filteredRows.length,
    rows: job.rows.length,
    pedidosMultitalle: countMultiSizeOrders(job.rows),
    printOrder,
    printOrderLabel: getPrintOrderLabel(printOrder),
    printOptions,
    printable: orderedItems.length,
    yaImpresos: orderedItems.filter(function (item) { return item.impreso; }).length,
    pendientesImpresion: orderedItems.filter(function (item) { return item.registroExiste && !item.impreso; }).length,
    missing: missingRows.length,
    duplicates: duplicateRows.length,
    items: orderedItems,
    missingRows,
    duplicateRows,
    styles: uniqueSorted(job.rows.map(function (row) { return getStyleFamily(row.style); })),
    sizes: uniqueSorted(job.rows.map(function (row) { return row.size; })),
    variants: uniqueSorted(job.rows.map(getVariantFilterValue))
  };
}

function submitPrintQueue(options) {
  const queue = preparePrintQueue(options);
  const printer = clean(options.printer);
  const printOptions = queue.printOptions;
  const itemsToPrint = getPendingPrintItems(queue.items);
  const printed = [];
  const failed = [];
  let itemsMarcadosImpresos = 0;
  let printHistoryWarning = "";

  if (queue.items.length === 0) {
    throw new Error("No hay PDFs encontrados para mandar a imprimir.");
  }

  if (itemsToPrint.length === 0) {
    return Object.assign({}, queue, {
      submitted: 0,
      failed: 0,
      printer: printer || "default",
      printOptions,
      itemsMarcadosImpresos,
      printHistoryWarning,
      omitidosImpresos: queue.yaImpresos,
      omitidosSinRegistro: queue.items.filter(function (item) { return !item.registroExiste; }).length,
      sinPendientes: true,
      printed,
      failedRows: failed
    });
  }

  itemsToPrint.forEach(function (item) {
    const args = buildLpArgs(printer, printOptions, item.path);
    const result = childProcess.spawnSync("lp", args, { encoding: "utf8" });

    if (result.status === 0) {
      printed.push({
        path: item.path,
        clave: item.clave,
        stdout: clean(result.stdout)
      });
      return;
    }

    failed.push({
      path: item.path,
      status: result.status,
      error: clean(result.stderr || result.error && result.error.message || result.stdout)
    });
  });

  if (printed.length > 0) {
    try {
      itemsMarcadosImpresos = history.markItemsPrinted(printed.map(function (item) { return item.clave; }));
    } catch (error) {
      printHistoryWarning = error.message;
    }
  }

  return Object.assign({}, queue, {
    submitted: printed.length,
    failed: failed.length,
    printer: printer || "default",
    printOptions,
    itemsMarcadosImpresos,
    printHistoryWarning,
    omitidosImpresos: queue.yaImpresos,
    omitidosSinRegistro: queue.items.filter(function (item) { return !item.registroExiste; }).length,
    sinPendientes: false,
    printed,
    failedRows: failed
  });
}

function getPendingPrintItems(items) {
  return (items || []).filter(function (item) {
    return item.registroExiste && !item.impreso;
  });
}

function normalizePrintOrder(value) {
  const order = cleanUpper(value);
  return order === "EXCEL" || order === "TOP-DOWN" ? PRINT_ORDER_EXCEL : PRINT_ORDER_STACK;
}

function getPrintOrderLabel(printOrder) {
  return printOrder === PRINT_ORDER_EXCEL ? "Excel de arriba hacia abajo" : "Pila: de abajo hacia arriba";
}

function getPrintOptions(options) {
  if (Array.isArray(options.printOptions)) {
    return options.printOptions.map(clean).filter(Boolean);
  }

  return DEFAULT_PRINT_OPTIONS.slice();
}

function buildLpArgs(printer, printOptions, filePath) {
  const args = [];

  if (printer) {
    args.push("-d", printer);
  }

  printOptions.forEach(function (option) {
    args.push("-o", option);
  });

  args.push(filePath);
  return args;
}

function indexOutputPdfFiles(outputRoot) {
  const files = [];
  const index = new Map();

  if (fs.existsSync(outputRoot)) {
    collectPdfFiles(outputRoot, files);
  }

  files.forEach(function (filePath) {
    getFilePrintKeys(filePath).forEach(function (key) {
      if (!key) return;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(filePath);
    });
  });

  return {
    files,
    index
  };
}

function collectPdfFiles(dir, files) {
  fs.readdirSync(dir).forEach(function (fileName) {
    const filePath = path.join(dir, fileName);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      collectPdfFiles(filePath, files);
      return;
    }

    if (path.extname(fileName).toLowerCase() === ".pdf") {
      files.push(filePath);
    }
  });
}

function getFilePrintKeys(filePath) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const keys = [cleanUpper(baseName), cleanUpper(baseName.split(" - ")[0])];
  return Array.from(new Set(keys.filter(Boolean)));
}

function getPrintKeys(order, mode) {
  if (mode === MODE_SAMPLES) {
    return [order.roster, order.wo].map(cleanUpper).filter(Boolean);
  }

  return [order.wo].map(cleanUpper).filter(Boolean);
}

function findPrintCandidates(pdfIndex, outputRoot, mode, order) {
  const styleFamily = getStyleFamily(order.style);
  const candidates = [];

  getPrintKeys(order, mode).forEach(function (key) {
    (pdfIndex.index.get(key) || []).forEach(function (filePath) {
      if (candidates.indexOf(filePath) !== -1) return;
      if (!matchesPrintFolder(outputRoot, filePath, mode, styleFamily, order.size)) return;
      candidates.push(filePath);
    });
  });

  return candidates.sort(comparePrintCandidates);
}

function matchesPrintFolder(outputRoot, filePath, mode, styleFamily, size) {
  const relativeParts = path.relative(outputRoot, filePath).split(path.sep);

  if (relativeParts[0] !== styleFamily) return false;
  if (mode === MODE_SAMPLES || !size) return true;

  const folderSizes = cleanUpper(relativeParts[1]).split("-").filter(Boolean).sort();
  const requestedSizes = cleanUpper(size).split("-").filter(Boolean).sort();
  return folderSizes.length === requestedSizes.length && requestedSizes.every(function (requestedSize, index) {
    return requestedSize === folderSizes[index];
  });
}

function chooseBestPrintCandidate(candidates) {
  return candidates.length ? candidates[0] : "";
}

function comparePrintCandidates(left, right) {
  const leftBase = path.basename(left, path.extname(left));
  const rightBase = path.basename(right, path.extname(right));
  const leftCopy = / \d+$/.test(leftBase);
  const rightCopy = / \d+$/.test(rightBase);

  if (leftCopy !== rightCopy) return leftCopy ? 1 : -1;
  return left.localeCompare(right, "en");
}

async function main() {
  const args = parseArgs(process.argv);
  await generateMockups(args);
}

if (require.main === module) {
  main().catch(function (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_EXCEL,
  DEFAULT_MOCKUPS,
  DEFAULT_OUT,
  DEFAULT_ALDRICH_FONT,
  DEFAULT_SIGNATURES_DIR,
  DEFAULT_PRINT_OPTIONS,
  DESIGNERS,
  PRINT_ORDER_EXCEL,
  PRINT_ORDER_STACK,
  MODE_BULK,
  MODE_SAMPLES,
  validateExcelMode,
  STATE_MISSING,
  STATE_CREATED,
  STATE_FILE_WITHOUT_RECORD,
  STATE_RECORD_WITHOUT_FILE,
  STATE_CONFLICT,
  buildMockupPath,
  buildOutputPath,
  buildSamplesOutputPath,
  getJobOutputRoot,
  selectJobRows,
  generateMockups,
  validateMockups,
  preparePrintQueue,
  submitPrintQueue,
  getPendingPrintItems,
  history,
  readExcel,
  readExcelBuffer,
  summarizeExcel
};
