import { SHEET_COLS, SHEET_ROWS, type CellAddress, type CellRange } from "./types";

const ADDRESS_PATTERN = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/;

export interface ParsedReference {
  row: number;
  col: number;
  absoluteCol: boolean;
  absoluteRow: boolean;
  label: string;
}

export function columnName(col: number): string {
  let value = col + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

export function columnIndex(name: string): number {
  let value = 0;

  for (const char of name.toUpperCase()) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) return -1;
    value = value * 26 + (code - 64);
  }

  return value - 1;
}

export function cellKey(row: number, col: number): string {
  return `${columnName(col)}${row + 1}`;
}

export function isAddressInSheet(address: CellAddress): boolean {
  return (
    address.row >= 0 &&
    address.row < SHEET_ROWS &&
    address.col >= 0 &&
    address.col < SHEET_COLS
  );
}

export function parseReference(label: string): ParsedReference | null {
  const match = ADDRESS_PATTERN.exec(label.trim());
  if (!match) return null;

  const col = columnIndex(match[2]);
  const row = Number(match[4]) - 1;
  if (col < 0 || row < 0) return null;

  return {
    row,
    col,
    absoluteCol: match[1] === "$",
    absoluteRow: match[3] === "$",
    label: `${match[1]}${match[2].toUpperCase()}${match[3]}${match[4]}`,
  };
}

export function parseCellAddress(label: string): CellAddress | null {
  const parsed = parseReference(label);
  if (!parsed) return null;

  const address = { row: parsed.row, col: parsed.col };
  return isAddressInSheet(address) ? address : null;
}

export interface KeyParts {
  row: number;
  col: number;
}

export function parseCellKey(key: string): KeyParts | null {
  const address = parseCellAddress(key);
  return address ? { row: address.row, col: address.col } : null;
}

export function normalizeRange(range: CellRange): CellRange {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

export function isSameCell(a: CellAddress, b: CellAddress): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isCellInRange(address: CellAddress, range: CellRange): boolean {
  const normalized = normalizeRange(range);
  return (
    address.row >= normalized.start.row &&
    address.row <= normalized.end.row &&
    address.col >= normalized.start.col &&
    address.col <= normalized.end.col
  );
}

export function rangeSize(range: CellRange): { rows: number; cols: number; count: number } {
  const normalized = normalizeRange(range);
  const rows = normalized.end.row - normalized.start.row + 1;
  const cols = normalized.end.col - normalized.start.col + 1;
  return { rows, cols, count: rows * cols };
}

export function forEachCell(
  range: CellRange,
  callback: (address: CellAddress, offsetRow: number, offsetCol: number) => void,
): void {
  const normalized = normalizeRange(range);

  for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
    for (let col = normalized.start.col; col <= normalized.end.col; col += 1) {
      callback({ row, col }, row - normalized.start.row, col - normalized.start.col);
    }
  }
}

export function rangeAddresses(range: CellRange): CellAddress[] {
  const addresses: CellAddress[] = [];
  forEachCell(range, (address) => addresses.push(address));
  return addresses;
}

export function formatAddress(address: CellAddress): string {
  return cellKey(address.row, address.col);
}

export function formatRange(range: CellRange): string {
  const normalized = normalizeRange(range);
  if (isSameCell(normalized.start, normalized.end)) {
    return formatAddress(normalized.start);
  }
  return `${formatAddress(normalized.start)}:${formatAddress(normalized.end)}`;
}

export function shiftAddress(
  address: CellAddress,
  deltaRow: number,
  deltaCol: number,
): CellAddress {
  return { row: address.row + deltaRow, col: address.col + deltaCol };
}

/** Parses "A1" or "A1:B4" into a bounded range. Returns null when out of sheet bounds. */
export function parseRangeLabel(label: string): CellRange | null {
  const [startLabel, endLabel = startLabel] = label.split(":");
  const start = parseCellAddress(startLabel);
  const end = parseCellAddress(endLabel);
  if (!start || !end) return null;
  return normalizeRange({ start, end });
}

export function columnLabelFor(col: number): string {
  return columnName(col);
}
