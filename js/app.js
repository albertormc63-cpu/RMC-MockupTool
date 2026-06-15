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
  let excelSummary = null;

  installConsoleLog();
  setLog("Selecciona un Excel para revisar datos.", "log-success");
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
        updateSummary();
        if (excelPathInput.value) analyzeExcel();
      });
    });

    styleOptions.addEventListener("change", () => {
      syncAllCheckbox("style", allStyles);
      allSizes.checked = true;
      refreshSizeOptions();
      updateFilters();
    });

    sizeOptions.addEventListener("change", () => syncAllCheckbox("size", allSizes));
    resetUiButton.addEventListener("click", resetUi);
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
      ? pickFileFromCep(getBrowseTitle(target.id), target.value)
      : pickFolderFromCep(getBrowseTitle(target.id), target.value);

    if (!selectedPath) return;

    target.value = selectedPath;
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

  function pickFileFromCep(title, initialPath) {
    return pickPathFromCep(false, title, initialPath);
  }

  function pickFolderFromCep(title, initialPath) {
    return pickPathFromCep(true, title, initialPath);
  }

  function pickPathFromCep(isFolder, title, initialPath) {
    if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialog) {
      throw new Error("El selector CEP no esta disponible. Abre el panel desde Illustrator.");
    }

    const result = window.cep.fs.showOpenDialog(false, isFolder, title, initialPath || "", null);

    if (!result || result.err) return "";

    if (Array.isArray(result.data)) {
      return normalizeCepPath(result.data[0] || "");
    }

    return normalizeCepPath(result.data || "");
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

    setLog("Leyendo Excel...", "log-success");
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
      ].join("\n"), "log-success");
    } catch (error) {
      setLog("ERROR AL LEER EXCEL:\n" + error.message, "log-error");
      updateSummary({ rows: "0" });
    }
  }

  function resetExcelState() {
    excelSummary = null;
    resetFilterUi();
    updateSummary();
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
    excelPathInput.value = "";
    excelSummary = null;
    resetFilterUi();
    allStyles.checked = true;
    allSizes.checked = true;
    syncCheckVisuals();
    setLog("Selecciona un Excel para revisar datos.", "log-success");
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
    setLog("Procesando...", "log-success");
    updateSummary();

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);

      const result = await runtime.generate.generateMockups(getJobOptions(selectedFilters));

      setLog([
        "Terminado.",
        "Seccion: " + getModeLabel(),
        "Filas Excel: " + result.totalRows,
        "Filas seleccionadas: " + result.selectedRows,
        "Grupos consolidados: " + result.rows,
        "PDFs generados: " + result.ok,
        "Mockups faltantes: " + result.missing,
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
      ].filter(Boolean).join("\n"), "log-success");
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
    setLog("Armando cola de impresion...", "log-success");

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);

      const result = runtime.generate.preparePrintQueue(getJobOptions(selectedFilters));
      setLog(formatPrintQueueLog(result, "Cola de impresion lista."), result.missing || result.duplicates ? "log-warning" : "log-success");
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

      if (!preview.printable) {
        throw new Error("No hay PDFs encontrados para imprimir.");
      }

      const warnings = [
        preview.missing ? "Faltantes: " + preview.missing : "",
        preview.duplicates ? "Duplicados detectados: " + preview.duplicates : ""
      ].filter(Boolean).join("\n");

      const message = [
        "Mandar " + preview.printable + " PDFs a la impresora predeterminada?",
        warnings,
        "Se mandaran de abajo hacia arriba para que la pila quede como el Excel.",
        "Opciones: horizontal y ajustar a pagina."
      ].filter(Boolean).join("\n\n");

      if (!window.confirm(message)) return;

      setLog("Mandando PDFs a la cola de impresion...", "log-success");
      const result = runtime.generate.submitPrintQueue(options);
      const statusClass = result.failed ? "log-error" : result.missing || result.duplicates ? "log-warning" : "log-success";
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

  function formatPrintQueueLog(result, title) {
    return [
      title,
      "Seccion: " + getModeLabel(),
      "Filas Excel: " + result.totalRows,
      "Filas seleccionadas: " + result.selectedRows,
      "Grupos en orden: " + result.rows,
      "Orden impresion: " + (result.printOrderLabel || ""),
      "PDFs en cola: " + result.printable,
      result.submitted != null ? "Mandados a cola: " + result.submitted : "",
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
    return getSelectedMode() === "samples" ? "Genericas" : "Por lote";
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
      writeLog(message, "log-success");
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
