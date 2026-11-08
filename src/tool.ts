// src/tool.ts

export type OutputFormat = 'objects' | 'array';

export interface ParseOptions {
  delimiter?: string;
  outputFormat?: OutputFormat;
  hasHeader?: boolean;
}

export interface ParseResult {
  data: Array<Record<string, unknown>> | unknown[][];
  headers: string[];
  rowCount: number;
  delimiter: string;
  outputFormat: OutputFormat;
}

/**
 * Auto-detects the delimiter from the first few lines of CSV content.
 */
export function detectDelimiter(text: string): string {
  const lines = text.trim().split(/\r?\n/).slice(0, 5);
  const delimiters = [',', '\t', ';', '|'];
  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delim of delimiters) {
    let totalCount = 0;
    for (const line of lines) {
      const count = (line.match(new RegExp(escapeRegExp(delim), 'g')) || []).length;
      totalCount += count;
    }
    if (totalCount > maxCount) {
      maxCount = totalCount;
      bestDelimiter = delim;
    }
  }
  return bestDelimiter;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses a single CSV line respecting quoted fields.
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  result.push(current);
  return result;
}

/**
 * Infers the type of a value: number, boolean, null, or string.
 */
export function inferType(value: string): unknown {
  const trimmed = value.trim();

  if (trimmed === '') return '';
  if (trimmed === '0') return 0;
  if (trimmed.toLowerCase() === 'null') return null;

  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  const num = Number(trimmed);
  if (!isNaN(num) && (!trimmed.startsWith('0') || trimmed === '0') && !trimmed.includes('.')) {
    return num;
  }
  if (!isNaN(num) && trimmed !== '' && trimmed.includes('.') && trimmed.endsWith('0') === false) {
    return num;
  }
  if (!isNaN(num) && trimmed !== '' && /^\d+\.\d+$/.test(trimmed)) {
    return num;
  }

  return trimmed;
}

/**
 * Main CSV parsing function.
 */
export function parseCSV(text: string, options: ParseOptions = {}): ParseResult {
  const {
    delimiter = detectDelimiter(text),
    outputFormat = 'objects',
    hasHeader = true
  } = options;

  const lines = text.trim().split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return {
      data: [],
      headers: [],
      rowCount: 0,
      delimiter,
      outputFormat
    };
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim());

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: unknown[][] = [];

  for (const line of dataLines) {
    const fields = parseCSVLine(line, delimiter);
    const inferred = fields.map(inferType);
    rows.push(inferred);
  }

  let data: Array<Record<string, unknown>> | unknown[][];

  if (outputFormat === 'objects') {
    data = rows.map(row => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ?? null;
      });
      return obj;
    });
  } else {
    if (!hasHeader) {
      data = rows;
    } else {
      data = [headers, ...rows];
    }
  }

  return {
    data,
    headers,
    rowCount: rows.length,
    delimiter,
    outputFormat
  };
}

/**
 * Formats the parse result as a JSON string.
 */
export function formatAsJSON(result: ParseResult, pretty = true): string {
  return JSON.stringify(result.data, null, pretty ? 2 : 0);
}

/**
 * Formats the parse result as an HTML table for display.
 */
export function formatAsHTMLTable(result: ParseResult): string {
  if (result.rowCount === 0) {
    return '<p class="text-muted">No data to display</p>';
  }

  let html = '<div class="table-responsive"><table class="table table-sm table-bordered table-striped">';

  if (result.outputFormat === 'objects') {
    html += '<thead><tr>';
    for (const header of result.headers) {
      html += `<th>${escapeHTML(header)}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const row of result.data as Array<Record<string, unknown>>) {
      html += '<tr>';
      for (const header of result.headers) {
        const value = row[header];
        html += `<td>${escapeHTML(formatValue(value))}</td>`;
      }
      html += '</tr>';
    }
  } else {
    html += '<tbody>';
    for (const row of result.data as unknown[][]) {
      html += '<tr>';
      for (const cell of row) {
        html += `<td>${escapeHTML(formatValue(cell))}</td>`;
      }
      html += '</tr>';
    }
  }

  html += '</tbody></table></div>';
  return html;
}

function formatValue(value: unknown): string {
  if (value === null) return '<span class="text-muted fst-italic">null</span>';
  if (typeof value === 'boolean') return `<span class="text-primary">${value}</span>`;
  if (typeof value === 'number') return `<span class="text-success">${value}</span>`;
  return String(value);
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

