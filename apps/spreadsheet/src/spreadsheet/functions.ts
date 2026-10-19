import { createError, firstError, formatScalar, nearestName } from "./diagnostics";
import {
  isFormulaError,
  isRangeValue,
  type EngineValue,
  type EvaluatedValue,
  type FormulaErrorValue,
  type RangeValue,
} from "./types";

export type FunctionCategory =
  | "Math & stats"
  | "Logical"
  | "Text"
  | "Lookup"
  | "Information";

export interface FunctionMeta {
  name: string;
  category: FunctionCategory;
  signature: string;
  description: string;
  minArgs: number;
  maxArgs: number;
  example?: string;
}

export interface FunctionDefinition extends FunctionMeta {
  call: (args: EngineValue[]) => EngineValue;
}

export function flattenValues(args: EngineValue[]): EvaluatedValue[] {
  const result: EvaluatedValue[] = [];

  for (const arg of args) {
    if (isRangeValue(arg)) {
      result.push(...arg.values);
    } else {
      result.push(arg);
    }
  }

  return result;
}

export function toNumber(value: EngineValue | undefined): number | FormulaErrorValue {
  if (value === undefined) {
    return createError("#ARGS!", "A number is required here.");
  }
  if (isFormulaError(value)) return value;
  if (isRangeValue(value)) {
    return createError("#VALUE!", "A range cannot be used as a single number.", {
      suggestion: "Use SUM, AVERAGE, or INDEX to reduce the range to one value.",
    });
  }
  if (value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed)
    ? parsed
    : createError("#VALUE!", `Cannot use the text "${value}" as a number.`, {
        suggestion: "Convert the value with VALUE() or remove the text.",
      });
}

export function toText(value: EngineValue | undefined): string | FormulaErrorValue {
  if (value === undefined) return "";
  if (isFormulaError(value)) return value;
  if (isRangeValue(value)) {
    return createError("#VALUE!", "A range cannot be used as text.", {
      suggestion: "Use TEXTJOIN or CONCAT to combine a range into text.",
    });
  }
  if (value === null) return "";
  if (typeof value === "string") return value;
  return formatScalar(value);
}

function toInteger(value: EngineValue | undefined): number | FormulaErrorValue {
  const numeric = toNumber(value);
  if (typeof numeric !== "number") return numeric;
  return Math.trunc(numeric);
}

export function toBoolean(value: EngineValue | undefined): boolean | FormulaErrorValue {
  if (value === undefined) return false;
  if (isFormulaError(value)) return value;
  if (isRangeValue(value)) {
    return createError("#VALUE!", "A range cannot be used as a condition.", {
      suggestion: "Reduce the range with a function such as COUNT or SUM first.",
    });
  }
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = value.trim().toUpperCase();
  if (text === "TRUE") return true;
  if (text === "FALSE" || text === "") return false;
  const parsed = Number(text);
  if (Number.isFinite(parsed)) return parsed !== 0;
  return createError("#VALUE!", `Cannot use "${value}" as a condition.`);
}

function numericIn(values: EvaluatedValue[]): { numbers: number[]; error: FormulaErrorValue | null } {
  const numbers: number[] = [];
  for (const value of values) {
    if (isFormulaError(value)) return { numbers, error: value };
    if (typeof value === "number") numbers.push(value);
    else if (typeof value === "boolean") numbers.push(value ? 1 : 0);
  }
  return { numbers, error: null };
}

function requireNumber(value: EngineValue | undefined, position: number): number | FormulaErrorValue {
  if (value === undefined) {
    return createError("#ARGS!", `Missing argument ${position}.`, {
      suggestion: "Provide the required numeric argument.",
    });
  }
  return toNumber(value);
}

function requireRange(value: EngineValue | undefined, position: number): RangeValue | FormulaErrorValue {
  if (value === undefined) {
    return createError("#ARGS!", `Missing argument ${position}.`, {
      suggestion: "Provide a range such as A1:B10.",
    });
  }
  if (!isRangeValue(value)) {
    return createError("#VALUE!", "This function expects a range argument.", {
      suggestion: "Select a rectangular range such as A1:B10.",
    });
  }
  return value;
}

function scalarResult(value: EngineValue): EvaluatedValue {
  if (isRangeValue(value)) {
    return createError("#VALUE!", "A range cannot be used as a single value.", {
      suggestion: "Use a function such as SUM or INDEX to collapse the range.",
    });
  }
  return value;
}

export function plainText(value: EngineValue): string {
  if (value === undefined || value === null) return "";
  if (isFormulaError(value)) return "";
  if (isRangeValue(value)) return "";
  if (typeof value === "string") return value;
  return formatScalar(value);
}

export function compareValues(left: EngineValue, right: EngineValue): number {
  const leftTextRaw = plainText(left);
  const rightTextRaw = plainText(right);
  const leftNumber = typeof left === "number" ? left : Number(leftTextRaw);
  const rightNumber = typeof right === "number" ? right : Number(rightTextRaw);

  if (
    leftTextRaw !== "" &&
    rightTextRaw !== "" &&
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber)
  ) {
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }

  const leftText = leftTextRaw.toLowerCase();
  const rightText = rightTextRaw.toLowerCase();
  return leftText === rightText ? 0 : leftText < rightText ? -1 : 1;
}

function buildCriteriaMatcher(criteria: EngineValue): (value: EvaluatedValue) => boolean {
  if (criteria === undefined) return () => false;
  if (isFormulaError(criteria)) return () => false;

  if (typeof criteria === "number") {
    return (value) => typeof value === "number" && value === criteria;
  }

  if (typeof criteria === "boolean") {
    return (value) => typeof value === "boolean" && value === criteria;
  }

  if (isRangeValue(criteria)) return () => false;

  const text = criteria ?? "";
  const operatorMatch = /^(<=|>=|<>|=|<|>)\s*(.*)$/.exec(text);

  if (operatorMatch) {
    const operator = operatorMatch[1];
    const operand = operatorMatch[2];
    const asNumber = Number(operand);
    const numericOperand = operand.trim() !== "" && Number.isFinite(asNumber);

    return (value) => {
      if (isFormulaError(value)) return operator === "<>" || operator === "=";
      const comparison =
        numericOperand && typeof value === "number"
          ? value === asNumber
            ? 0
            : value < asNumber
              ? -1
              : 1
          : compareValues(value ?? null, operand);
      switch (operator) {
        case "=":
          return comparison === 0;
        case "<>":
          return comparison !== 0;
        case "<":
          return comparison < 0;
        case ">":
          return comparison > 0;
        case "<=":
          return comparison <= 0;
        case ">=":
          return comparison >= 0;
        default:
          return false;
      }
    };
  }

  if (text.includes("*") || text.includes("?")) {
    const pattern = text
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${pattern}$`, "i");
    return (value) => regex.test(plainText(value));
  }

  return (value) => plainText(value).toLowerCase() === text.toLowerCase();
}

function indexRange(range: RangeValue, row: number, col: number): EvaluatedValue {
  return range.values[row * range.cols + col] ?? null;
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

function sum(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  return numbers.reduce((total, value) => total + value, 0);
}

function average(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  if (numbers.length === 0) return createError("#DIV/0!", "AVERAGE found no numeric values.");
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function minMax(args: EngineValue[], mode: "min" | "max"): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  if (numbers.length === 0) return 0;
  return mode === "min" ? Math.min(...numbers) : Math.max(...numbers);
}

function count(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  return flattened.filter((value) => typeof value === "number").length;
}

function countA(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  return flattened.filter((value) => value !== null && value !== "").length;
}

function countBlank(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  return flattened.filter((value) => value === null || value === "").length;
}

function product(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  if (numbers.length === 0) return 0;
  return numbers.reduce((total, value) => total * value, 1);
}

function median(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  if (numbers.length === 0) return createError("#NUM!", "MEDIAN needs at least one numeric value.");
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function stdev(args: EngineValue[]): EvaluatedValue {
  const flattened = flattenValues(args);
  const error = firstError(flattened);
  if (error) return error;
  const { numbers } = numericIn(flattened);
  if (numbers.length < 2) return createError("#DIV/0!", "STDEV needs at least two numeric values.");
  const mean = numbers.reduce((total, value) => total + value, 0) / numbers.length;
  const variance =
    numbers.reduce((total, value) => total + (value - mean) ** 2, 0) / (numbers.length - 1);
  return Math.sqrt(variance);
}

function conditionalAggregate(
  args: EngineValue[],
  mode: "sum" | "count" | "average",
): EvaluatedValue {
  const range = requireRange(args[0], 1);
  if (isFormulaError(range)) return range;
  const criteria = args[1];
  if (criteria === undefined) {
    return createError("#ARGS!", `A criteria argument is required.`);
  }
  const valueRange = args[2] === undefined ? range : requireRange(args[2], 3);
  if (isFormulaError(valueRange)) return valueRange;

  const matcher = buildCriteriaMatcher(criteria);
  let total = 0;
  let hits = 0;

  for (let index = 0; index < range.values.length; index += 1) {
    if (!matcher(range.values[index])) continue;
    hits += 1;
    if (mode === "count") continue;
    const target = valueRange.values[index];
    if (target === undefined) continue;
    if (isFormulaError(target)) return target;
    if (typeof target === "number") total += target;
  }

  if (mode === "count") return hits;
  if (mode === "average") {
    if (hits === 0) return createError("#DIV/0!", "The criteria matched no rows.");
    return total / hits;
  }
  return total;
}

function sumProduct(args: EngineValue[]): EvaluatedValue {
  if (args.length === 0) return createError("#ARGS!", "SUMPRODUCT needs at least one range.");
  const ranges: RangeValue[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const range = requireRange(args[index], index + 1);
    if (isFormulaError(range)) return range;
    ranges.push(range);
  }

  const length = ranges[0].values.length;
  if (ranges.some((range) => range.values.length !== length)) {
    return createError("#VALUE!", "SUMPRODUCT ranges must have the same size.");
  }

  let total = 0;
  for (let index = 0; index < length; index += 1) {
    let productValue = 1;
    for (const range of ranges) {
      const value = range.values[index];
      productValue *= typeof value === "number" ? value : 0;
    }
    total += productValue;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Rounding & math
// ---------------------------------------------------------------------------

function roundTo(args: EngineValue[], mode: "round" | "up" | "down"): EvaluatedValue {
  const number = requireNumber(args[0], 1);
  if (isFormulaError(number)) return number;
  const digits = args[1] === undefined ? 0 : toInteger(args[1]);
  if (isFormulaError(digits)) return digits;

  const factor = 10 ** digits;
  const scaled = number * factor;
  const rounded =
    mode === "round"
      ? Math.round(scaled)
      : mode === "up"
        ? Math.ceil(Math.abs(scaled)) * Math.sign(scaled || 1)
        : Math.floor(Math.abs(scaled)) * Math.sign(scaled || 1);
  return rounded / factor;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

function vlookup(args: EngineValue[]): EvaluatedValue {
  const lookup = args[0];
  if (lookup === undefined) return createError("#ARGS!", "VLOOKUP needs a lookup value.");
  const range = requireRange(args[1], 2);
  if (isFormulaError(range)) return range;
  const colIndex = toInteger(args[2]);
  if (isFormulaError(colIndex)) return createError("#ARGS!", "VLOOKUP needs a column index.");
  if (colIndex < 1 || colIndex > range.cols) {
    return createError("#REF!", `Column index ${colIndex} is outside the range.`, {
      suggestion: `Use a column index between 1 and ${range.cols}.`,
    });
  }

  const approximate = args[3] === undefined ? false : toBoolean(args[3]);
  if (isFormulaError(approximate)) return approximate;

  let matchRow = -1;
  if (approximate) {
    for (let row = 0; row < range.rows; row += 1) {
      if (compareValues(indexRange(range, row, 0), lookup) <= 0) matchRow = row;
      else break;
    }
  } else {
    for (let row = 0; row < range.rows; row += 1) {
      if (compareValues(indexRange(range, row, 0), lookup) === 0) {
        matchRow = row;
        break;
      }
    }
  }

  if (matchRow === -1) {
    return createError("#N/A", `VLOOKUP could not find ${formatScalar(lookup as EvaluatedValue)}.`, {
      suggestion: "Check the lookup value or use approximate matching with TRUE.",
    });
  }

  return scalarResult(indexRange(range, matchRow, colIndex - 1));
}

function hlookup(args: EngineValue[]): EvaluatedValue {
  const lookup = args[0];
  if (lookup === undefined) return createError("#ARGS!", "HLOOKUP needs a lookup value.");
  const range = requireRange(args[1], 2);
  if (isFormulaError(range)) return range;
  const rowIndex = toInteger(args[2]);
  if (isFormulaError(rowIndex)) return createError("#ARGS!", "HLOOKUP needs a row index.");
  if (rowIndex < 1 || rowIndex > range.rows) {
    return createError("#REF!", `Row index ${rowIndex} is outside the range.`);
  }
  const approximate = args[3] === undefined ? false : toBoolean(args[3]);
  if (isFormulaError(approximate)) return approximate;

  let matchCol = -1;
  if (approximate) {
    for (let col = 0; col < range.cols; col += 1) {
      if (compareValues(indexRange(range, 0, col), lookup) <= 0) matchCol = col;
      else break;
    }
  } else {
    for (let col = 0; col < range.cols; col += 1) {
      if (compareValues(indexRange(range, 0, col), lookup) === 0) {
        matchCol = col;
        break;
      }
    }
  }

  if (matchCol === -1) {
    return createError("#N/A", `HLOOKUP could not find ${formatScalar(lookup as EvaluatedValue)}.`);
  }
  return scalarResult(indexRange(range, rowIndex - 1, matchCol));
}

function matchFunction(args: EngineValue[]): EvaluatedValue {
  const lookup = args[0];
  if (lookup === undefined) return createError("#ARGS!", "MATCH needs a lookup value.");
  const range = requireRange(args[1], 2);
  if (isFormulaError(range)) return range;
  const matchType = args[2] === undefined ? 1 : toInteger(args[2]);
  if (isFormulaError(matchType)) return matchType;

  let found = -1;
  if (matchType === 0) {
    for (let index = 0; index < range.values.length; index += 1) {
      if (compareValues(range.values[index], lookup) === 0) {
        found = index;
        break;
      }
    }
  } else if (matchType > 0) {
    for (let index = 0; index < range.values.length; index += 1) {
      if (compareValues(range.values[index], lookup) <= 0) found = index;
      else break;
    }
  } else {
    for (let index = range.values.length - 1; index >= 0; index -= 1) {
      if (compareValues(range.values[index], lookup) >= 0) found = index;
      else break;
    }
  }

  if (found === -1) return createError("#N/A", `MATCH could not find ${formatScalar(lookup as EvaluatedValue)}.`);
  return found + 1;
}

function indexFunction(args: EngineValue[]): EngineValue {
  const range = requireRange(args[0], 1);
  if (isFormulaError(range)) return range;
  const rowNumber = args[1] === undefined ? 1 : toInteger(args[1]);
  if (isFormulaError(rowNumber)) return rowNumber;
  const colNumber = args[2] === undefined ? 1 : toInteger(args[2]);
  if (isFormulaError(colNumber)) return colNumber;

  if (rowNumber < 0 || colNumber < 0 || rowNumber > range.rows || colNumber > range.cols) {
    return createError("#REF!", "INDEX is out of range.");
  }

  if (rowNumber === 0 && colNumber === 0) return range;
  if (rowNumber === 0) {
    return {
      kind: "range",
      rows: 1,
      cols: range.cols,
      values: range.values.slice(0, range.cols),
    };
  }
  if (colNumber === 0) {
    const values: EvaluatedValue[] = [];
    for (let row = 0; row < range.rows; row += 1) values.push(indexRange(range, row, 0));
    return { kind: "range", rows: range.rows, cols: 1, values };
  }

  return scalarResult(indexRange(range, rowNumber - 1, colNumber - 1));
}

function lookupFunction(args: EngineValue[]): EvaluatedValue {
  const lookup = args[0];
  if (lookup === undefined) return createError("#ARGS!", "LOOKUP needs a lookup value.");
  const range = requireRange(args[1], 2);
  if (isFormulaError(range)) return range;

  let match = -1;
  for (let index = 0; index < range.values.length; index += 1) {
    if (compareValues(range.values[index], lookup) <= 0) match = index;
    else break;
  }
  if (match === -1) return createError("#N/A", `LOOKUP could not find ${formatScalar(lookup as EvaluatedValue)}.`);
  return scalarResult(range.values[match]);
}

function rowsFunction(args: EngineValue[]): EvaluatedValue {
  const range = requireRange(args[0], 1);
  if (isFormulaError(range)) return range;
  return range.rows;
}

function columnsFunction(args: EngineValue[]): EvaluatedValue {
  const range = requireRange(args[0], 1);
  if (isFormulaError(range)) return range;
  return range.cols;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function textJoin(args: EngineValue[]): EvaluatedValue {
  const delimiter = toText(args[0]);
  if (isFormulaError(delimiter)) return delimiter;
  const ignoreEmpty = toBoolean(args[1] ?? true);
  if (isFormulaError(ignoreEmpty)) return ignoreEmpty;

  const collected = flattenValues(args.slice(2));
  const error = firstError(collected);
  if (error) return error;

  const parts = collected
    .map((value) => plainText(value))
    .filter((value) => !ignoreEmpty || value !== "");

  return parts.join(delimiter);
}

function concatValues(args: EngineValue[]): EvaluatedValue {
  const collected = flattenValues(args);
  const error = firstError(collected);
  if (error) return error;
  return collected.map((value) => plainText(value)).join("");
}

function leftRight(args: EngineValue[], side: "left" | "right"): EvaluatedValue {
  const text = toText(args[0]);
  if (isFormulaError(text)) return text;
  const length = args[1] === undefined ? 1 : toInteger(args[1]);
  if (isFormulaError(length)) return length;
  if (length < 0) return createError("#VALUE!", "The length must be zero or greater.");
  return side === "left" ? text.slice(0, length) : text.slice(Math.max(0, text.length - length));
}

function mid(args: EngineValue[]): EvaluatedValue {
  const text = toText(args[0]);
  if (isFormulaError(text)) return text;
  const start = args[1] === undefined ? 1 : toInteger(args[1]);
  if (isFormulaError(start)) return start;
  const length = args[2] === undefined ? 1 : toInteger(args[2]);
  if (isFormulaError(length)) return length;
  if (start < 1) return createError("#VALUE!", "The start position must be 1 or greater.");
  return text.slice(start - 1, start - 1 + Math.max(0, length));
}

function substitute(args: EngineValue[]): EvaluatedValue {
  const text = toText(args[0]);
  if (isFormulaError(text)) return text;
  const search = toText(args[1]);
  if (isFormulaError(search)) return search;
  const replacement = toText(args[2]);
  if (isFormulaError(replacement)) return replacement;
  if (search === "") return text;
  if (args[3] === undefined) return text.split(search).join(replacement);

  const occurrence = toInteger(args[3]);
  if (isFormulaError(occurrence)) return occurrence;
  let seen = 0;
  let index = 0;

  while (index <= text.length) {
    const found = text.indexOf(search, index);
    if (found === -1) break;
    seen += 1;
    if (seen === occurrence) {
      return `${text.slice(0, found)}${replacement}${text.slice(found + search.length)}`;
    }
    index = found + search.length;
  }

  return text;
}

function replaceText(args: EngineValue[]): EvaluatedValue {
  const text = toText(args[0]);
  if (isFormulaError(text)) return text;
  const start = toInteger(args[1]);
  if (isFormulaError(start)) return start;
  const length = toInteger(args[2]);
  if (isFormulaError(length)) return length;
  const replacement = toText(args[3]);
  if (isFormulaError(replacement)) return replacement;
  if (start < 1) return createError("#VALUE!", "The start position must be 1 or greater.");
  return `${text.slice(0, start - 1)}${replacement}${text.slice(start - 1 + Math.max(0, length))}`;
}

function findInText(args: EngineValue[], caseSensitive: boolean): EvaluatedValue {
  const needle = toText(args[0]);
  if (isFormulaError(needle)) return needle;
  const haystack = toText(args[1]);
  if (isFormulaError(haystack)) return haystack;
  const start = args[2] === undefined ? 1 : toInteger(args[2]);
  if (isFormulaError(start)) return start;

  const hay = caseSensitive ? haystack : haystack.toLowerCase();
  const pin = caseSensitive ? needle : needle.toLowerCase();
  const index = hay.indexOf(pin, Math.max(0, start - 1));
  return index === -1 ? createError("#VALUE!", `"${needle}" was not found.`) : index + 1;
}

function charFunction(args: EngineValue[]): EvaluatedValue {
  const code = toInteger(args[0]);
  if (isFormulaError(code)) return code;
  return String.fromCharCode(code);
}

function codeFunction(args: EngineValue[]): EvaluatedValue {
  const text = toText(args[0]);
  if (isFormulaError(text)) return text;
  return text.length === 0 ? createError("#VALUE!", "CODE needs a non-empty text value.") : text.charCodeAt(0);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

function unaryOn(args: EngineValue[], operation: (value: number) => EvaluatedValue): EvaluatedValue {
  const numeric = requireNumber(args[0], 1);
  if (isFormulaError(numeric)) return numeric;
  return operation(numeric);
}

function binaryOn(
  args: EngineValue[],
  operation: (left: number, right: number) => EvaluatedValue,
): EvaluatedValue {
  const left = requireNumber(args[0], 1);
  if (isFormulaError(left)) return left;
  const right = requireNumber(args[1], 2);
  if (isFormulaError(right)) return right;
  return operation(left, right);
}

const definitions: FunctionDefinition[] = [
  { name: "SUM", category: "Math & stats", signature: "SUM(number1, [number2], …)", description: "Adds every numeric value across arguments and ranges. Text and blanks are ignored.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: sum },
  { name: "AVERAGE", category: "Math & stats", signature: "AVERAGE(number1, [number2], …)", description: "Returns the arithmetic mean of numeric values.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: average },
  { name: "MIN", category: "Math & stats", signature: "MIN(number1, [number2], …)", description: "Returns the smallest numeric value.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: (args) => minMax(args, "min") },
  { name: "MAX", category: "Math & stats", signature: "MAX(number1, [number2], …)", description: "Returns the largest numeric value.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: (args) => minMax(args, "max") },
  { name: "COUNT", category: "Math & stats", signature: "COUNT(value1, [value2], …)", description: "Counts how many values are numbers.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: count },
  { name: "COUNTA", category: "Math & stats", signature: "COUNTA(value1, [value2], …)", description: "Counts non-empty values in the arguments.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: countA },
  { name: "COUNTBLANK", category: "Math & stats", signature: "COUNTBLANK(range)", description: "Counts empty cells inside a range.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: countBlank },
  { name: "PRODUCT", category: "Math & stats", signature: "PRODUCT(number1, [number2], …)", description: "Multiplies all numeric values together.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: product },
  { name: "MEDIAN", category: "Math & stats", signature: "MEDIAN(number1, [number2], …)", description: "Returns the middle number of a data set.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: median },
  { name: "STDEV", category: "Math & stats", signature: "STDEV(number1, [number2], …)", description: "Sample standard deviation of numeric values.", minArgs: 2, maxArgs: Number.POSITIVE_INFINITY, call: stdev },
  { name: "SUMIF", category: "Math & stats", signature: "SUMIF(range, criteria, [sum_range])", description: "Adds values that satisfy a criteria. Supports > < >= <= <> and the wildcards * and ?.", minArgs: 2, maxArgs: 3, call: (args) => conditionalAggregate(args, "sum"), example: '=SUMIF(B2:B7, ">1000")' },
  { name: "COUNTIF", category: "Math & stats", signature: "COUNTIF(range, criteria)", description: "Counts values that satisfy a criteria.", minArgs: 2, maxArgs: 2, call: (args) => conditionalAggregate(args, "count"), example: '=COUNTIF(E2:E7, "Strong")' },
  { name: "AVERAGEIF", category: "Math & stats", signature: "AVERAGEIF(range, criteria, [average_range])", description: "Averages values that satisfy a criteria.", minArgs: 2, maxArgs: 3, call: (args) => conditionalAggregate(args, "average") },
  { name: "SUMPRODUCT", category: "Math & stats", signature: "SUMPRODUCT(range1, [range2], …)", description: "Multiplies equally sized ranges element by element, then sums the result.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: sumProduct },
  { name: "ABS", category: "Math & stats", signature: "ABS(number)", description: "Absolute value of a number.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.abs(value)) },
  { name: "ROUND", category: "Math & stats", signature: "ROUND(number, [digits])", description: "Rounds a number to a given number of digits.", minArgs: 1, maxArgs: 2, call: (args) => roundTo(args, "round") },
  { name: "ROUNDUP", category: "Math & stats", signature: "ROUNDUP(number, [digits])", description: "Rounds a number away from zero.", minArgs: 1, maxArgs: 2, call: (args) => roundTo(args, "up") },
  { name: "ROUNDDOWN", category: "Math & stats", signature: "ROUNDDOWN(number, [digits])", description: "Rounds a number toward zero.", minArgs: 1, maxArgs: 2, call: (args) => roundTo(args, "down") },
  { name: "INT", category: "Math & stats", signature: "INT(number)", description: "Rounds down to the nearest integer.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.floor(value)) },
  { name: "TRUNC", category: "Math & stats", signature: "TRUNC(number, [digits])", description: "Truncates a number toward zero.", minArgs: 1, maxArgs: 2, call: (args) => roundTo(args, "down") },
  { name: "MOD", category: "Math & stats", signature: "MOD(number, divisor)", description: "Remainder after division.", minArgs: 2, maxArgs: 2, call: (args) => binaryOn(args, (a, b) => (b === 0 ? createError("#DIV/0!", "MOD divisor cannot be zero.") : ((a % b) + b) % b)) },
  { name: "POWER", category: "Math & stats", signature: "POWER(number, power)", description: "Raises a number to a power.", minArgs: 2, maxArgs: 2, call: (args) => binaryOn(args, (a, b) => a ** b) },
  { name: "SQRT", category: "Math & stats", signature: "SQRT(number)", description: "Square root of a number.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => (value < 0 ? createError("#NUM!", "SQRT cannot take a negative number.") : Math.sqrt(value))) },
  { name: "EXP", category: "Math & stats", signature: "EXP(number)", description: "e raised to the given power.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.exp(value)) },
  { name: "LN", category: "Math & stats", signature: "LN(number)", description: "Natural logarithm.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => (value <= 0 ? createError("#NUM!", "LN needs a positive number.") : Math.log(value))) },
  { name: "LOG", category: "Math & stats", signature: "LOG(number, [base])", description: "Logarithm with an optional base, defaulting to 10.", minArgs: 1, maxArgs: 2, call: (args) => binaryOn([args[0], args[1] ?? 10], (value, base) => (value <= 0 || base <= 0 ? createError("#NUM!", "LOG needs positive numbers.") : Math.log(value) / Math.log(base))) },
  { name: "LOG10", category: "Math & stats", signature: "LOG10(number)", description: "Base-10 logarithm.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => (value <= 0 ? createError("#NUM!", "LOG10 needs a positive number.") : Math.log10(value))) },
  { name: "SIGN", category: "Math & stats", signature: "SIGN(number)", description: "Returns -1, 0, or 1 for the sign of a number.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.sign(value)) },
  { name: "PI", category: "Math & stats", signature: "PI()", description: "The constant π.", minArgs: 0, maxArgs: 0, call: () => Math.PI },
  { name: "CEILING", category: "Math & stats", signature: "CEILING(number, [significance])", description: "Rounds a number up to the nearest multiple.", minArgs: 1, maxArgs: 2, call: (args) => binaryOn([args[0], args[1] ?? 1], (value, significance) => (significance === 0 ? 0 : Math.ceil(value / significance) * significance)) },
  { name: "FLOOR", category: "Math & stats", signature: "FLOOR(number, [significance])", description: "Rounds a number down to the nearest multiple.", minArgs: 1, maxArgs: 2, call: (args) => binaryOn([args[0], args[1] ?? 1], (value, significance) => (significance === 0 ? 0 : Math.floor(value / significance) * significance)) },

  { name: "IF", category: "Logical", signature: "IF(test, true_value, [false_value])", description: "Returns one value when the test is true and another when false. Only the taken branch is evaluated.", minArgs: 2, maxArgs: 3, call: () => createError("#VALUE!", "IF is evaluated lazily by the engine."), example: '=IF(D2>20000, "Strong", "Watch")' },
  { name: "IFERROR", category: "Logical", signature: "IFERROR(value, fallback)", description: "Returns the fallback when the value is an error.", minArgs: 2, maxArgs: 2, call: () => createError("#VALUE!", "IFERROR is evaluated lazily by the engine.") },
  { name: "IFNA", category: "Logical", signature: "IFNA(value, fallback)", description: "Returns the fallback only when the value is #N/A.", minArgs: 2, maxArgs: 2, call: () => createError("#VALUE!", "IFNA is evaluated lazily by the engine.") },
  { name: "AND", category: "Logical", signature: "AND(logical1, [logical2], …)", description: "TRUE when every argument is true.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: (args) => { const values = flattenValues(args); const error = firstError(values); if (error) return error; return values.every((value) => toBoolean(value) === true); } },
  { name: "OR", category: "Logical", signature: "OR(logical1, [logical2], …)", description: "TRUE when any argument is true.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: (args) => { const values = flattenValues(args); const error = firstError(values); if (error) return error; return values.some((value) => toBoolean(value) === true); } },
  { name: "NOT", category: "Logical", signature: "NOT(logical)", description: "Reverses a boolean value.", minArgs: 1, maxArgs: 1, call: (args) => { const value = toBoolean(args[0]); return isFormulaError(value) ? value : !value; } },
  { name: "TRUE", category: "Logical", signature: "TRUE()", description: "Returns the boolean TRUE.", minArgs: 0, maxArgs: 0, call: () => true },
  { name: "FALSE", category: "Logical", signature: "FALSE()", description: "Returns the boolean FALSE.", minArgs: 0, maxArgs: 0, call: () => false },

  { name: "ISBLANK", category: "Information", signature: "ISBLANK(value)", description: "TRUE when the value is empty.", minArgs: 1, maxArgs: 1, call: (args) => args[0] === undefined || args[0] === null || args[0] === "" },
  { name: "ISNUMBER", category: "Information", signature: "ISNUMBER(value)", description: "TRUE when the value is a number.", minArgs: 1, maxArgs: 1, call: (args) => typeof args[0] === "number" },
  { name: "ISTEXT", category: "Information", signature: "ISTEXT(value)", description: "TRUE when the value is text.", minArgs: 1, maxArgs: 1, call: (args) => typeof args[0] === "string" },
  { name: "ISLOGICAL", category: "Information", signature: "ISLOGICAL(value)", description: "TRUE when the value is a boolean.", minArgs: 1, maxArgs: 1, call: (args) => typeof args[0] === "boolean" },
  { name: "ISERROR", category: "Information", signature: "ISERROR(value)", description: "TRUE when the value is any error.", minArgs: 1, maxArgs: 1, call: (args) => isFormulaError(args[0]) },
  { name: "ISEVEN", category: "Information", signature: "ISEVEN(number)", description: "TRUE when the number is even.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.trunc(value) % 2 === 0) },
  { name: "ISODD", category: "Information", signature: "ISODD(number)", description: "TRUE when the number is odd.", minArgs: 1, maxArgs: 1, call: (args) => unaryOn(args, (value) => Math.abs(Math.trunc(value) % 2) === 1) },
  { name: "NA", category: "Information", signature: "NA()", description: "Returns the #N/A error.", minArgs: 0, maxArgs: 0, call: () => createError("#N/A", "NA() was requested.") },
  { name: "N", category: "Information", signature: "N(value)", description: "Converts a value to a number: booleans become 1 or 0, numbers stay, everything else becomes 0.", minArgs: 1, maxArgs: 1, call: (args) => (typeof args[0] === "number" ? args[0] : typeof args[0] === "boolean" ? (args[0] ? 1 : 0) : 0) },

  { name: "CONCAT", category: "Text", signature: "CONCAT(value1, [value2], …)", description: "Joins values into one text string.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: concatValues },
  { name: "CONCATENATE", category: "Text", signature: "CONCATENATE(value1, [value2], …)", description: "Joins values into one text string.", minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, call: concatValues },
  { name: "TEXTJOIN", category: "Text", signature: "TEXTJOIN(delimiter, ignore_empty, value1, …)", description: "Joins values with a delimiter.", minArgs: 3, maxArgs: Number.POSITIVE_INFINITY, call: textJoin, example: '=TEXTJOIN(", ", TRUE, A2:A5)' },
  { name: "LEFT", category: "Text", signature: "LEFT(text, [length])", description: "First characters of a text value.", minArgs: 1, maxArgs: 2, call: (args) => leftRight(args, "left") },
  { name: "RIGHT", category: "Text", signature: "RIGHT(text, [length])", description: "Last characters of a text value.", minArgs: 1, maxArgs: 2, call: (args) => leftRight(args, "right") },
  { name: "MID", category: "Text", signature: "MID(text, start, length)", description: "Characters from the middle of a text value.", minArgs: 3, maxArgs: 3, call: mid },
  { name: "LEN", category: "Text", signature: "LEN(text)", description: "Number of characters in a text value.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); return isFormulaError(text) ? text : text.length; } },
  { name: "LOWER", category: "Text", signature: "LOWER(text)", description: "Converts text to lowercase.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); return isFormulaError(text) ? text : text.toLowerCase(); } },
  { name: "UPPER", category: "Text", signature: "UPPER(text)", description: "Converts text to uppercase.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); return isFormulaError(text) ? text : text.toUpperCase(); } },
  { name: "PROPER", category: "Text", signature: "PROPER(text)", description: "Capitalizes each word.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); return isFormulaError(text) ? text : text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase()); } },
  { name: "TRIM", category: "Text", signature: "TRIM(text)", description: "Removes leading, trailing, and repeated spaces.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); return isFormulaError(text) ? text : text.trim().replace(/\s+/g, " "); } },
  { name: "SUBSTITUTE", category: "Text", signature: "SUBSTITUTE(text, old, new, [occurrence])", description: "Replaces text inside a value.", minArgs: 3, maxArgs: 4, call: substitute },
  { name: "REPLACE", category: "Text", signature: "REPLACE(text, start, length, new)", description: "Replaces part of a text value by position.", minArgs: 4, maxArgs: 4, call: replaceText },
  { name: "REPT", category: "Text", signature: "REPT(text, count)", description: "Repeats a text value.", minArgs: 2, maxArgs: 2, call: (args) => { const text = toText(args[0]); if (isFormulaError(text)) return text; const count = toInteger(args[1]); if (isFormulaError(count)) return count; return count < 0 ? createError("#VALUE!", "REPT count must be zero or greater.") : text.repeat(Math.min(count, 1000)); } },
  { name: "VALUE", category: "Text", signature: "VALUE(text)", description: "Converts numeric text to a number.", minArgs: 1, maxArgs: 1, call: (args) => { const text = toText(args[0]); if (isFormulaError(text)) return text; const parsed = Number(text.replace(/,/g, "")); return Number.isFinite(parsed) ? parsed : createError("#VALUE!", `"${text}" is not numeric.`); } },
  { name: "FIND", category: "Text", signature: "FIND(needle, text, [start])", description: "Case-sensitive position of text inside another value.", minArgs: 2, maxArgs: 3, call: (args) => findInText(args, true) },
  { name: "SEARCH", category: "Text", signature: "SEARCH(needle, text, [start])", description: "Case-insensitive position of text inside another value.", minArgs: 2, maxArgs: 3, call: (args) => findInText(args, false) },
  { name: "EXACT", category: "Text", signature: "EXACT(text1, text2)", description: "TRUE when two text values match exactly.", minArgs: 2, maxArgs: 2, call: (args) => { const a = toText(args[0]); if (isFormulaError(a)) return a; const b = toText(args[1]); if (isFormulaError(b)) return b; return a === b; } },
  { name: "CHAR", category: "Text", signature: "CHAR(code)", description: "Character for a numeric code.", minArgs: 1, maxArgs: 1, call: charFunction },
  { name: "CODE", category: "Text", signature: "CODE(text)", description: "Numeric code of the first character.", minArgs: 1, maxArgs: 1, call: codeFunction },

  { name: "VLOOKUP", category: "Lookup", signature: "VLOOKUP(value, range, column, [approximate])", description: "Searches the first column of a range and returns a value from another column. Exact by default.", minArgs: 3, maxArgs: 4, call: vlookup, example: '=VLOOKUP("North", A2:D7, 4, FALSE)' },
  { name: "HLOOKUP", category: "Lookup", signature: "HLOOKUP(value, range, row, [approximate])", description: "Searches the first row of a range and returns a value from another row.", minArgs: 3, maxArgs: 4, call: hlookup },
  { name: "INDEX", category: "Lookup", signature: "INDEX(range, row, [column])", description: "Returns a value at a position inside a range.", minArgs: 2, maxArgs: 3, call: indexFunction },
  { name: "MATCH", category: "Lookup", signature: "MATCH(value, range, [type])", description: "Position of a value inside a range. Type 0 is exact, 1 ascending, -1 descending.", minArgs: 2, maxArgs: 3, call: matchFunction, example: "=MATCH(MAX(D2:D7), D2:D7, 0)" },
  { name: "LOOKUP", category: "Lookup", signature: "LOOKUP(value, range)", description: "Approximate lookup in a single row or column.", minArgs: 2, maxArgs: 2, call: lookupFunction },
  { name: "ROWS", category: "Lookup", signature: "ROWS(range)", description: "Number of rows in a range.", minArgs: 1, maxArgs: 1, call: rowsFunction },
  { name: "COLUMNS", category: "Lookup", signature: "COLUMNS(range)", description: "Number of columns in a range.", minArgs: 1, maxArgs: 1, call: columnsFunction },
];

export const FUNCTIONS: Record<string, FunctionDefinition> = Object.fromEntries(
  definitions.map((definition) => [definition.name, definition]),
);

export const FUNCTION_LIST: FunctionMeta[] = definitions
  .map(({ call: _call, ...meta }) => meta)
  .sort((a, b) => a.name.localeCompare(b.name));

export const FUNCTION_NAMES: string[] = definitions.map((definition) => definition.name);

export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  "Math & stats",
  "Logical",
  "Text",
  "Lookup",
  "Information",
];

export function suggestFunction(name: string): string | null {
  return nearestName(name, FUNCTION_NAMES, 2);
}

export function functionCount(): number {
  return definitions.length;
}
