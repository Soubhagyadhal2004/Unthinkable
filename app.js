const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const elements = {
  actionsList: document.getElementById("actionsList"),
  copySummaryButton: document.getElementById("copySummaryButton"),
  copyTextButton: document.getElementById("copyTextButton"),
  documentTitle: document.getElementById("documentTitle"),
  dropZone: document.getElementById("dropZone"),
  emptyState: document.getElementById("emptyState"),
  errorBox: document.getElementById("errorBox"),
  extractedText: document.getElementById("extractedText"),
  fileInput: document.getElementById("fileInput"),
  fileMeta: document.getElementById("fileMeta"),
  keyPointsList: document.getElementById("keyPointsList"),
  statusBox: document.getElementById("statusBox"),
  suggestionsList: document.getElementById("suggestionsList"),
  summarizeButton: document.getElementById("summarizeButton"),
  summaryContent: document.getElementById("summaryContent"),
  summaryText: document.getElementById("summaryText"),
  tabs: document.querySelectorAll(".tab"),
  themesList: document.getElementById("themesList"),
  textStats: document.getElementById("textStats"),
};

let currentFileName = "";
let extractedPlainText = "";

window.addEventListener("load", () => {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
});

elements.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    handleFile(file);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    handleFile(file);
  }
});

elements.summarizeButton.addEventListener("click", async () => {
  const editedText = elements.extractedText.value.trim();
  if (!editedText) {
    showError("Please upload a readable document or paste text before summarizing.");
    return;
  }

  extractedPlainText = editedText;
  await renderSummary();
});

elements.extractedText.addEventListener("input", () => {
  extractedPlainText = elements.extractedText.value.trim();
  updateTextStats(extractedPlainText);
  elements.summarizeButton.disabled = extractedPlainText.length < 30;
  elements.copyTextButton.disabled = extractedPlainText.length === 0;
});

elements.copyTextButton.addEventListener("click", () => copyToClipboard(elements.extractedText.value));
elements.copySummaryButton.addEventListener("click", () => copyToClipboard(getSummaryClipboardText()));

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("is-active"));
    elements.tabs.forEach((currentTab) => currentTab.classList.remove("is-active"));
    document.getElementById(tab.dataset.target).classList.add("is-active");
    tab.classList.add("is-active");
  });
});

document.querySelectorAll("input[name='summaryLength']").forEach((input) => {
  input.addEventListener("change", async () => {
    if (extractedPlainText) {
      await renderSummary();
    }
  });
});

async function handleFile(file) {
  clearMessages();
  resetOutput(false);

  if (!isSupportedFile(file)) {
    showError("Unsupported file type. Please upload a PDF or common image format.");
    return;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    showError("File is too large. Please upload a document under 20 MB.");
    return;
  }

  currentFileName = file.name;
  elements.fileMeta.hidden = false;
  elements.fileMeta.textContent = `${file.name} • ${formatBytes(file.size)}`;
  setLoading(true, "Reading your document...");

  try {
    const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? await extractPdfText(file)
      : await extractImageText(file);

    extractedPlainText = normalizeExtractedText(text);

    if (extractedPlainText.length < 30) {
      throw new Error("Not enough readable text was found. Try a clearer scan or another file.");
    }

    elements.extractedText.value = extractedPlainText;
    elements.summarizeButton.disabled = false;
    elements.copyTextButton.disabled = false;
    updateTextStats(extractedPlainText);
    await renderSummary();
  } catch (error) {
    resetOutput(true);
    showError(error.message || "Something went wrong while reading the document.");
  } finally {
    setLoading(false);
  }
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF parser is still loading. Please try again in a moment.");
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    setLoading(true, `Extracting PDF page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(formatPdfPageText(content.items));
  }

  return pages.join("\n\n");
}

function formatPdfPageText(items) {
  const lines = [];
  let currentLine = [];
  let previousY = null;

  items.forEach((item) => {
    const y = Math.round(item.transform[5]);
    if (previousY !== null && Math.abs(previousY - y) > 5) {
      lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
      currentLine = [];
    }
    currentLine.push(item.str);
    previousY = y;
  });

  if (currentLine.length) {
    lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
  }

  return lines.filter(Boolean).join("\n");
}

async function extractImageText(file) {
  if (!window.Tesseract) {
    throw new Error("OCR engine is still loading. Please try again in a moment.");
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const result = await Tesseract.recognize(imageUrl, "eng", {
      logger: (message) => {
        if (message.status && typeof message.progress === "number") {
          const progress = Math.round(message.progress * 100);
          setLoading(true, `OCR ${message.status}: ${progress}%`);
        }
      },
    });

    return result.data.text;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function renderSummary() {
  clearMessages();
  const length = document.querySelector("input[name='summaryLength']:checked").value;
  setLoading(true, "Generating AI summary...");

  try {
    const summary = await createAiSummary(extractedPlainText, length, currentFileName);
    renderSummaryResult(summary);
    showStatus("AI summary generated. You can edit the extracted text and regenerate it anytime.");
  } catch (error) {
    elements.emptyState.hidden = false;
    elements.summaryContent.hidden = true;
    showError(error.message || "AI summary request failed. Please try again.");
  } finally {
    setLoading(false);
  }
}

function renderSummaryResult(summary) {
  elements.emptyState.hidden = true;
  elements.summaryContent.hidden = false;
  elements.documentTitle.textContent = summary.title || currentFileName || "Edited document";
  elements.summaryText.textContent = summary.overview;
  renderList(elements.keyPointsList, summary.keyPoints);
  renderList(elements.themesList, summary.themes);
  renderList(elements.actionsList, summary.actions);
  renderList(elements.suggestionsList, summary.suggestions);
}

async function createAiSummary(text, length, fileName) {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      length,
      fileName,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "AI summary request failed.");
  }

  return normalizeSummaryPayload(data.summary);
}

function normalizeSummaryPayload(summary) {
  if (!summary || typeof summary !== "object") {
    throw new Error("AI response was not in the expected format.");
  }

  return {
    title: toSafeText(summary.title, currentFileName || "Document summary"),
    overview: toSafeText(summary.overview, "No overview was generated."),
    keyPoints: toSafeList(summary.keyPoints),
    themes: toSafeList(summary.themes),
    actions: toSafeList(summary.actions),
    suggestions: toSafeList(summary.suggestions),
  };
}

function toSafeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toSafeList(value) {
  if (!Array.isArray(value)) {
    return ["No items found."];
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  return items.length ? items : ["No items found."];
}

function getWords(text) {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
}

function normalizeExtractedText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function updateTextStats(text) {
  const words = getWords(text).length;
  const characters = text.length;
  elements.textStats.textContent = `${words.toLocaleString()} words • ${characters.toLocaleString()} characters extracted`;
}

function renderList(element, items) {
  element.innerHTML = "";
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    element.appendChild(listItem);
  });
}

function resetOutput(clearFile) {
  elements.emptyState.hidden = false;
  elements.summaryContent.hidden = true;
  elements.extractedText.value = "";
  elements.textStats.textContent = "No text extracted yet.";
  elements.copyTextButton.disabled = true;
  elements.summarizeButton.disabled = true;
  extractedPlainText = "";

  if (clearFile) {
    currentFileName = "";
    elements.fileInput.value = "";
    elements.fileMeta.hidden = true;
  }
}

function isSupportedFile(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "application/pdf" ||
    type.startsWith("image/") ||
    [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"].some((extension) =>
      name.endsWith(extension),
    )
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function setLoading(isLoading, message = "") {
  elements.summarizeButton.disabled = isLoading || extractedPlainText.length < 30;
  elements.fileInput.disabled = isLoading;

  if (isLoading) {
    elements.statusBox.hidden = false;
    elements.statusBox.textContent = message;
  }
}

function showStatus(message) {
  elements.statusBox.hidden = false;
  elements.statusBox.textContent = message;
}

function showError(message) {
  elements.errorBox.hidden = false;
  elements.errorBox.textContent = message;
}

function clearMessages() {
  elements.errorBox.hidden = true;
  elements.errorBox.textContent = "";
  elements.statusBox.hidden = true;
  elements.statusBox.textContent = "";
}

async function copyToClipboard(text) {
  if (!text.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Copied to clipboard.");
  } catch {
    showError("Clipboard access was blocked by the browser.");
  }
}

function getSummaryClipboardText() {
  const keyPoints = [...elements.keyPointsList.querySelectorAll("li")]
    .map((item) => `- ${item.textContent}`)
    .join("\n");
  const themes = [...elements.themesList.querySelectorAll("li")]
    .map((item) => `- ${item.textContent}`)
    .join("\n");
  const actions = [...elements.actionsList.querySelectorAll("li")]
    .map((item) => `- ${item.textContent}`)
    .join("\n");
  const suggestions = [...elements.suggestionsList.querySelectorAll("li")]
    .map((item) => `- ${item.textContent}`)
    .join("\n");

  return `Summary\n${elements.summaryText.textContent}\n\nKey points\n${keyPoints}\n\nMain themes\n${themes}\n\nAction items\n${actions}\n\nImprovement suggestions\n${suggestions}`;
}