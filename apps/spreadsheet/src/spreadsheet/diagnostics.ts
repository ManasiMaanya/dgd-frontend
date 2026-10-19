import type {
  CellErrorCode,
  CellDiagnostic,
  EvaluatedValue,
  FormulaErrorValue,
} from "./types";
import { isFormulaError } from "./types";

export function createError(
  code: CellErrorCode,
  message: string,
  options: { position?: number; length?: number; suggestion?: string } = {},
): FormulaErrorValue {
  return {
    kind: "error",
    code,
    message,
    position: options.position,
    length: options.length,
    suggestion: options.suggestion,
  };
}

export function levenshtein(a: string, b: string): number {
  const left = a.toUpperCase();
  const right = b.toUpperCase();
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[] = new Array(rows * cols).fill(0);

  for (let i = 0; i < rows; i += 1) matrix[i * cols] = i;
  for (let j = 0; j < cols; j += 1) matrix[j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i * cols + j] = Math.min(
        matrix[(i - 1) * cols + j] + 1,
        matrix[i * cols + (j - 1)] + 1,
        matrix[(i - 1) * cols + (j - 1)] + cost,
      );
    }
  }

  return matrix[rows * cols - 1];
}

export function nearestName(name: string, candidates: string[], threshold = 3): string | null {
  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const score = levenshtein(name, candidate);
    if (score < bestScore && score <= threshold) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function formatValue(value: EvaluatedValue): string {
  if (value === null) return "";
  if (isFormulaError(value)) return value.code;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return value;
}

export function formatScalar(value: EvaluatedValue): string {
  if (value === null) return "";
  if (isFormulaError(value)) return value.code;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return value;
}

export function diagnosticFor(
  formula: string,
  error: FormulaErrorValue,
): CellDiagnostic {
  return {
    severity: "error",
    code: error.code,
    message: error.message,
    formula,
    position: error.position,
    length: error.length ?? 1,
    suggestion: error.suggestion,
  };
}

export function caretLine(formula: string, position: number | undefined): string {
  if (position === undefined || position < 0) return "";
  const safe = Math.min(position, formula.length);
  return `${" ".repeat(safe)}^`;
}

export function firstError(values: EvaluatedValue[]): FormulaErrorValue | null {
  for (const value of values) {
    if (isFormulaError(value)) return value;
  }
  return null;
}
