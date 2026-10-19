import { cellKey, columnName, normalizeRange } from "./coordinates";
import { tokenize } from "./tokenizer";
import { SHEET_COLS, SHEET_ROWS, type CellRange, type CellUpdate } from "./types";
import type { Workbook } from "./workbook";

type Direction = 1 | -1;

/**
 * Rewrites relative references in a formula by the given offsets. Absolute
 * references (the `$A$1` form) are preserved. References that would leave the
 * sheet are left untouched so the formula stays parseable.
 */
export function translateFormula(raw: string, deltaRow: number, deltaCol: number): string {
  if (!raw.startsWith("=") || (deltaRow === 0 && deltaCol === 0)) return raw;

  const expression = raw.slice(1);
  let tokens;

  try {
    tokens = tokenize(expression);
  } catch {
    return raw;
  }

  let output = "";
  let cursor = 0;

  for (const token of tokens) {
    if (token.type === "eof") break;
    output += expression.slice(cursor, token.start);

    if (token.type === "cell" && token.reference) {
      const reference = token.reference;
      const row = reference.absoluteRow ? reference.row : reference.row + deltaRow;
      const col = reference.absoluteCol ? reference.col : reference.col + deltaCol;

      if (row < 0 || row >= SHEET_ROWS || col < 0 || col >= SHEET_COLS) {
        output += expression.slice(token.start, token.end);
      } else {
        output += `${reference.absoluteCol ? "$" : ""}${columnName(col)}${reference.absoluteRow ? "$" : ""}${row + 1}`;
      }
    } else {
      output += expression.slice(token.start, token.end);
    }

    cursor = token.end;
  }

  output += expression.slice(cursor);
  return `=${output}`;
}

function parseNumericLiteral(raw: string): number | null {
  if (raw.startsWith("=")) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1e10) / 1e10);
}

/**
 * Produces the raw values for a fill run. Numeric runs continue their step,
 * formulas are re-based relative to the source block, and everything else is
 * repeated.
 */
function expandForward(series: string[], count: number): string[] {
  if (series.length === 0 || count <= 0) return [];

  const parsed = series.map(parseNumericLiteral);
  const allNumeric = parsed.every((value) => value !== null);

  if (allNumeric) {
    const numbers = parsed as number[];
    const diffs: number[] = [];
    for (let index = 1; index < numbers.length; index += 1) {
      diffs.push(numbers[index] - numbers[index - 1]);
    }
    const arithmetic =
      numbers.length <= 1 || diffs.every((diff) => Math.abs(diff - diffs[0]) < 1e-9);

    if (arithmetic) {
      const step = diffs[0] ?? 0;
      const last = numbers[numbers.length - 1];
      return Array.from({ length: count }, (_, index) => formatNumeric(last + step * (index + 1)));
    }
  }

  return Array.from({ length: count }, (_, index) => {
    const position = series.length + index;
    const patternIndex = position % series.length;
    const delta = position - patternIndex;
    const raw = series[patternIndex];
    return raw.startsWith("=") ? translateFormula(raw, delta, 0) : raw;
  });
}

function expandLine(series: string[], count: number, direction: Direction): string[] {
  if (direction === -1) {
    return expandForward([...series].reverse(), count);
  }
  return expandForward(series, count);
}

export function buildFillUpdates(
  workbook: Workbook,
  source: CellRange,
  target: CellRange,
): CellUpdate[] {
  const src = normalizeRange(source);
  const dst = normalizeRange(target);
  const updates: CellUpdate[] = [];

  const fillDown = dst.start.row > src.end.row;
  const fillUp = dst.end.row < src.start.row;
  const fillRight = dst.start.col > src.end.col;
  const fillLeft = dst.end.col < src.start.col;

  if (fillDown || fillUp) {
    for (let col = src.start.col; col <= src.end.col; col += 1) {
      const series: string[] = [];
      for (let row = src.start.row; row <= src.end.row; row += 1) {
        series.push(workbook.getRaw(cellKey(row, col)));
      }
      const count = fillDown ? dst.end.row - src.end.row : src.start.row - dst.start.row;
      const produced = expandLine(series, count, fillDown ? 1 : -1);

      for (let index = 0; index < produced.length; index += 1) {
        const row = fillDown ? src.end.row + 1 + index : src.start.row - 1 - index;
        updates.push({ key: cellKey(row, col), raw: produced[index] });
      }
    }
    return updates;
  }

  if (fillRight || fillLeft) {
    for (let row = src.start.row; row <= src.end.row; row += 1) {
      const series: string[] = [];
      for (let col = src.start.col; col <= src.end.col; col += 1) {
        series.push(workbook.getRaw(cellKey(row, col)));
      }
      const count = fillRight ? dst.end.col - src.end.col : src.start.col - dst.start.col;
      const produced = expandLine(series, count, fillRight ? 1 : -1);

      for (let index = 0; index < produced.length; index += 1) {
        const col = fillRight ? src.end.col + 1 + index : src.start.col - 1 - index;
        updates.push({ key: cellKey(row, col), raw: produced[index] });
      }
    }
  }

  return updates;
}
