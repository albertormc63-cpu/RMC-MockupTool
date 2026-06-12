(function () {
  const form = document.getElementById("form");
  const excelPathInput = document.getElementById("excelPath");
  const filters = document.getElementById("filters");
  const styleOptions = document.getElementById("styleOptions");
  const sizeOptions = document.getElementById("sizeOptions");
  const allStyles = document.getElementById("allStyles");
  const allSizes = document.getElementById("allSizes");
  const log = document.getElementById("log");
  const button = document.getElementById("submit");
  const modeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
  const cepStatus = document.getElementById("cepStatus");
  const cepStatusText = document.getElementById("cepStatusText");

  const runtime = createRuntime();
  let excelSummary = null;

  setCepStatus();
  bindEvents();
  syncModeTabs();

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

    if (!runtime.ready) {
      log.textContent = "ERROR DE CEP:\n" + runtime.error;
    }
  }

  function bindEvents() {
    allStyles.addEventListener("change", () => toggleGroup("style", allStyles.checked));
    allSizes.addEventListener("change", () => toggleGroup("size", allSizes.checked));

    modeInputs.forEach((input) => {
      input.addEventListener("change", () => {
        syncModeTabs();
        resetExcelState();
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

    log.textContent = "Leyendo Excel...";

    try {
      const excel = runtime.generate.readExcel(excelPathInput.value, getSelectedMode());
      excelSummary = runtime.generate.summarizeExcel(excel);
      renderOptions(styleOptions, "style", excelSummary.styles || []);
      allStyles.checked = true;
      allSizes.checked = true;
      refreshSizeOptions();
      updateFilters();
      filters.hidden = false;

      log.textContent = [
        "Excel listo.",
        "Seccion: " + getModeLabel(),
        "Filas detectadas: " + excelSummary.rows,
        "Familias: " + (excelSummary.styles || []).join(", "),
        getSelectedMode() === "samples"
          ? "Equipos: " + (excelSummary.teams || []).join(", ")
          : "Tallas: " + (excelSummary.sizes || []).join(", ")
      ].join("\n");
    } catch (error) {
      log.textContent = "ERROR AL LEER EXCEL:\n" + error.message;
    }
  }

  function resetExcelState() {
    excelSummary = null;
    resetFilterUi();
  }

  function resetFilterUi() {
    filters.hidden = true;
    styleOptions.innerHTML = "";
    sizeOptions.innerHTML = "";
  }

  function renderOptions(container, group, values) {
    container.innerHTML = values.map((value) => [
      '<label class="check">',
      '<input type="checkbox" data-group="' + group + '" value="' + escapeAttr(value) + '" checked>',
      '<span>' + escapeHtmlText(value) + '</span>',
      '</label>'
    ].join("")).join("");
  }

  function toggleGroup(group, checked) {
    document.querySelectorAll('[data-group="' + group + '"]').forEach((input) => {
      input.checked = checked;
    });

    if (group === "style") {
      allSizes.checked = true;
      refreshSizeOptions();
    }

    updateFilters();
  }

  function syncAllCheckbox(group, allCheckbox) {
    const inputs = Array.from(document.querySelectorAll('[data-group="' + group + '"]'));
    allCheckbox.checked = inputs.length > 0 && inputs.every((input) => input.checked);
    updateFilters();
  }

  function updateFilters() {
    return {
      styles: allStyles.checked ? [] : collectChecked("style"),
      sizes: getSelectedMode() === "samples" || allSizes.checked ? [] : collectChecked("size")
    };
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

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function collectChecked(group) {
    return Array.from(document.querySelectorAll('[data-group="' + group + '"]:checked')).map((input) => input.value);
  }

  async function generateFiles(event) {
    event.preventDefault();

    if (!runtime.ready) return;

    button.disabled = true;
    log.textContent = "Procesando...";

    try {
      const selectedFilters = updateFilters();
      validateSelection(selectedFilters);

      const result = await runtime.generate.generateMockups({
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
        limit: 0
      });

      log.textContent = [
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
      ].filter(Boolean).join("\n");
    } catch (error) {
      log.textContent = "ERROR:\n" + error.message;
    } finally {
      button.disabled = !runtime.ready;
    }
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
  }

  function getSelectedMode() {
    const selected = modeInputs.find((input) => input.checked);
    return selected ? selected.value : "bulk";
  }

  function getModeLabel() {
    return getSelectedMode() === "samples" ? "Genericas" : "Por lote";
  }

  function escapeAttr(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function escapeHtmlText(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}());
