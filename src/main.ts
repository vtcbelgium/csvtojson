// src/main.ts
import { parseCSV, formatAsJSON, formatAsHTMLTable, ParseOptions, OutputFormat } from './tool';
import { initTheme } from './theme';
import { initModals } from './modals';
import { showToast } from './toast';
import { auditCookies } from './cookies';
import { auditVault } from './vault';

interface UIElements {
  input: HTMLTextAreaElement;
  processBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  copyBtn: HTMLButtonElement;
  output: HTMLElement;
  formatSelect: HTMLSelectElement;
  delimiterSelect: HTMLSelectElement;
  headerCheckbox: HTMLInputElement;
  prettyCheckbox: HTMLInputElement;
}

let elements: UIElements;
let lastResult: ReturnType<typeof parseCSV> | null = null;

function getElements(): UIElements {
  return {
    input: document.getElementById('app-input') as HTMLTextAreaElement,
    processBtn: document.getElementById('action-process') as HTMLButtonElement,
    clearBtn: document.getElementById('action-clear') as HTMLButtonElement,
    copyBtn: document.getElementById('action-copy') as HTMLButtonElement,
    output: document.getElementById('output-region') as HTMLElement,
    formatSelect: document.getElementById('opt-format') as HTMLSelectElement,
    delimiterSelect: document.getElementById('opt-delimiter') as HTMLSelectElement,
    headerCheckbox: document.getElementById('opt-header') as HTMLInputElement,
    prettyCheckbox: document.getElementById('opt-pretty') as HTMLInputElement
  };
}

function setLoading(loading: boolean): void {
  elements.processBtn.disabled = loading;
  elements.processBtn.innerHTML = loading
    ? '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'
    : 'Convert to JSON';
}

function processInput(): void {
  const text = elements.input.value.trim();
  if (!text) {
    showToast('Please enter CSV data first', 'warning');
    return;
  }

  setLoading(true);

  try {
    const options: ParseOptions = {
      outputFormat: elements.formatSelect.value as OutputFormat,
      hasHeader: elements.headerCheckbox.checked
    };

    const delimiter = elements.delimiterSelect.value;
    if (delimiter !== 'auto') {
      options.delimiter = delimiter;
    }

    const result = parseCSV(text, options);
    lastResult = result;

    const json = formatAsJSON(result, elements.prettyCheckbox.checked);
    const table = formatAsHTMLTable(result);

    elements.output.innerHTML = `
      <div class="mb-3">
        <label class="form-label fw-bold">JSON Output</label>
        <pre class="bg-dark text-light p-3 rounded overflow-auto" style="max-height: 400px;"><code>${escapeHTML(json)}</code></pre>
      </div>
      <div>
        <label class="form-label fw-bold">Preview Table</label>
        ${table}
      </div>
      <div class="mt-2 text-muted small">
        Delimiter: <code>${escapeHTML(result.delimiter === '\t' ? '\\t' : result.delimiter)}</code> | 
        Rows: ${result.rowCount} | 
        Columns: ${result.headers.length} | 
        Format: ${result.outputFormat}
      </div>
    `;

    showToast(`Converted ${result.rowCount} rows to JSON`, 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    elements.output.innerHTML = `<div class="alert alert-danger">Error: ${escapeHTML(message)}</div>`;
    showToast('Conversion failed: ' + message, 'error');
  } finally {
    setLoading(false);
  }
}

function clearAll(): void {
  elements.input.value = '';
  elements.output.innerHTML = '<p class="text-muted text-center py-5">Output will appear here...</p>';
  lastResult = null;
  showToast('Cleared', 'info');
}

async function copyOutput(): Promise<void> {
  if (!lastResult) {
    showToast('Nothing to copy', 'warning');
    return;
  }

  try {
    const json = formatAsJSON(lastResult, elements.prettyCheckbox.checked);
    await navigator.clipboard.writeText(json);
    showToast('Copied to clipboard!', 'success');
  } catch {
    showToast('Failed to copy', 'error');
  }
}
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();
  auditCookies();
  auditVault();

  elements = getElements();

  elements.processBtn.addEventListener('click', processInput);
  elements.clearBtn.addEventListener('click', clearAll);
  elements.copyBtn.addEventListener('click', copyOutput);

  elements.input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processInput();
    }
  });
});

