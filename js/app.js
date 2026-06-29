(function () {
  const form = document.getElementById("form");
  const excelPathInput = document.getElementById("excelPath");
  const filters = document.getElementById("filters");
  const styleOptions = document.getElementById("styleOptions");
  const sizeOptions = document.getElementById("sizeOptions");
  const allStyles = document.getElementById("allStyles");
  const allSizes = document.getElementById("allSizes");
  const terminal = document.getElementById("terminal");
  const btnClearLog = document.getElementById("btnClearLog");
  const button = document.getElementById("submit");
  const validateIncrementalButton = document.getElementById("validateIncremental");
  const previewPrintButton = document.getElementById("previewPrint");
  const printQueueButton = document.getElementById("printQueue");
  const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
  const cepStatus = document.getElementById("cepStatus");
  const cepStatusText = document.getElementById("cepStatusText");
  const resetUiButton = document.getElementById("resetUi");
  const summaryMode = document.getElementById("summaryMode");
  const summaryRows = document.getElementById("summaryRows");
  const summaryStyles = document.getElementById("summaryStyles");
  const summarySizes = document.getElementById("summarySizes");
  const maxLogLines = 180;

  const runtime = createRuntime();
  const excelFileTypes = ["xlsx", "xls", "xlsm"];
  let excelSummary = null;
  let incrementalValidation = null;
  let incrementalValidationSignature = "";

  installConsoleLog();
  setLog("Selecciona un Excel para revisar datos.");
  setCepStatus();
  bindEvents();
  syncModeTabs();
  updateSummary();

  function createRuntime() {
    if (typeof require !== "function") {
      return { ready: false, error: "Node no esta disponible. Revisa --enable-nodejs en CSXS/manifest.xml." };
    }

    try {
      const path = require("path");
      const fs = require("fs");
      const extensionRoot = getExtensionRoot(path);
      const generate = require(path.join(extensionRoot, "src/generate.js"));

      return {
        ready: true,
        path,
        fs,
        extensionRoot,
        generate
      };
    } catch (error) {
      return { ready: false, error: error.message };
    }
  }

  function getExtensionRoot(path) {
    const decodedPath = decodeURIComponent(window.location.pathname).replace(/^\/([A-Za-z]:\/)/, "$1");
    return path.dirname(decodedPath);
  }

  function setCepStatus() {
    cepStatus.classList.toggle("online", runtime.ready);
    cepStatus.classList.toggle("offline", !runtime.ready);
    cepStatusText.textContent = runtime.ready ? "CEP listo" : "Sin Node";
    button.disabled = !runtime.ready;
    validateIncrementalButton.disabled = !runtime.ready;
    previewPrintButton.disabled = !runtime.ready;
    printQueueButton.disabled = !runtime.ready;

    if (!runtime.ready) {
      setLog("ERROR DE CEP:\n" + runtime.error, "log-error");
    }
  }

  function bindEvents() {
    allStyles.addEventListener("change", () => toggleGroup("style", allStyles.checked));
    allSizes.addEventListener("change", () => toggleGroup("size", allSizes.checked));

    modeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        syncModeTabs();
        resetExcelState();
      });
    });

    styleOptions.addEventListener("change", () => {
      syncAllCheckbox("style", allStyles);
      allSizes.checked = true;
      refreshSizeOptions();
      markValidationStale();
      updateFilters();
    });

    sizeOptions.addEventListener("change", () => {
      markValidationStale();
      syncAllCheckbox("size", allSizes);
    });
    resetUiButton.addEventListener("click", resetUi);
    validateIncrementalButton.addEventListener("click", validateIncrementalFromButton);
    previewPrintButton.addEventListener("click", previewPrintQueue);
    printQueueButton.addEventListener("click", printSelectedQueue);
    btnClearLog.addEventListener("click", () => {
      terminal.innerHTML = "";
    });

    document.querySelectorAll("[data-browse]").forEach((browseButton) => {
      browseButton.addEventListener("click", () => browsePath(browseButton));
    });

    form.addEventListener("submit", generateFiles);
  }

  function browsePath(browseButton) {
    if (!runtime.ready) return;

    const target = document.getElementById(browseButton.dataset.target);
    const kind = browseButton.dataset.browse;
    const selectedPath = kind === "file"
      ? pickFileFromCep(getBrowseTitle(target.id), target.value, getBrowseFileTypes(target.id))
      : pickFolderFromCep(getBrowseTitle(target.id), target.value);

    if (!selectedPath) return;

    if (target.id === "excelPath") {
      if (!isExcelFile(selectedPath)) {
        setLog("EXCEL NO CARGADO:\nSelecciona un archivo Excel (.xlsx, .xls o .xlsm).", "log-warning");
        return;
      }

      const modeValidation = runtime.generate.validateExcelMode(selectedPath, getSelectedMode());
      if (!modeValidation.valid) {
        setLog("EXCEL NO CARGADO:\n" + modeValidation.message, "log-warning");
        return;
      }
    }

    target.value = selectedPath;
    markValidationStale();
    updateSummary();

    if (target.id === "excelPath") {
      analyzeExcel();
    }
  }

  function getBrowseTitle(targetId) {
    const titles = {
      excelPath: "Selecciona Excel Nike On Demand",
      out: "Selecciona carpeta de salida",
      mockups: "Selecciona carpeta de mockups",
      signaturesDir: "Selecciona carpeta de firmas",
      font: "Selecciona fuente Aldrich"
    };

    return titles[targetId] || "Selecciona ruta";
  }

  function getBrowseFileTypes(targetId) {
    return targetId === "excelPath" ? excelFileTypes : null;
  }

  function pickFileFromCep(title, initialPath, fileTypes) {
    return pickPathFromCep(false, title, initialPath, fileTypes);
  }

  function pickFolderFromCep(title, initialPath) {
    return pickPathFromCep(true, title, initialPath, null);
  }

  function pickPathFromCep(isFolder, title, initialPath, fileTypes) {
    if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialog) {
      throw new Error("El selector CEP no esta disponible. Abre el panel desde Illustrator.");
    }

    const result = window.cep.fs.showOpenDialog(false, isFolder, title, initialPath || "", fileTypes || null);

    if (!result || result.err) return "";

    if (Array.isArray(result.data)) {
      return normalizeCepPath(result.data[0] || "");
    }

    return normalizeCepPath(result.data || "");
  }

  function isExcelFile(filePath) {
    if (!runtime.ready || !runtime.path) return /\.(xlsx|xls|xlsm)$/i.test(filePath || "");
    return excelFileTypes.indexOf(runtime.path.extname(filePath || "").slice(1).toLowerCase()) !== -1;
  }

  function normalizeCepPath(value) {
    const pathValue = String(value || "").trim();

    if (pathValue.indexOf("file://") !== 0) {
      return pathValue;
    }

    try {
      return decodeURIComponent(pathValue.replace(/^file:\/\//, ""));
    } catch (error) {
      return pathValue.replace(/^file:\/\//, "");
    }
  }

  function analyzeExcel() {
    resetFilterUi();

    if (!runtime.ready || !excelPathInput.value) return;

    const modeValidation = runtime.generate.validateExcelMode(excelPathInput.value, getSelectedMode());
    if (!modeValidation.valid) {
      setLog("EXCEL NO CARGADO:\n" + modeValidation.message, "log-warning");
      updateSummary({ rows: "0" });
      return;
    }

    setLog("Leyendo Excel...");
    updateSummary({ rows: "..." });

    try {
      const excel = runtime.generate.readExcel(excelPathInput.value, getSelectedMode());
      excelSummary = runtime.generate.summarizeExcel(excel);
      renderOptions(styleOptions, "style", excelSummary.styles || []);
      allStyles.checked = true;
      allSizes.checked = true;
      refreshSizeOptions();
      updateFilters();
      filters.hidden = false;
      updateSummary();

      setLog([
        "Excel listo.",
        "Seccion: " + getModeLabel(),
        "Filas detectadas: " + excelSummary.rows,
        "Familias: " + (excelSummary.styles || []).join(", "),
        getSelectedMode() === "samples"
          ? "Equipos: " + (excelSummary.teams || []).join(", ")
          : "Tallas: " + (excelSummary.sizes || []).join(", ")
      ].join("\n"));
    } catch (error) {
      setLog("ERROR AL LEER EXCEL:\n" + error.message, "log-error");
      updateSummary({ rows: "0" });
    }
  }

  function resetExcelState() {
    markValidationStale();
    excelPathInput.value = "";
    excelSummary = null;
    allStyles.checked = true;
    allSizes.checked = true;
    resetFilterUi();
    syncCheckVisuals();
    setLog("Seccion: " + getModeLabel() + ".\nSelecciona el Excel correspondiente.");
    updateSummary({ rows: "0" });
  }

  function resetFilterUi() {
    filters.hidden = true;
    styleOptions.innerHTML = "";
    sizeOptions.innerHTML = "";
    syncCheckVisuals();
  }

  function renderOptions(container, group, values) {
    container.innerHTML = values.map((value) => [
      '<label class="check">',
      '<input type="checkbox" data-group="' + group + '" value="' + escapeAttr(value) + '" checked>',
      '<span>' + escapeHtmlText(value) + '</span>',
      '</label>'
    ].join("")).join("");
    syncCheckVisuals();
  }

  function toggleGroup(group, checked) {
    markValidationStale();

    document.querySelectorAll('[data-group="' + group + '"]').forEach((input) => {
      input.checked = checked;
    });

    if (group === "style") {
      allSizes.checked = true;
      refreshSizeOptions();
    }

    syncCheckVisuals();
    updateFilters();
  }

  function syncAllCheckbox(group, allCheckbox) {
    const inputs = Array.from(document.querySelectorAll('[data-group="' + group + '"]'));
    allCheckbox.checked = inputs.length > 0 && inputs.every((input) => input.checked);
    syncCheckVisuals();
    updateFilters();
  }

  function updateFilters() {
    const selectedFilters = {
      styles: allStyles.checked ? [] : collectChecked("style"),
      sizes: getSelectedMode() === "samples" || allSizes.checked ? [] : collectChecked("size")
    };

    updateSummary({ filters: selectedFilters });
    return selectedFilters;
  }

  function refreshSizeOptions() {
    if (!excelSummary) {
      renderOptions(sizeOptions, "size", []);
      return;
    }

    const selectedFamilies = allStyles.checked ? (excelSummary.styles || []) : collectChecked("style");
    const sizesByStyle = excelSummary.sizesByStyle || {};
    const sizeBlock = sizeOptions.closest(".filter-block");

    if (getSelectedMode() === "samples") {
      renderOptions(sizeOptions, "size", []);
      sizeBlock.hidden = true;
      updateFilters();
      return;
    }

    sizeBlock.hidden = false;

    const availableSizes = selectedFamilies.length
      ? uniqueValues(selectedFamilies.flatMap((family) => sizesByStyle[family] || []))
      : [];

    renderOptions(sizeOptions, "size", availableSizes);
    toggleGroup("size", allSizes.checked);
  }

  function resetUi() {
    markValidationStale();
    excelPathInput.value = "";
    excelSummary = null;
    resetFilterUi();
    allStyles.checked = true;
    allSizes.checked = true;
    syncCheckVisuals();
    setLog("Selecciona un Excel para revisar datos.");
    updateSummary({ rows: "0" });
  }

  function syncCheckVisuals() {
    document.querySelectorAll(".check").forEach((label) => {
      const input = label.querySelector("input");
      label.classList.toggle("is-checked", !!input && input.checked);
    });
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function collectChecked(group) {
    return Array.from(document.querySelectorAll('[data-group="' + group + '"]:checked')).map((input) => input.value);
  }

  async function generateFiles(event) {
    event.preventDefault();

    if (!runtime.ready) return;

    setBusy(true);
    setLog("Procesando...");
    updateSummary();

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);
      const validation = validateIncremental(true);

      if (validation.conflictos) {
        throw new Error("Hay conflictos en la validacion. Revisa el log antes de generar.");
      }

      if (!validation.faltantes) {
        setLog(formatValidationLog(validation, "Validacion lista. No hay PDFs faltantes por generar."), "log-warning");
        return;
      }

      setBusy(true);
      const result = await runtime.generate.generateMockups(getJobOptions(selectedFilters));

      setLog([
        "Terminado.",
        "Seccion: " + getModeLabel(),
        result.fechaEmbarque ? "Fecha embarque: " + result.fechaEmbarque : "",
        "Filas Excel: " + result.totalRows,
        "Filas seleccionadas: " + result.selectedRows,
        "Grupos consolidados: " + result.rows,
        "Pedidos multitalle consolidados: " + (result.pedidosMultitalle || 0),
        "Faltantes validados: " + (result.rowsToGenerate || 0),
        "PDFs generados: " + result.ok,
        "Mockups faltantes: " + result.missing,
        result.itemsRecorded != null ? "Items registrados: " + result.itemsRecorded : "",
        "Styles procesados: " + (result.styles || []).join(", "),
        getSelectedMode() === "samples" ? "" : "Tallas procesadas: " + (result.sizes || []).join(", "),
        "Disenador: " + (result.designer || ""),
        "Salida: " + runtime.path.resolve(document.getElementById("out").value),
        result.historyDb ? "Registro BD: " + result.historyDb : "",
        result.historyLog ? "Log JSON: " + result.historyLog : "",
        result.historyWarning ? "Aviso historial: " + result.historyWarning : "",
        "",
        "Primeros archivos:",
        ...(result.outputs || []).slice(0, 20)
      ].filter(Boolean).join("\n"));
      updateSummary({
        rows: result.selectedRows || result.rows || 0,
        filters: selectedFilters
      });
    } catch (error) {
      setLog("ERROR:\n" + error.message, "log-error");
      updateSummary();
    } finally {
      setBusy(false);
    }
  }

  function previewPrintQueue() {
    if (!runtime.ready) return;

    setBusy(true);
    setLog("Armando cola de impresion...");

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);

      const result = runtime.generate.preparePrintQueue(getJobOptions(selectedFilters));
      setLog(formatPrintQueueLog(result, "Cola de impresion lista."), result.missing || result.duplicates ? "log-warning" : "");
      updateSummary({
        rows: result.printable || 0,
        filters: selectedFilters
      });
    } catch (error) {
      setLog("ERROR AL ARMAR COLA:\n" + error.message, "log-error");
      updateSummary();
    } finally {
      setBusy(false);
    }
  }

  function printSelectedQueue() {
    if (!runtime.ready) return;

    setBusy(true);

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);

      const options = getJobOptions(selectedFilters);
      const preview = runtime.generate.preparePrintQueue(options);
      const pendingItems = runtime.generate.getPendingPrintItems(preview.items);
      const withoutRecordCount = (preview.items || []).filter((item) => !item.registroExiste).length;

      if (!preview.printable) {
        throw new Error("No hay PDFs encontrados para imprimir.");
      }

      if (pendingItems.length === 0) {
        setLog([
          "No hay PDFs pendientes de impresion.",
          "Ya impresos omitidos: " + (preview.yaImpresos || 0),
          "SIN REGISTRO omitidos: " + withoutRecordCount,
          "No se envio ningun archivo a lp."
        ].join("\n"), "log-warning");
        updateSummary({
          rows: 0,
          filters: selectedFilters
        });
        return;
      }

      const warnings = [
        preview.missing ? "Faltantes: " + preview.missing : "",
        preview.duplicates ? "Duplicados detectados: " + preview.duplicates : "",
        preview.yaImpresos ? "Se omitiran por impreso=1: " + preview.yaImpresos : "",
        withoutRecordCount ? "SIN REGISTRO (omitidos): " + withoutRecordCount : ""
      ].filter(Boolean).join("\n");

      const message = [
        "Mandar " + pendingItems.length + " PDFs pendientes a la impresora predeterminada?",
        warnings,
        "Se mandaran de abajo hacia arriba para que la pila quede como el Excel.",
        "Opciones: horizontal y ajustar a pagina."
      ].filter(Boolean).join("\n\n");

      if (!window.confirm(message)) return;

      setLog("Mandando " + pendingItems.length + " PDFs pendientes a la cola de impresion...");
      const result = runtime.generate.submitPrintQueue(options);
      const statusClass = result.failed ? "log-error" : result.missing || result.duplicates || result.printHistoryWarning || result.omitidosImpresos || result.omitidosSinRegistro ? "log-warning" : "";
      setLog(formatPrintQueueLog(result, "Cola enviada a impresion."), statusClass);
      updateSummary({
        rows: result.submitted || 0,
        filters: selectedFilters
      });
    } catch (error) {
      setLog("ERROR AL IMPRIMIR:\n" + error.message, "log-error");
      updateSummary();
    } finally {
      setBusy(false);
    }
  }

  function getJobOptions(selectedFilters) {
    return {
      excel: excelPathInput.value,
      excelName: runtime.path.basename(excelPathInput.value),
      mode: getSelectedMode(),
      mockups: document.getElementById("mockups").value,
      out: document.getElementById("out").value,
      font: document.getElementById("font").value,
      designer: document.getElementById("designer").value,
      signaturesDir: document.getElementById("signaturesDir").value,
      styles: selectedFilters.styles,
      sizes: selectedFilters.sizes,
      printOrder: "stack",
      limit: 0
    };
  }

  function validateIncremental(silent) {
    if (!runtime.ready) return null;

    const selectedFilters = updateFilters();
    validateSelection(selectedFilters);

    const signature = getValidationSignature(selectedFilters);

    if (incrementalValidation && incrementalValidationSignature === signature) {
      if (!silent) setLog(formatValidationLog(incrementalValidation, "Validacion vigente."), getValidationLogClass(incrementalValidation));
      return incrementalValidation;
    }

    setBusy(true);
    if (!silent) setLog("Validando incremental...");

    try {
      incrementalValidation = runtime.generate.validateMockups(getJobOptions(selectedFilters));
      incrementalValidationSignature = signature;
      if (!silent) setLog(formatValidationLog(incrementalValidation, "Validacion incremental lista."), getValidationLogClass(incrementalValidation));
      updateSummary({
        rows: incrementalValidation.faltantes,
        filters: selectedFilters
      });
      return incrementalValidation;
    } finally {
      setBusy(false);
    }
  }

  function validateIncrementalFromButton() {
    try {
      validateIncremental(false);
    } catch (error) {
      setLog("ERROR AL VALIDAR:\n" + error.message, "log-error");
      updateSummary();
    }
  }

  function markValidationStale() {
    incrementalValidation = null;
    incrementalValidationSignature = "";
  }

  function getValidationSignature(selectedFilters) {
    return JSON.stringify({
      excel: excelPathInput.value,
      out: document.getElementById("out").value,
      mode: getSelectedMode(),
      styles: selectedFilters.styles || [],
      sizes: selectedFilters.sizes || []
    });
  }

  function formatValidationLog(result, title) {
    return [
      title,
      "Seccion: " + getModeLabel(),
      result.fechaEmbarque ? "Fecha embarque: " + result.fechaEmbarque : "",
      "Filas Excel: " + result.totalRows,
      "Filas seleccionadas: " + result.selectedRows,
      "Grupos consolidados: " + result.rows,
      "Pedidos multitalle consolidados: " + (result.pedidosMultitalle || 0),
      "FALTANTE: " + result.faltantes,
      "YA_CREADO: " + result.yaCreados,
      "ARCHIVO_SIN_REGISTRO: " + result.archivosSinRegistro,
      "REGISTRADO_SIN_ARCHIVO: " + result.registradosSinArchivo,
      "CONFLICTO: " + result.conflictos,
      "IMPRESOS: " + result.impresos,
      "PENDIENTES DE IMPRESION: " + result.pendientesImpresion,
      "Styles: " + (result.styles || []).join(", "),
      getSelectedMode() === "samples" ? "" : "Tallas: " + (result.sizes || []).join(", "),
      "Salida: " + result.out,
      "",
      "Primeros estados:",
      ...(result.items || []).slice(0, 20).map(formatValidationItem),
      result.conflictos ? "" : "",
      result.conflictos ? "Primeros conflictos:" : "",
      ...(result.items || []).filter((item) => item.estado === "CONFLICTO").slice(0, 10).map(formatValidationItem)
    ].filter(Boolean).join("\n");
  }

  function formatValidationItem(item) {
    return [
      item.estado,
      item.registroExiste ? (item.impreso ? "IMPRESO" : "NO IMPRESO") : "SIN REGISTRO",
      item.clave || "SIN CLAVE",
      item.style || "SIN STYLE",
      item.size || "SIN TALLA",
      item.error || "",
      item.expectedPath
    ].filter(Boolean).join(" | ");
  }

  function getValidationLogClass(result) {
    if (result.conflictos) return "log-error";
    if (result.archivosSinRegistro || result.registradosSinArchivo || result.pendientesImpresion) return "log-warning";
    return "";
  }

  function formatPrintQueueLog(result, title) {
    return [
      title,
      "Seccion: " + getModeLabel(),
      result.fechaEmbarque ? "Fecha embarque: " + result.fechaEmbarque : "",
      "Filas Excel: " + result.totalRows,
      "Filas seleccionadas: " + result.selectedRows,
      "Grupos en orden: " + result.rows,
      "Pedidos multitalle consolidados: " + (result.pedidosMultitalle || 0),
      "Orden impresion: " + (result.printOrderLabel || ""),
      "PDFs en cola: " + result.printable,
      "Ya marcados impresos: " + (result.yaImpresos || 0),
      "Pendientes de impresion: " + (result.pendientesImpresion || 0),
      result.submitted != null ? "Mandados a cola: " + result.submitted : "",
      result.omitidosImpresos != null ? "Omitidos por impreso=1: " + result.omitidosImpresos : "",
      result.omitidosSinRegistro != null ? "SIN REGISTRO omitidos: " + result.omitidosSinRegistro : "",
      result.itemsMarcadosImpresos != null ? "Items marcados impresos: " + result.itemsMarcadosImpresos : "",
      result.printHistoryWarning ? "Aviso historial impresion: " + result.printHistoryWarning : "",
      result.failed ? "Errores de impresion: " + result.failed : "",
      result.printOptions ? "Opciones lp: " + result.printOptions.join(", ") : "",
      "Faltantes: " + result.missing,
      "Duplicados detectados: " + result.duplicates,
      "Styles: " + (result.styles || []).join(", "),
      getSelectedMode() === "samples" ? "" : "Tallas: " + (result.sizes || []).join(", "),
      "Salida: " + result.out,
      "",
      "Primeros en cola:",
      ...(result.items || []).slice(0, 20).map(formatPrintItem),
      result.missingRows && result.missingRows.length ? "" : "",
      result.missingRows && result.missingRows.length ? "Primeros faltantes:" : "",
      ...(result.missingRows || []).slice(0, 10).map(formatMissingPrintItem),
      result.duplicateRows && result.duplicateRows.length ? "" : "",
      result.duplicateRows && result.duplicateRows.length ? "Duplicados detectados:" : "",
      ...(result.duplicateRows || []).slice(0, 10).map(formatDuplicatePrintItem),
      result.failedRows && result.failedRows.length ? "" : "",
      result.failedRows && result.failedRows.length ? "Errores:" : "",
      ...(result.failedRows || []).slice(0, 10).map((row) => row.path + " | " + row.error)
    ].filter(Boolean).join("\n");
  }

  function formatPrintItem(item) {
    return [
      String(item.order).padStart(3, "0"),
      "Excel " + String(item.excelOrder).padStart(3, "0"),
      item.key || "SIN CLAVE",
      item.style || "SIN STYLE",
      item.size || "SIN TALLA",
      item.registroExiste ? (item.impreso ? "IMPRESO" : "NO IMPRESO") : "SIN REGISTRO",
      item.match,
      item.path
    ].join(" | ");
  }

  function formatMissingPrintItem(row) {
    return [
      "Fila " + row.sourceRow,
      row.key || "SIN CLAVE",
      row.style || "SIN STYLE",
      row.size || "SIN TALLA",
      row.expectedPath
    ].join(" | ");
  }

  function formatDuplicatePrintItem(row) {
    return [
      "Fila " + row.sourceRow,
      row.key || "SIN CLAVE",
      "usa: " + row.chosenPath,
      "candidatos: " + row.candidates.length
    ].join(" | ");
  }

  function setBusy(isBusy) {
    button.disabled = isBusy || !runtime.ready;
    validateIncrementalButton.disabled = isBusy || !runtime.ready;
    previewPrintButton.disabled = isBusy || !runtime.ready;
    printQueueButton.disabled = isBusy || !runtime.ready;
  }

  function validateSelection(selectedFilters) {
    if (!excelPathInput.value) {
      throw new Error("Selecciona un Excel.");
    }

    if (!allStyles.checked && (!selectedFilters.styles || selectedFilters.styles.length === 0)) {
      throw new Error("Selecciona al menos un Style o marca Todos.");
    }

    if (getSelectedMode() !== "samples" && !allSizes.checked && (!selectedFilters.sizes || selectedFilters.sizes.length === 0)) {
      throw new Error("Selecciona al menos una talla o marca Todas.");
    }
  }

  function syncModeTabs() {
    modeInputs.forEach((input) => {
      const label = input.closest("label");
      if (label) label.classList.toggle("is-active", input.checked);
    });
    updateSummary();
  }

  function getSelectedMode() {
    const selected = modeInputs.find((input) => input.checked);
    return selected ? selected.value : "bulk";
  }

  function getModeLabel() {
    return getSelectedMode() === "samples" ? "Genericas" : "Personalizadas";
  }

  function updateSummary(overrides) {
    const values = overrides || {};
    const filtersValue = values.filters || {
      styles: allStyles.checked ? [] : collectChecked("style"),
      sizes: getSelectedMode() === "samples" || allSizes.checked ? [] : collectChecked("size")
    };
    const rowValue = values.rows != null
      ? values.rows
      : excelSummary
        ? excelSummary.rows
        : 0;

    summaryMode.textContent = getModeLabel();
    summaryRows.textContent = String(rowValue);
    summaryStyles.textContent = allStyles.checked ? "Todos" : getCountLabel(filtersValue.styles, "style");
    summarySizes.textContent = getSelectedMode() === "samples" ? "No aplica" : allSizes.checked ? "Todas" : getCountLabel(filtersValue.sizes, "talla");
  }

  function getCountLabel(values, singular) {
    const count = values ? values.length : 0;
    if (count === 0) return "Pendiente";
    if (count === 1) return values[0];
    return count + " " + singular + "s";
  }

  function installConsoleLog() {
    if (!terminal) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function () {
      const message = Array.prototype.join.call(arguments, " ");
      writeLog(message);
      originalLog.apply(console, arguments);
    };

    console.error = function () {
      const message = Array.prototype.join.call(arguments, " ");
      writeLog(message, "log-error");
      originalError.apply(console, arguments);
    };

    console.warn = function () {
      const message = Array.prototype.join.call(arguments, " ");
      writeLog(message, "log-warning");
      originalWarn.apply(console, arguments);
    };
  }

  function setLog(message, className) {
    if (!terminal) return;
    terminal.innerHTML = "";
    writeLog(message, className);
  }

  function writeLog(message, className) {
    if (!terminal) return;

    const line = document.createElement("div");
    line.textContent = message;

    if (className) {
      line.className = className;
    }

    terminal.appendChild(line);

    while (terminal.childNodes.length > maxLogLines) {
      terminal.removeChild(terminal.firstChild);
    }

    terminal.scrollTop = terminal.scrollHeight;
  }

  function escapeAttr(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function escapeHtmlText(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}());
