export const SHEET_ROWS = 500;
export const SHEET_COLS = 26;
export const CELL_COUNT = SHEET_ROWS * SHEET_COLS;

export interface CellAddress {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellAddress;
  end: CellAddress;
}

export type CellErrorCode =
  | "#PARSE!"
  | "#REF!"
  | "#VALUE!"
  | "#DIV/0!"
  | "#NAME?"
  | "#N/A"
  | "#NUM!"
  | "#CYCLE!"
  | "#ARGS!";

export interface FormulaErrorValue {
  kind: "error";
  code: CellErrorCode;
  message: string;
  position?: number;
  length?: number;
  suggestion?: string;
}

export type Scalar = number | string | boolean | null;
export type EvaluatedValue = Scalar | FormulaErrorValue;

export interface RangeValue {
  kind: "range";
  rows: number;
  cols: number;
  values: EvaluatedValue[];
}

export type EngineValue = Scalar | FormulaErrorValue | RangeValue;

export interface CellDiagnostic {
  severity: "error" | "warning";
  code: CellErrorCode;
  message: string;
  formula: string;
  position?: number;
  length?: number;
  suggestion?: string;
}

export interface CellUpdate {
  key: string;
  raw: string;
}

export interface RecalculationReport {
  revision: number;
  affected: number;
  recalculated: number;
  durationMs: number;
}

export function isFormulaError(value: unknown): value is FormulaErrorValue {
  return Boolean(value) && typeof value === "object" && (value as FormulaErrorValue).kind === "error";
}

export function isRangeValue(value: unknown): value is RangeValue {
  return Boolean(value) && typeof value === "object" && (value as RangeValue).kind === "range";
}
