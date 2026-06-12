const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const SOURCE_APP = "RMC MockupTool";
const APP_VERSION = "0.1.0";
const RMC_CEP_ROOT = path.join(process.env.HOME || "/Users/rmlsub1", "Documents", "RMC - CEP");
const DB_DIR = path.join(RMC_CEP_ROOT, "RMC_BD");
const DB_PATH = path.join(DB_DIR, "RMC_CEP.sqlite");
const LOG_DIR = path.join(RMC_CEP_ROOT, "RMC MockupTool portafolio interno", "06_Logs");
const SQLITE_BIN = fs.existsSync("/usr/bin/sqlite3") ? "/usr/bin/sqlite3" : "sqlite3";

function recordRun(run) {
  const createdAt = new Date();
  const logPath = writeRunLog(run, createdAt);
  ensureDatabase();
  insertRun(run, createdAt);

  return {
    dbPath: DB_PATH,
    logPath
  };
}

function writeRunLog(run, createdAt) {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const fileName = [
    formatTimestampForFile(createdAt.toISOString()),
    run.mode === "samples" ? "genericas" : "por-lote",
    sanitizeFilePart(run.excelName || "excel")
  ].filter(Boolean).join("_") + ".json";
  const logPath = path.join(LOG_DIR, fileName);
  const payload = Object.assign({
    sourceApp: SOURCE_APP,
    appVersion: APP_VERSION,
    fecha: formatDate(createdAt),
    hora: formatTime(createdAt),
    createdAt: createdAt.toISOString()
  }, run);

  fs.writeFileSync(logPath, JSON.stringify(payload, null, 2));
  return logPath;
}

function ensureDatabase() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  runSql(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cep_registry (
      source_app TEXT PRIMARY KEY,
      runs_table TEXT NOT NULL,
      app_version TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    INSERT INTO cep_registry (source_app, runs_table, app_version, updated_at)
    VALUES (${sqlValue(SOURCE_APP)}, 'rmc_mockuptool_runs', ${sqlValue(APP_VERSION)}, datetime('now', 'localtime'))
    ON CONFLICT(source_app) DO UPDATE SET
      runs_table = excluded.runs_table,
      app_version = excluded.app_version,
      updated_at = excluded.updated_at;
  `);
  ensureRunsTable();
}

function ensureRunsTable() {
  if (runsTableNeedsRebuild()) {
    rebuildRunsTable();
    return;
  }

  createRunsTable();
}

function runsTableNeedsRebuild() {
  const columns = getRunsTableColumns();
  if (columns.length === 0) return false;

  const expected = getExpectedRunsColumns();
  return columns.length !== expected.length || columns.some(function (column, index) {
    return column !== expected[index];
  });
}

function getRunsTableColumns() {
  const result = runSql("PRAGMA table_info(rmc_mockuptool_runs);", { capture: true });
  return result.trim().split("\n").filter(Boolean).map(function (line) {
    const parts = line.split("|");
    return parts[1] || "";
  }).filter(Boolean);
}

function getExpectedRunsColumns() {
  return [
    "id",
    "fecha",
    "hora",
    "seccion",
    "excel",
    "disenador",
    "filas_excel",
    "filas_seleccionadas",
    "grupos_consolidados",
    "pdfs_generados",
    "mockups_faltantes",
    "styles",
    "tallas"
  ];
}

function createRunsTable() {
  runSql(`
    CREATE TABLE IF NOT EXISTS rmc_mockuptool_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      seccion TEXT NOT NULL,
      excel TEXT,
      disenador TEXT,
      filas_excel INTEGER NOT NULL DEFAULT 0,
      filas_seleccionadas INTEGER NOT NULL DEFAULT 0,
      grupos_consolidados INTEGER NOT NULL DEFAULT 0,
      pdfs_generados INTEGER NOT NULL DEFAULT 0,
      mockups_faltantes INTEGER NOT NULL DEFAULT 0,
      styles TEXT,
      tallas TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mockuptool_runs_fecha_hora
      ON rmc_mockuptool_runs(fecha, hora);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_runs_seccion
      ON rmc_mockuptool_runs(seccion);
  `);
}

function rebuildRunsTable() {
  runSql(`
    DROP INDEX IF EXISTS idx_mockuptool_runs_created_at;
    DROP INDEX IF EXISTS idx_mockuptool_runs_mode;
    DROP INDEX IF EXISTS idx_mockuptool_runs_fecha_hora;
    DROP INDEX IF EXISTS idx_mockuptool_runs_seccion;

    ALTER TABLE rmc_mockuptool_runs RENAME TO rmc_mockuptool_runs_old;
  `);
  createRunsTable();
  runSql(`
    INSERT INTO rmc_mockuptool_runs (
      id,
      fecha,
      hora,
      seccion,
      excel,
      disenador,
      filas_excel,
      filas_seleccionadas,
      grupos_consolidados,
      pdfs_generados,
      mockups_faltantes,
      styles,
      tallas
    )
    SELECT
      id,
      strftime('%d/%m/%Y', created_at),
      strftime('%H:%M:%S', created_at),
      section_label,
      excel_name,
      designer,
      total_rows,
      selected_rows,
      consolidated_rows,
      pdfs_generated,
      missing_mockups,
      trim(replace(replace(replace(styles_json, '[', ''), ']', ''), '"', '')),
      trim(replace(replace(replace(sizes_json, '[', ''), ']', ''), '"', ''))
    FROM rmc_mockuptool_runs_old;

    DROP TABLE rmc_mockuptool_runs_old;
  `);
}

function insertRun(run, createdAt) {
  runSql(`
    INSERT INTO rmc_mockuptool_runs (
      fecha,
      hora,
      seccion,
      excel,
      disenador,
      filas_excel,
      filas_seleccionadas,
      grupos_consolidados,
      pdfs_generados,
      mockups_faltantes,
      styles,
      tallas
    ) VALUES (
      ${sqlValue(formatDate(createdAt))},
      ${sqlValue(formatTime(createdAt))},
      ${sqlValue(run.sectionLabel)},
      ${sqlValue(run.excelName)},
      ${sqlValue(run.designer)},
      ${sqlNumber(run.totalRows)},
      ${sqlNumber(run.selectedRows)},
      ${sqlNumber(run.consolidatedRows)},
      ${sqlNumber(run.pdfsGenerated)},
      ${sqlNumber(run.missingMockups)},
      ${sqlValue(formatList(run.styles))},
      ${sqlValue(formatList(run.sizes))}
    );
  `);
}

function runSql(sql, options) {
  const result = childProcess.spawnSync(SQLITE_BIN, [DB_PATH], {
    input: sql,
    encoding: "utf8"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || "sqlite3 fallo al registrar historial.").trim());
  }

  return options && options.capture ? result.stdout : "";
}

function sqlValue(value) {
  if (value == null || value === "") return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function sqlNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "0";
}

function formatTimestampForFile(value) {
  return String(value).replace(/[:.]/g, "-");
}

function formatDate(date) {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad2).join(":");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatList(values) {
  return (values || []).filter(Boolean).join(", ");
}

function sanitizeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[\/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

module.exports = {
  DB_PATH,
  DB_DIR,
  LOG_DIR,
  SOURCE_APP,
  ensureDatabase,
  recordRun
};
