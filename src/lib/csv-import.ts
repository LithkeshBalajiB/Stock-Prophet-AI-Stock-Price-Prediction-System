/**
 * Parse a user-uploaded CSV of historical prices into the same Bar shape
 * used by the analysis pipeline.
 *
 * Accepted formats:
 *  - Yahoo Finance export: Date,Open,High,Low,Close,Adj Close,Volume
 *  - Generic: any CSV with a date-like column and a close/price column
 *
 * Header detection is case-insensitive. Preferred close columns, in order:
 *   "adj close", "adjusted close", "close", "price", "last", "value"
 * Preferred date columns, in order:
 *   "date", "timestamp", "time", "datetime"
 */

import type { Bar } from "./stock-analysis";

export type CsvImportResult = {
  bars: Bar[];
  name: string;
  rowsParsed: number;
  rowsSkipped: number;
  closeColumn: string;
  dateColumn: string;
};

const DATE_KEYS = ["date", "timestamp", "time", "datetime"];
const CLOSE_KEYS = ["adj close", "adjusted close", "close", "price", "last", "value"];

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  // Numeric epoch (seconds or ms)
  if (/^\d{10}$/.test(raw)) {
    const d = new Date(Number(raw) * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (/^\d{13}$/.test(raw)) {
    const d = new Date(Number(raw));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  // ISO yyyy-mm-dd or yyyy/mm/dd
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const m = iso[2].padStart(2, "0");
    const d = iso[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // mm/dd/yyyy or dd/mm/yyyy — assume mm/dd/yyyy (US export default)
  const us = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (us) {
    const m = us[1].padStart(2, "0");
    const d = us[2].padStart(2, "0");
    return `${us[3]}-${m}-${d}`;
  }
  // Fallback: let Date parse it
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export function parseCsv(text: string, name = "uploaded.csv"): CsvImportResult {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!cleaned) {
    throw new Error("CSV file is empty.");
  }
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = (() => {
    for (const k of DATE_KEYS) {
      const i = header.indexOf(k);
      if (i !== -1) return i;
    }
    return -1;
  })();
  const closeIdx = (() => {
    for (const k of CLOSE_KEYS) {
      const i = header.indexOf(k);
      if (i !== -1) return i;
    }
    return -1;
  })();

  if (dateIdx === -1) {
    throw new Error(
      `No date column found. Expected one of: ${DATE_KEYS.join(", ")}.`,
    );
  }
  if (closeIdx === -1) {
    throw new Error(
      `No price column found. Expected one of: ${CLOSE_KEYS.join(", ")}.`,
    );
  }

  const bars: Bar[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const date = normalizeDate(cols[dateIdx] ?? "");
    const closeRaw = (cols[closeIdx] ?? "").replace(/[$,]/g, "");
    const close = Number(closeRaw);
    if (!date || !Number.isFinite(close) || close <= 0) {
      skipped++;
      continue;
    }
    if (seen.has(date)) {
      skipped++;
      continue;
    }
    seen.add(date);
    bars.push({ date, close });
  }

  bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (bars.length === 0) {
    throw new Error("No valid rows could be parsed from the CSV.");
  }

  return {
    bars,
    name,
    rowsParsed: bars.length,
    rowsSkipped: skipped,
    closeColumn: header[closeIdx],
    dateColumn: header[dateIdx],
  };
}
