const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const history = require("./history");

const SQLITE_BIN = fs.existsSync("/usr/bin/sqlite3") ? "/usr/bin/sqlite3" : "sqlite3";
const STANDARD_GENERIC_CODE = "ST";
const GENERIC_EXCEL_EXCLUDED_CODES = ["A", "H"];

const fallbackRows = [
  {
    variant_code: "IH",
    variant_name: "Indigenous Heritage"
  },
  {
    variant_code: "TB",
    variant_name: "Throwback"
  },
  {
    variant_code: "AS",
    variant_name: "All Star"
  },
  {
    variant_code: "JR",
    variant_name: "JR Championship",
    aliases: "JR Championship; Jr.Champ; Jr Champ; JR Champ"
  },
  {
    variant_code: "SS",
    variant_name: "Special / Foundation Designs",
    requires_design_code: 1,
    design_code: "GNB1",
    design_name: "Green Beret Foundation",
    aliases: "Green Beret; Green Beret Fundation; Green Beret Foundation",
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
    aliases: "Navy SEALs; Navy Seal Foundation; Navy SEALs Foundation",
    mockup_folder: "STARS STRIPES",
    mockup_file_pattern: "PLL-NSF.pdf",
    mockup_source_type: "pdf",
    mockup_status: "ready_pdf"
  }
];

let rowsForTesting = null;
let cachedRows = null;

function getRows() {
  if (rowsForTesting) return rowsForTesting.slice();
  if (cachedRows) return cachedRows.slice();

  try {
    cachedRows = readRowsFromDatabase();
  } catch (error) {
    cachedRows = fallbackRows.slice();
  }

  return cachedRows.slice();
}

function readRowsFromDatabase() {
  const sql = `
    SELECT
      variant_code,
      variant_name,
      is_official_team,
      requires_design_code,
      team_code,
      team_name,
      team_market,
      team_mascot,
      team_gender,
      file_team_name,
      design_code,
      design_name,
      template_name_placeholder,
      template_number_placeholder,
      aliases,
      liga,
      mockup_folder,
      mockup_file_pattern,
      mockup_source_type,
      mockup_status
    FROM rmc_nike_style_variants
    WHERE is_active = 1
    ORDER BY variant_code, team_code, design_code;
  `;
  const result = childProcess.spawnSync(SQLITE_BIN, ["-json", history.DB_PATH, sql], { encoding: "utf8" });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || "sqlite3 fallo al leer variantes.").trim());

  return JSON.parse(result.stdout || "[]");
}

function getGenericExcelCodes() {
  const codes = getRows()
    .map(function (row) { return cleanUpper(row.variant_code); })
    .filter(function (code) {
      return code && GENERIC_EXCEL_EXCLUDED_CODES.indexOf(code) === -1;
    });

  codes.push(STANDARD_GENERIC_CODE);

  return Array.from(new Set(codes)).sort();
}

function findDesign(variantCode, value, criteria) {
  const variant = cleanUpper(variantCode);
  const normalized = cleanUpper(value);
  const line = cleanUpper(criteria && criteria.line);

  if (!variant || !normalized) return null;

  const matches = getRows().filter(function (candidate) {
    if (cleanUpper(candidate.variant_code) !== variant) return false;
    if (!candidate.design_code && !candidate.design_name && !candidate.aliases) return false;
    return getMatchTokens(candidate).some(function (token) {
      return normalized.indexOf(token) !== -1;
    });
  });
  const row = line
    ? matches.find(function (candidate) { return cleanUpper(candidate.liga) === line; }) || matches[0]
    : matches[0];

  return row ? normalizeDesign(row) : null;
}

function getMatchTokens(row) {
  return [
    row.design_code,
    row.design_name,
    row.file_team_name
  ].concat(splitAliases(row.aliases))
    .map(cleanUpper)
    .filter(Boolean);
}

function normalizeDesign(row) {
  const variantCode = cleanUpper(row.variant_code);
  const designCode = cleanUpper(row.design_code);

  return {
    variantCode,
    variantName: clean(row.variant_name),
    code: designCode,
    designName: clean(row.design_name || row.file_team_name || row.design_code),
    outputName: clean(row.design_name || row.file_team_name || row.design_code),
    mockupFolder: clean(row.mockup_folder),
    mockupFile: clean(row.mockup_file_pattern),
    mockupSourceType: cleanUpper(row.mockup_source_type),
    mockupStatus: clean(row.mockup_status),
    aliases: splitAliases(row.aliases)
  };
}

function buildDesignMockupPath(mockupsRoot, designInfo) {
  if (!designInfo || !designInfo.mockupFolder || !designInfo.mockupFile) return "";
  if (designInfo.mockupSourceType && designInfo.mockupSourceType !== "PDF") return "";
  return path.join(mockupsRoot, designInfo.mockupFolder, designInfo.mockupFile);
}

function splitAliases(value) {
  return clean(value).split(";").map(clean).filter(Boolean);
}

function clean(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function cleanUpper(value) {
  return clean(value).toUpperCase();
}

function __setRowsForTesting(rows) {
  rowsForTesting = Array.isArray(rows) ? rows.slice() : null;
  cachedRows = null;
}

module.exports = {
  buildDesignMockupPath,
  findDesign,
  getGenericExcelCodes,
  __setRowsForTesting
};
