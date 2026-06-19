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
      sqlValue(item.path || item.archivo),
      sqlValue(item.estado),
      sqlValue(item.error || ""),
      sqlValue(item.tiempo || "00:00:00"),
      sqlValue(item.clave),
      sqlValue(item.fechaEmbarque || item.fecha_embarque),
      sqlNumber(item.impreso ? 1 : 0)
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
      path,
      estado,
      error,
      tiempo,
      clave,
      fecha_embarque,
      impreso
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
      path = excluded.path,
      estado = excluded.estado,
      error = excluded.error,
      tiempo = excluded.tiempo,
      fecha_embarque = excluded.fecha_embarque,
      impreso = CASE
        WHEN excluded.impreso = 1 THEN 1
        ELSE COALESCE(rmc_mockuptool_items.impreso, 0)
      END;
  `);

  return items.length;
}

function getItemRecordsByClaves(claves) {
  ensureDatabase();

  const uniqueClaves = Array.from(new Set((claves || []).filter(Boolean)));
  if (!uniqueClaves.length) return {};

  const values = uniqueClaves.map(sqlValue).join(", ");
  const result = runSql(`
    SELECT clave || char(9) || COALESCE(archivo, '') || char(9) || COALESCE(path, '') || char(9) || COALESCE(estado, '') || char(9) || COALESCE(impreso, 0)
    FROM rmc_mockuptool_items
    WHERE clave IN (${values});
  `, { capture: true });
  const records = {};

  result.trim().split("\n").filter(Boolean).forEach(function (line) {
    const parts = line.split("\t");
    records[parts[0]] = {
      clave: parts[0],
      archivo: parts[1] || "",
      path: parts[2] || "",
      estado: parts[3] || "",
      impreso: Number(parts[4] || 0) === 1
    };
  });

  return records;
}

function markItemsPrinted(claves) {
  ensureDatabase();

  const uniqueClaves = Array.from(new Set((claves || []).filter(Boolean)));
  if (!uniqueClaves.length) return 0;

  const values = uniqueClaves.map(sqlValue).join(", ");
  const result = runSql(`
    UPDATE rmc_mockuptool_items
    SET impreso = 1
    WHERE clave IN (${values});
    SELECT changes();
  `, { capture: true });

  return Number(result.trim().split("\n").filter(Boolean).pop() || 0);
}

function writeRunLog(run, createdAt) {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const fileName = [
    formatTimestampForFile(createdAt.toISOString()),
    run.mode === "samples" ? "genericas" : "personalizadas",
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
  standardizeHistoricalData();
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
    "fecha_embarque",
    "seccion",
    "herramienta",
    "excel",
    "excel_path",
    "path",
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
      fecha_embarque TEXT,
      seccion TEXT NOT NULL,
      herramienta TEXT,
      excel TEXT,
      excel_path TEXT,
      path TEXT,
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
    "path",
    "estado",
    "error",
    "tiempo",
    "clave",
    "fecha_embarque",
    "impreso"
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
      path TEXT,
      estado TEXT,
      error TEXT,
      tiempo TEXT,
      clave TEXT UNIQUE,
      fecha_embarque TEXT,
      impreso INTEGER NOT NULL DEFAULT 0 CHECK (impreso IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_run_id
      ON rmc_mockuptool_items(run_id);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_wo
      ON rmc_mockuptool_items(wo);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_style
      ON rmc_mockuptool_items(style);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_estado
      ON rmc_mockuptool_items(estado);

    CREATE INDEX IF NOT EXISTS idx_mockuptool_items_impreso
      ON rmc_mockuptool_items(impreso);
  `);
}

function rebuildItemsTable() {
  const oldColumns = getItemsTableColumns();
  const tableExists = oldColumns.length > 0;

  runSql(`
    DROP INDEX IF EXISTS idx_mockuptool_items_run_id;
    DROP INDEX IF EXISTS idx_mockuptool_items_wo;
    DROP INDEX IF EXISTS idx_mockuptool_items_style;
    DROP INDEX IF EXISTS idx_mockuptool_items_estado;
    DROP INDEX IF EXISTS idx_mockuptool_items_impreso;
  `);

  if (!tableExists) {
    createItemsTable();
    return;
  }

  runSql("ALTER TABLE rmc_mockuptool_items RENAME TO rmc_mockuptool_items_old;");
  createItemsTable();

  runSql(`
    INSERT INTO rmc_mockuptool_items (
      id,
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
      path,
      estado,
      error,
      tiempo,
      clave,
      fecha_embarque,
      impreso
    )
    SELECT
      ${oldColumnExpr(oldColumns, "id", "NULL")},
      ${oldColumnExpr(oldColumns, "run_id", "''")},
      ${oldColumnExpr(oldColumns, "herramienta", "NULL")},
      ${oldColumnExpr(oldColumns, "fila_excel", "NULL")},
      ${oldColumnExpr(oldColumns, "wo", "NULL")},
      ${oldColumnExpr(oldColumns, "ship_order", "NULL")},
      ${oldColumnExpr(oldColumns, "style", "NULL")},
      ${oldColumnExpr(oldColumns, "style_family", "NULL")},
      ${oldColumnExpr(oldColumns, "equipo", "NULL")},
      ${oldColumnExpr(oldColumns, "variante", "NULL")},
      ${oldColumnExpr(oldColumns, "version", "NULL")},
      ${oldColumnExpr(oldColumns, "talla", "NULL")},
      ${oldColumnExpr(oldColumns, "piezas", "1")},
      ${oldColumnExpr(oldColumns, "archivo", "NULL")},
      ${oldColumnExpr(oldColumns, "path", "NULL")},
      ${oldColumnExpr(oldColumns, "estado", "NULL")},
      ${oldColumnExpr(oldColumns, "error", "NULL")},
      ${oldColumnExpr(oldColumns, "tiempo", "'00:00:00'")},
      ${oldColumnExpr(oldColumns, "clave", "NULL")},
      COALESCE(${oldColumnExpr(oldColumns, "fecha_embarque", "NULL")}, (
        SELECT fecha_embarque
        FROM rmc_mockuptool_runs
        WHERE rmc_mockuptool_runs.id = ${oldColumnExpr(oldColumns, "run_id", "''")}
      )),
      ${oldColumnExpr(oldColumns, "impreso", "1")}
    FROM rmc_mockuptool_items_old;

    DROP TABLE rmc_mockuptool_items_old;
  `);
}

function rebuildRunsTable() {
  const oldColumns = getRunsTableColumns();
  const hasTable = oldColumns.length > 0;

  runSql(`
    DROP INDEX IF EXISTS idx_mockuptool_runs_created_at;
    DROP INDEX IF EXISTS idx_mockuptool_runs_mode;
    DROP INDEX IF EXISTS idx_mockuptool_runs_fecha_hora;
    DROP INDEX IF EXISTS idx_mockuptool_runs_seccion;
  `);

  if (!hasTable) {
    createRunsTable();
    return;
  }

  runSql("ALTER TABLE rmc_mockuptool_runs RENAME TO rmc_mockuptool_runs_old;");
  createRunsTable();

  runSql(`
      INSERT INTO rmc_mockuptool_runs (
        id,
        fecha,
        hora,
        fecha_embarque,
        seccion,
        herramienta,
        excel,
        excel_path,
        path,
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
        ${buildRunIdExpr(oldColumns)},
        ${oldColumnExpr(oldColumns, "fecha", "strftime('%d/%m/%Y', created_at)")},
        ${oldColumnExpr(oldColumns, "hora", "strftime('%H:%M:%S', created_at)")},
        ${oldColumnExpr(oldColumns, "fecha_embarque", "NULL")},
        ${oldColumnExpr(oldColumns, "seccion", oldColumnExpr(oldColumns, "section_label", "''"))},
        ${oldColumnExpr(oldColumns, "herramienta", "NULL")},
        ${oldColumnExpr(oldColumns, "excel", oldColumnExpr(oldColumns, "excel_name", "NULL"))},
        ${oldColumnExpr(oldColumns, "excel_path", "NULL")},
        ${oldColumnExpr(oldColumns, "path", "NULL")},
        ${oldColumnExpr(oldColumns, "disenador", oldColumnExpr(oldColumns, "designer", "NULL"))},
        ${oldColumnExpr(oldColumns, "filas_excel", oldColumnExpr(oldColumns, "total_rows", "0"))},
        ${oldColumnExpr(oldColumns, "filas_seleccionadas", oldColumnExpr(oldColumns, "selected_rows", "0"))},
        ${oldColumnExpr(oldColumns, "grupos_consolidados", oldColumnExpr(oldColumns, "consolidated_rows", "0"))},
        ${oldColumnExpr(oldColumns, "pdfs_generados", oldColumnExpr(oldColumns, "pdfs_generated", "0"))},
        ${oldColumnExpr(oldColumns, "mockups_faltantes", oldColumnExpr(oldColumns, "missing_mockups", "0"))},
        ${oldColumnExpr(oldColumns, "styles", oldColumns.indexOf("styles_json") !== -1 ? "trim(replace(replace(replace(styles_json, '[', ''), ']', ''), '\"', ''))" : "NULL")},
        ${oldColumnExpr(oldColumns, "tallas", oldColumns.indexOf("sizes_json") !== -1 ? "trim(replace(replace(replace(sizes_json, '[', ''), ']', ''), '\"', ''))" : "NULL")}
      FROM rmc_mockuptool_runs_old;

      DROP TABLE rmc_mockuptool_runs_old;
    `);
}

function oldColumnExpr(columns, columnName, fallback) {
  return columns.indexOf(columnName) !== -1 ? columnName : fallback;
}

function buildRunIdExpr(columns) {
  if (columns.indexOf("id") !== -1 && columns.indexOf("fecha") !== -1 && columns.indexOf("hora") !== -1) {
    return `
      CASE
        WHEN typeof(id) = 'text' AND id <> '' THEN id
        ELSE substr(fecha, 7, 4) || substr(fecha, 4, 2) || substr(fecha, 1, 2) || '-' || replace(hora, ':', '')
      END
    `;
  }

  if (columns.indexOf("created_at") !== -1) {
    return "strftime('%Y%m%d-%H%M%S', created_at)";
  }

  return "strftime('%Y%m%d-%H%M%S', 'now', 'localtime')";
}

function standardizeHistoricalData() {
  const runRows = runSql(`
    SELECT id, COALESCE(seccion, ''), COALESCE(herramienta, ''), COALESCE(excel, ''), COALESCE(fecha_embarque, '')
    FROM rmc_mockuptool_runs;
  `, { capture: true }).trim().split("\n").filter(Boolean);

  runRows.forEach(function (line) {
    const parts = line.split("|");
    const id = parts[0] || "";
    const section = standardizeSectionLabel(parts[1]);
    const tool = standardizeToolLabel(parts[2], section);
    const excelName = parts[3] || "";
    const fechaEmbarque = normalizeFechaEmbarque(parts[4] || inferFechaEmbarqueFromText(excelName));

    runSql(`
      UPDATE rmc_mockuptool_runs
      SET
        seccion = ${sqlValue(section)},
        herramienta = ${sqlValue(tool)},
        fecha_embarque = ${sqlValue(fechaEmbarque)}
      WHERE id = ${sqlValue(id)};

      UPDATE rmc_mockuptool_items
      SET
        herramienta = ${sqlValue(tool)},
        fecha_embarque = COALESCE(fecha_embarque, ${sqlValue(fechaEmbarque)})
      WHERE run_id = ${sqlValue(id)};
    `);
  });

  runSql(`
    UPDATE rmc_mockuptool_items
    SET herramienta = 'RMC MockupTool Personalizada'
    WHERE herramienta IN ('RMC MockupTool Por Lote', 'Por lote', 'Por Lote', 'Personalizadas');

    UPDATE rmc_mockuptool_items
    SET herramienta = 'RMC MockupTool Genericas'
    WHERE herramienta IN ('Genericas Muestras', 'RMC MockupTool Genericas Muestras', 'Genericas');
  `);

  const itemDates = runSql(`
    SELECT DISTINCT COALESCE(fecha_embarque, '')
    FROM rmc_mockuptool_items
    WHERE COALESCE(fecha_embarque, '') <> '';
  `, { capture: true }).trim().split("\n").filter(Boolean);

  itemDates.forEach(function (storedDate) {
    const normalizedDate = normalizeFechaEmbarque(storedDate);
    if (normalizedDate && normalizedDate !== storedDate) {
      runSql(`
        UPDATE rmc_mockuptool_items
        SET fecha_embarque = ${sqlValue(normalizedDate)}
        WHERE fecha_embarque = ${sqlValue(storedDate)};
      `);
    }
  });
}

function standardizeSectionLabel(value) {
  const text = cleanUpper(value);
  if (text === "GENERICAS MUESTRAS" || text === "GENERICAS/MUESTRAS" || text === "GENERICAS") return "Genericas";
  if (text === "POR LOTE" || text === "PORLOTE" || text === "PERSONALIZADAS") return "Personalizadas";
  return value || "Personalizadas";
}

function standardizeToolLabel(value, section) {
  const text = cleanUpper(value);
  if (text.indexOf("GENERICA") !== -1 || cleanUpper(section) === "GENERICAS") return "RMC MockupTool Genericas";
  if (text.indexOf("POR LOTE") !== -1 || text.indexOf("PERSONALIZADA") !== -1 || cleanUpper(section) === "PERSONALIZADAS") {
    return "RMC MockupTool Personalizada";
  }
  return value || "RMC MockupTool Personalizada";
}

function inferFechaEmbarqueFromText(value) {
  const text = String(value || "");
  const match = text.match(/\b(\d{1,2})[\s._/-]+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\b/);
  return match ? normalizeFechaEmbarque(`${match[1]} ${match[2]}`) : "";
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

function insertRun(run, createdAt, runId) {
  runSql(`
    INSERT INTO rmc_mockuptool_runs (
      id,
      fecha,
      hora,
      fecha_embarque,
      seccion,
      herramienta,
      excel,
      excel_path,
      path,
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
      ${sqlValue(run.fechaEmbarque || run.fecha_embarque)},
      ${sqlValue(run.sectionLabel)},
      ${sqlValue(run.herramienta || "")},
      ${sqlValue(run.excelName)},
      ${sqlValue(run.excelPath)},
      ${sqlValue(run.outputRoot || run.path)},
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

function clean(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function cleanUpper(value) {
  return clean(value).toUpperCase();
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
  markItemsPrinted,
  recordItems,
  recordRun
};
