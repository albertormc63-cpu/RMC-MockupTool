const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const history = require("./history");

const SQLITE_BIN = fs.existsSync("/usr/bin/sqlite3") ? "/usr/bin/sqlite3" : "sqlite3";
const STANDARD_GENERIC_CODE = "ST";
const GENERIC_EXCEL_EXCLUDED_CODES = ["A", "H"];
const ALL_STAR_TEAM_DESIGNS = {
  A: {
    designName: "Home / West",
    outputName: "Home West",
    mockupSide: "Home",
    aliases: ["Home", "West", "TeamA", "Team A", "X001", "HAS1"],
    tokens: ["TEAM A", "TEAMA", "X001", "HAS1", "HOME", "WEST"]
  },
  B: {
    designName: "Away / East",
    outputName: "Away East",
    mockupSide: "Away",
    aliases: ["Away", "East", "TeamB", "Team B", "X002", "AAS1"],
    tokens: ["TEAM B", "TEAMB", "X002", "AAS1", "AWAY", "EAST"]
  }
};

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
  if (variant === "AS") return findAllStarDesign(normalized, line);

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

function findAllStarDesign(normalized, line) {
  const teamKey = inferAllStarTeamKeyFromValue(normalized);
  if (!teamKey) return null;

  const rows = getRows().filter(function (candidate) {
    if (cleanUpper(candidate.variant_code) !== "AS") return false;
    return candidate.design_code || candidate.design_name || candidate.aliases;
  });

  const matches = rows.filter(function (candidate) {
    return getAllStarTeamKey(candidate) === teamKey;
  });

  const row = line
    ? matches.find(function (candidate) { return cleanUpper(candidate.liga) === line; }) || matches[0]
    : matches[0];

  return row ? normalizeDesign(row) : null;
}

function inferAllStarTeamKeyFromValue(value) {
  const normalized = cleanUpper(value);
  if (/\bAS-[MF]-TA\b/.test(normalized)) return "A";
  if (/\bAS-[MF]-TB\b/.test(normalized)) return "B";

  return Object.keys(ALL_STAR_TEAM_DESIGNS).find(function (teamKey) {
    return ALL_STAR_TEAM_DESIGNS[teamKey].tokens.some(function (token) {
      return normalized.indexOf(token) !== -1;
    });
  }) || "";
}

function getAllStarTeamKey(row) {
  const source = cleanUpper([
    row.design_code,
    row.design_name,
    row.file_team_name,
    row.aliases,
    row.mockup_file_pattern
  ].filter(Boolean).join(" "));

  if (/\bT(?:EAM)?\s*A\b/.test(source) || source.indexOf("TEAMA") !== -1 || source.indexOf("HAS1") !== -1 || source.indexOf("X001") !== -1) {
    return "A";
  }
  if (/\bT(?:EAM)?\s*B\b/.test(source) || source.indexOf("TEAMB") !== -1 || source.indexOf("AAS1") !== -1 || source.indexOf("X002") !== -1) {
    return "B";
  }

  return "";
}

function getMatchTokens(row) {
  return [
    row.design_code,
    row.design_name,
    row.file_team_name
  ].concat(splitAliases(row.aliases))
    .concat(getAcronymTokens(row))
    .concat(getMockupFileTokens(row.mockup_file_pattern))
    .map(cleanUpper)
    .filter(Boolean);
}

function getAcronymTokens(row) {
  return [
    buildAcronym(row.design_name),
    buildAcronym(row.file_team_name)
  ].concat(splitAliases(row.aliases).map(buildAcronym));
}

function buildAcronym(value) {
  const words = clean(value).match(/[A-Za-z0-9]+/g) || [];
  if (words.length < 2) return "";
  return words.map(function (word) { return word.charAt(0); }).join("");
}

function getMockupFileTokens(value) {
  const baseName = path.basename(clean(value), path.extname(clean(value)));
  const ignored = new Set(["PDF", "JPG", "JPEG", "PNG", "PLL", "WLL"]);

  return (baseName.match(/[A-Za-z0-9]+/g) || []).filter(function (token) {
    const normalized = cleanUpper(token);
    return normalized.length > 1 && !ignored.has(normalized);
  });
}

function normalizeDesign(row) {
  const variantCode = cleanUpper(row.variant_code);
  const designCode = cleanUpper(row.design_code);
  const allStarTeamKey = variantCode === "AS" ? getAllStarTeamKey(row) : "";
  const allStarDesign = allStarTeamKey ? ALL_STAR_TEAM_DESIGNS[allStarTeamKey] : null;
  const mockupFile = allStarDesign
    ? `${cleanUpper(row.liga) || "PLL"} All Star Game ${allStarDesign.mockupSide}.pdf`
    : clean(row.mockup_file_pattern);

  return {
    variantCode,
    variantName: clean(row.variant_name),
    code: designCode,
    designName: allStarDesign ? allStarDesign.designName : clean(row.design_name || row.file_team_name || row.design_code),
    outputName: allStarDesign ? allStarDesign.outputName : clean(row.design_name || row.file_team_name || row.design_code),
    mockupFolder: clean(row.mockup_folder),
    mockupFile,
    mockupSourceType: cleanUpper(row.mockup_source_type),
    mockupStatus: clean(row.mockup_status),
    aliases: allStarDesign ? allStarDesign.aliases.slice() : splitAliases(row.aliases)
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
