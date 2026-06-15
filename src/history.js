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
  const runKey = formatRunId(createdAt);
  const logPath = writeRunLog(run, createdAt);
  ensureDatabase();
  insertRun(run, createdAt, runKey);

  return {
    runId: runKey,
    dbPath: DB_PATH,
    logPath
  };
}

function recordItems(runId, items) {
  ensureDatabase();

  if (!items || !items.length) return 0;

  const values = items.map(function (item) {
    return [
      sqlValue(item.runId || runId),
      sqlValue(item.herramienta || ""),
      sqlNumber(item.filaExcel || item.sourceRow),
      sqlValue(item.wo),
      sqlValue(item.shipOrder),
      sqlValue(item.style),
      sqlValue(item.styleFamily),
      sqlValue(item.equipo || item.team),
      sqlValue(item.variante),
      sqlValue(item.version),
      sqlValue(item.talla || item.size),
      sqlNumber(item.piezas),
      sqlValue(toFileName(item.archivo)),
      sqlValue(item.estado),
      sqlValue(item.error || ""),
      sqlValue(item.tiempo || "00:00:00"),
      sqlValue(item.clave)
    ].join(", ");
  }).map(function (value) {
    return `(${value})`;
  }).join(",\n");

  runSql(`
    INSERT INTO rmc_mockuptool_items (
      run_id,
      herramienta,
      fila_excel,
      wo,
      ship_order,
      style,
      style_family,
      equipo,
      variante,
      version,
      talla,
      piezas,
      archivo,
      estado,
      error,
      tiempo,
      clave
    ) VALUES
    ${values}
    ON CONFLICT(clave) DO UPDATE SET
      run_id = excluded.run_id,
      herramienta = excluded.herramienta,
      fila_excel = excluded.fila_excel,
      wo = excluded.wo,
      ship_order = excluded.ship_order,
      style = excluded.style,
      style_family = excluded.style_family,
      equipo = excluded.equipo,
      variante = excluded.variante,
      version = excluded.version,
      talla = excluded.talla,
      piezas = excluded.piezas,
      archivo = excluded.archivo,
      estado = excluded.estado,
      error = excluded.error,
      tiempo = excluded.tiempo;
  `);

  return items.length;
}

function getItemRecordsByClaves(claves) {
  ensureDatabase();

  const uniqueClaves = Array.from(new Set((claves || []).filter(Boolean)));
  if (!uniqueClaves.length) return {};

  const values = uniqueClaves.map(sqlValue).join(", ");
  const result = runSql(`
    SELECT clave || char(9) || COALESCE(archivo, '') || char(9) || COALESCE(estado, '')
    FROM rmc_mockuptool_items
    WHERE clave IN (${values});
  `, { capture: true });
  const records = {};

  result.trim().split("\n").filter(Boolean).forEach(function (line) {
    const parts = line.split("\t");
    records[parts[0]] = {
      clave: parts[0],
      archivo: parts[1] || "",
      estado: parts[2] || ""
    };
  });

  return records;
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
  ensureItemsTable();
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
  const hasWrongColumns = columns.length !== expected.length || columns.some(function (column, index) {
    return column !== expected[index];
  });

  return hasWrongColumns || getTableColumnType("rmc_mockuptool_runs", "id") !== "TEXT";
}

function getRunsTableColumns() {
  const result = runSql("PRAGMA table_info(rmc_mockuptool_runs);", { capture: true });
  return result.trim().split("\n").filter(Boolean).map(function (line) {
    const parts = line.split("|");
    return parts[1] || "";
  }).filter(Boolean);
}

function getTableColumnType(tableName, columnName) {
  const result = runSql(`PRAGMA table_info(${tableName});`, { capture: true });
  const line = result.trim().split("\n").filter(Boolean).find(function (row) {
    const parts = row.split("|");
    return parts[1] === columnName;
  });

  if (!line) return "";
  return String(line.split("|")[2] || "").toUpperCase();
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
      id TEXT PRIMARY KEY,
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

function ensureItemsTable() {
  if (itemsTableNeedsRebuild()) {
    rebuildItemsTable();
    return;
  }

  createItemsTable();
}

function itemsTableNeedsRebuild() {
  const columns = getItemsTableColumns();
  if (columns.length === 0) return false;

  const expected = getExpectedItemsColumns();
  return columns.length !== expected.length || columns.some(function (column, index) {
    return column !== expected[index];
  });
}

function getItemsTableColumns() {
  const result = runSql("PRAGMA table_info(rmc_mockuptool_items);", { capture: true });
  return result.trim().split("\n").filter(Boolean).map(function (line) {
    const parts = line.split("|");
    return parts[1] || "";
  }).filter(Boolean);
}

function getExpectedItemsColumns() {
  return [
    "id",
    "run_id",
    "herramienta",
    "fila_excel",
    "wo",
    "ship_order",
    "style",
    "style_family",
    "equipo",
    "variante",
    "version",
    "talla",
    "piezas",
    "archivo",
    "estado",
    "error",
    "tiempo",
    "clave"
  ];
}

function createItemsTable() {
  runSql(`
    CREATE TABLE IF NOT EXISTS rmc_mockuptool_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      herramienta TEXT,
      fila_excel INTEGER,
      wo TEXT,
      ship_order TEXT,
      style TEXT,
      style_family TEXT,
      equipo TEXT,
      variante TEXT,
      version TEXT,
      talla TEXT,
      piezas INTEGER DEFAULT 1,
      archivo TEXT,
      estado TEXT,
      error TEXT,
      tiempo TEXT,
      clave TEXT UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_run_id
      ON rmc_mockuptool_items(run_id);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_wo
      ON rmc_mockuptool_items(wo);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_style
      ON rmc_mockuptool_items(style);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_estado
      ON rmc_mockuptool_items(estado);
  `);
}

function rebuildItemsTable() {
  runSql(`
    DROP INDEX IF EXISTS idx_mockuptool_items_run_id;
    DROP INDEX IF EXISTS idx_mockuptool_items_wo;
    DROP INDEX IF EXISTS idx_mockuptool_items_style;
    DROP INDEX IF EXISTS idx_mockuptool_items_estado;
    DROP TABLE IF EXISTS rmc_mockuptool_items;
  `);
  createItemsTable();
}

function rebuildRunsTable() {
  const oldColumns = getRunsTableColumns();
  const hasCleanColumns = oldColumns.indexOf("fecha") !== -1 && oldColumns.indexOf("hora") !== -1;

  runSql(`
    DROP INDEX IF EXISTS idx_mockuptool_runs_created_at;
    DROP INDEX IF EXISTS idx_mockuptool_runs_mode;
    DROP INDEX IF EXISTS idx_mockuptool_runs_fecha_hora;
    DROP INDEX IF EXISTS idx_mockuptool_runs_seccion;

    ALTER TABLE rmc_mockuptool_runs RENAME TO rmc_mockuptool_runs_old;
  `);
  createRunsTable();

  if (hasCleanColumns) {
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
        CASE
          WHEN typeof(id) = 'text' AND id <> '' THEN id
          ELSE substr(fecha, 7, 4) || substr(fecha, 4, 2) || substr(fecha, 1, 2) || '-' || replace(hora, ':', '')
        END,
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
      FROM rmc_mockuptool_runs_old;

      DROP TABLE rmc_mockuptool_runs_old;
    `);
    return;
  }

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
        strftime('%Y%m%d-%H%M%S', created_at),
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

function insertRun(run, createdAt, runId) {
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
    ) VALUES (
      ${sqlValue(runId)},
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

function formatRunId(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join("") + "-" + [
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds())
  ].join("");
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

function toFileName(value) {
  const filePath = String(value || "");
  return filePath ? path.basename(filePath) : "";
}

module.exports = {
  DB_PATH,
  DB_DIR,
  LOG_DIR,
  SOURCE_APP,
  ensureDatabase,
  getItemRecordsByClaves,
  recordItems,
  recordRun
};
