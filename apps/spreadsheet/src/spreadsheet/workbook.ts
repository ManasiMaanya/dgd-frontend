import {
  cellKey,
  forEachCell,
  isAddressInSheet,
  normalizeRange,
} from "./coordinates";
import { createError, diagnosticFor } from "./diagnostics";
import {
  FUNCTIONS,
  compareValues,
  suggestFunction,
  toBoolean,
  toNumber,
  toText,
} from "./functions";
import { parseExpression, type BinaryNode, type FunctionNode, type Node } from "./parser";
import {
  isFormulaError,
  isRangeValue,
  type CellDiagnostic,
  type CellRange,
  type CellUpdate,
  type EvaluatedValue,
  type EngineValue,
  type FormulaErrorValue,
  type RangeValue,
  type RecalculationReport,
} from "./types";

type CellProgram =
  | { kind: "empty" }
  | { kind: "literal"; value: EvaluatedValue }
  | { kind: "formula"; ast: Node; raw: string }
  | { kind: "error"; error: FormulaErrorValue; raw: string };

interface HistoryEntry {
  label: string;
  before: CellUpdate[];
  after: CellUpdate[];
}

export interface SelectionStats {
  count: number;
  numericCount: number;
  sum: number;
  average: number | null;
  min: number | null;
  max: number | null;
}

const COMPARISON: Record<string, (comparison: number) => boolean> = {
  "=": (value) => value === 0,
  "<>": (value) => value !== 0,
  "<": (value) => value < 0,
  ">": (value) => value > 0,
  "<=": (value) => value <= 0,
  ">=": (value) => value >= 0,
};

function describeArity(minArgs: number, maxArgs: number): string {
  if (maxArgs === Number.POSITIVE_INFINITY) return `at least ${minArgs} argument${minArgs === 1 ? "" : "s"}`;
  if (minArgs === maxArgs) return `${minArgs} argument${minArgs === 1 ? "" : "s"}`;
  return `${minArgs}–${maxArgs} arguments`;
}

const MAX_RANGE_DEPENDENCIES = 20000;
const HISTORY_LIMIT = 200;

export class Workbook {
  private readonly cells = new Map<string, string>();
  private readonly programs = new Map<string, CellProgram>();
  private readonly computed = new Map<string, EvaluatedValue>();
  private readonly diagnostics = new Map<string, CellDiagnostic>();
  private readonly dependencies = new Map<string, Set<string>>();
  private readonly dependents = new Map<string, Set<string>>();
  private readonly visitState = new Map<string, "visiting" | "done">();
  private readonly cycleMessages = new Map<string, string>();
  private readonly listeners = new Set<() => void>();

  private stack: string[] = [];
  private history: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private recalculatedCount = 0;
  private revision = 0;
  private report: RecalculationReport = { revision: 0, affected: 0, recalculated: 0, durationMs: 0 };

  constructor(initial: Record<string, string> = {}) {
    for (const [key, raw] of Object.entries(initial)) {
      if (typeof raw === "string" && raw !== "") {
        this.cells.set(key, raw);
        this.updateDependencies(key);
      }
    }
    this.recalculate(new Set(this.cells.keys()));
  }

  // -- subscriptions --------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private touch(): void {
    this.revision += 1;
  }

  getRevision(): number {
    return this.revision;
  }

  getReport(): RecalculationReport {
    return this.report;
  }

  // -- reads ----------------------------------------------------------------

  getRaw(key: string): string {
    return this.cells.get(key) ?? "";
  }

  hasCell(key: string): boolean {
    return this.cells.has(key);
  }

  getComputed(key: string): EvaluatedValue {
    if (this.visitState.get(key) === "done") {
      return this.computed.get(key) ?? null;
    }
    if (!this.cells.has(key)) return null;
    this.stack = [];
    this.cycleMessages.clear();
    return this.evaluateCell(key);
  }

  getDiagnostic(key: string): CellDiagnostic | undefined {
    return this.diagnostics.get(key);
  }

  getDependencies(key: string): string[] {
    return [...(this.dependencies.get(key) ?? [])];
  }

  getDependents(key: string): string[] {
    return [...(this.dependents.get(key) ?? [])];
  }

  getAllDiagnostics(): { key: string; diagnostic: CellDiagnostic }[] {
    return [...this.diagnostics.entries()]
      .map(([key, diagnostic]) => ({ key, diagnostic }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  getSelectedStats(range: CellRange): SelectionStats {
    let count = 0;
    let numericCount = 0;
    let sum = 0;
    let min: number | null = null;
    let max: number | null = null;

    forEachCell(range, ({ row, col }) => {
      count += 1;
      const value = this.getComputed(cellKey(row, col));
      if (typeof value === "number") {
        numericCount += 1;
        sum += value;
        min = min === null ? value : Math.min(min, value);
        max = max === null ? value : Math.max(max, value);
      }
    });

    return {
      count,
      numericCount,
      sum,
      average: numericCount === 0 ? null : sum / numericCount,
      min,
      max,
    };
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.cells.entries());
  }

  // -- writes ---------------------------------------------------------------

  setCell(key: string, raw: string): void {
    this.commit([{ key, raw }], "Edit cell");
  }

  setCells(updates: CellUpdate[], label = "Edit"): void {
    this.commit(updates, label);
  }

  clearRange(range: CellRange): void {
    const updates: CellUpdate[] = [];
    forEachCell(range, ({ row, col }) => updates.push({ key: cellKey(row, col), raw: "" }));
    this.commit(updates, "Clear");
  }

  replaceAll(cells: Record<string, string>, label = "Replace workbook"): void {
    const touched = new Set<string>();
    for (const key of this.cells.keys()) touched.add(key);
    for (const key of Object.keys(cells)) touched.add(key);

    const before: CellUpdate[] = [];
    const after: CellUpdate[] = [];

    for (const key of touched) {
      const current = this.cells.get(key) ?? "";
      const next = cells[key] ?? "";
      if (current === next) continue;
      before.push({ key, raw: current });
      after.push({ key, raw: next });
    }

    if (after.length === 0) return;

    this.pushHistory({ label, before, after });
    for (const key of touched) this.deleteCell(key);
    for (const [key, raw] of Object.entries(cells)) {
      if (raw !== "") this.cells.set(key, raw);
    }
    for (const key of Object.keys(cells)) this.updateDependencies(key);

    const affected = this.collectAffected(after.map((update) => update.key));
    this.recalculate(affected);
    this.notify();
  }

  private commit(updates: CellUpdate[], label: string): void {
    const before: CellUpdate[] = [];
    const after: CellUpdate[] = [];

    for (const update of updates) {
      const current = this.cells.get(update.key) ?? "";
      if (current === update.raw) continue;
      before.push({ key: update.key, raw: current });
      after.push({ key: update.key, raw: update.raw });
    }

    if (after.length === 0) return;

    this.pushHistory({ label, before, after });
    this.applyRaw(after);
    const affected = this.collectAffected(after.map((update) => update.key));
    this.recalculate(affected);
    this.notify();
  }

  private pushHistory(entry: HistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.future = [];
  }

  private applyRaw(updates: CellUpdate[]): void {
    for (const update of updates) {
      if (update.raw === "") this.cells.delete(update.key);
      else this.cells.set(update.key, update.raw);
      this.updateDependencies(update.key);
      this.visitState.delete(update.key);
      this.computed.delete(update.key);
      this.diagnostics.delete(update.key);
    }
  }

  private deleteCell(key: string): void {
    this.cells.delete(key);
    this.updateDependencies(key);
    this.visitState.delete(key);
    this.computed.delete(key);
    this.diagnostics.delete(key);
  }

  // -- history --------------------------------------------------------------

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): boolean {
    const entry = this.history.pop();
    if (!entry) return false;
    this.future.push(entry);
    this.applyHistory(entry.before);
    return true;
  }

  redo(): boolean {
    const entry = this.future.pop();
    if (!entry) return false;
    this.history.push(entry);
    this.applyHistory(entry.after);
    return true;
  }

  private applyHistory(updates: CellUpdate[]): void {
    this.applyRaw(updates);
    const affected = this.collectAffected(updates.map((update) => update.key));
    this.recalculate(affected);
    this.notify();
  }

  // -- dependency graph -----------------------------------------------------

  private collectAffected(keys: Iterable<string>): Set<string> {
    const affected = new Set<string>(keys);
    const queue = [...affected];

    while (queue.length > 0) {
      const key = queue.shift() as string;
      const dependents = this.dependents.get(key);
      if (!dependents) continue;
      for (const dependent of dependents) {
        if (affected.has(dependent)) continue;
        affected.add(dependent);
        queue.push(dependent);
      }
    }

    return affected;
  }

  private updateDependencies(key: string): void {
    const existing = this.dependencies.get(key);
    if (existing) {
      for (const dependency of existing) {
        const bucket = this.dependents.get(dependency);
        bucket?.delete(key);
        if (bucket && bucket.size === 0) this.dependents.delete(dependency);
      }
      this.dependencies.delete(key);
    }

    const program = this.programFor(this.cells.get(key) ?? "");
    if (program.kind !== "formula") return;

    const references = new Set<string>();
    this.walkDependencies(program.ast, references);
    if (references.size === 0) return;

    this.dependencies.set(key, references);
    for (const dependency of references) {
      const bucket = this.dependents.get(dependency) ?? new Set<string>();
      bucket.add(key);
      this.dependents.set(dependency, bucket);
    }
  }

  private walkDependencies(node: Node, references: Set<string>): void {
    if (references.size > MAX_RANGE_DEPENDENCIES) return;

    switch (node.kind) {
      case "cell": {
        if (isAddressInSheet(node)) references.add(cellKey(node.row, node.col));
        break;
      }
      case "range": {
        const start = { row: node.startCell.row, col: node.startCell.col };
        const end = { row: node.endCell.row, col: node.endCell.col };
        if (!isAddressInSheet(start) || !isAddressInSheet(end)) break;
        const normalized = normalizeRange({ start, end });
        forEachCell(normalized, ({ row, col }) => {
          if (references.size <= MAX_RANGE_DEPENDENCIES) references.add(cellKey(row, col));
        });
        break;
      }
      case "unary":
        this.walkDependencies(node.operand, references);
        break;
      case "percent":
        this.walkDependencies(node.operand, references);
        break;
      case "binary":
        this.walkDependencies(node.left, references);
        this.walkDependencies(node.right, references);
        break;
      case "function":
        for (const arg of node.args) this.walkDependencies(arg, references);
        break;
      default:
        break;
    }
  }

  // -- evaluation -----------------------------------------------------------

  private recalculate(affected: Set<string>): void {
    const startedAt = performance.now();
    this.recalculatedCount = 0;
    this.cycleMessages.clear();
    this.stack = [];

    for (const key of affected) {
      this.visitState.delete(key);
      this.diagnostics.delete(key);
    }

    const ordered = [...affected].sort();
    for (const key of ordered) {
      if (this.visitState.get(key) === "done") continue;
      if (!this.cells.has(key)) {
        this.computed.delete(key);
        this.visitState.set(key, "done");
        continue;
      }
      this.stack = [];
      this.evaluateCell(key);
    }

    this.touch();
    this.report = {
      revision: this.revision,
      affected: affected.size,
      recalculated: this.recalculatedCount,
      durationMs: performance.now() - startedAt,
    };
  }

  private evaluateCell(key: string): EvaluatedValue {
    const status = this.visitState.get(key);
    if (status === "done") return this.computed.get(key) ?? null;

    if (status === "visiting") {
      const startIndex = Math.max(0, this.stack.indexOf(key));
      const cycle = this.stack.slice(startIndex).concat(key);
      const message = `Circular reference: ${cycle.join(" → ")}.`;
      const error = createError("#CYCLE!", message, {
        suggestion: "Break the loop by removing one of the references in the cycle.",
      });
      for (const member of this.stack.slice(startIndex)) {
        this.cycleMessages.set(member, message);
        this.diagnostics.set(member, diagnosticFor(this.getRaw(member), error));
      }
      this.cycleMessages.set(key, message);
      return error;
    }

    const program = this.programFor(this.cells.get(key) ?? "");

    if (program.kind === "empty") {
      this.visitState.set(key, "done");
      this.computed.set(key, null);
      this.diagnostics.delete(key);
      this.recalculatedCount += 1;
      return null;
    }

    if (program.kind === "literal") {
      this.visitState.set(key, "done");
      this.computed.set(key, program.value);
      this.diagnostics.delete(key);
      this.recalculatedCount += 1;
      return program.value;
    }

    if (program.kind === "error") {
      this.visitState.set(key, "done");
      this.computed.set(key, program.error);
      this.diagnostics.set(key, diagnosticFor(program.raw, program.error));
      this.recalculatedCount += 1;
      return program.error;
    }

    this.visitState.set(key, "visiting");
    this.stack.push(key);
    const result = this.evaluateNode(program.ast);
    let value: EvaluatedValue = isRangeValue(result)
      ? createError("#VALUE!", "A formula cannot return a whole range.", {
          position: 1,
          suggestion: "Wrap the range in a function such as SUM, INDEX, or TEXTJOIN.",
        })
      : result;

    const cycleMessage = this.cycleMessages.get(key);
    if (cycleMessage) {
      value = createError("#CYCLE!", cycleMessage, {
        position: 1,
        suggestion: "Break the loop by removing one of the references in the cycle.",
      });
    }

    this.stack.pop();
    this.visitState.set(key, "done");
    this.computed.set(key, value);
    this.recalculatedCount += 1;

    if (isFormulaError(value)) {
      this.diagnostics.set(key, diagnosticFor(program.raw, value));
    } else {
      this.diagnostics.delete(key);
    }

    return value;
  }

  private evaluateNode(node: Node): EngineValue {
    switch (node.kind) {
      case "number":
        return node.value;
      case "string":
        return node.value;
      case "boolean":
        return node.value;
      case "cell": {
        if (!isAddressInSheet(node)) {
          return createError("#REF!", `Reference ${node.label} is outside the sheet.`, {
            position: node.start + 1,
            length: node.end - node.start,
            suggestion: "Point the reference at a cell inside the 500 × 26 grid.",
          });
        }
        return this.evaluateCell(cellKey(node.row, node.col));
      }
      case "range": {
        const start = { row: node.startCell.row, col: node.startCell.col };
        const end = { row: node.endCell.row, col: node.endCell.col };
        if (!isAddressInSheet(start) || !isAddressInSheet(end)) {
          return createError("#REF!", "A range is outside the sheet.", {
            position: node.start + 1,
            length: node.end - node.start,
            suggestion: "Point the range at cells inside the 500 × 26 grid.",
          });
        }
        const normalized = normalizeRange({ start, end });
        const rows = normalized.end.row - normalized.start.row + 1;
        const cols = normalized.end.col - normalized.start.col + 1;
        const values: EvaluatedValue[] = [];
        for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
          for (let col = normalized.start.col; col <= normalized.end.col; col += 1) {
            const value = this.evaluateCell(cellKey(row, col));
            values.push(isRangeValue(value) ? null : value);
          }
        }
        return { kind: "range", rows, cols, values } satisfies RangeValue;
      }
      case "unary": {
        const operand = toNumber(this.evaluateNode(node.operand));
        if (isFormulaError(operand)) return operand;
        return node.operator === "-" ? -operand : operand;
      }
      case "percent": {
        const operand = toNumber(this.evaluateNode(node.operand));
        if (isFormulaError(operand)) return operand;
        return operand / 100;
      }
      case "binary":
        return this.evaluateBinary(node);
      case "function":
        return this.evaluateFunction(node);
      case "name": {
        const suggestion = suggestFunction(node.name);
        return createError("#NAME?", `Unknown name "${node.name}".`, {
          position: node.start + 1,
          length: node.end - node.start,
          suggestion: suggestion ? `Did you mean ${suggestion}()?` : "Check the spelling or quote the text.",
        });
      }
      default:
        return createError("#VALUE!", "Unsupported expression.");
    }
  }

  private evaluateBinary(node: BinaryNode): EngineValue {
    if (node.operator === "&") {
      const left = toText(this.evaluateNode(node.left));
      if (isFormulaError(left)) return left;
      const right = toText(this.evaluateNode(node.right));
      if (isFormulaError(right)) return right;
      return `${left}${right}`;
    }

    if (COMPARISON[node.operator]) {
      const left = this.evaluateNode(node.left);
      if (isFormulaError(left)) return left;
      const right = this.evaluateNode(node.right);
      if (isFormulaError(right)) return right;
      return COMPARISON[node.operator](compareValues(left, right));
    }

    const left = toNumber(this.evaluateNode(node.left));
    if (isFormulaError(left)) return left;
    const right = toNumber(this.evaluateNode(node.right));
    if (isFormulaError(right)) return right;

    switch (node.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) {
          return createError("#DIV/0!", "Division by zero.", {
            position: node.start + 1,
            length: node.end - node.start,
            suggestion: "Guard the divisor with IF or check the referenced cell.",
          });
        }
        return left / right;
      case "^":
        return left ** right;
      default:
        return createError("#VALUE!", `Unsupported operator ${node.operator}.`, {
          position: node.start + 1,
        });
    }
  }

  private evaluateFunction(node: FunctionNode): EngineValue {
    const definition = FUNCTIONS[node.name];

    if (!definition) {
      const suggestion = suggestFunction(node.name);
      return createError("#NAME?", `Unknown function "${node.name}".`, {
        position: node.start + 1,
        length: node.name.length,
        suggestion: suggestion ? `Did you mean ${suggestion}()?` : "Check the function name in the Formula Atlas.",
      });
    }

    if (node.args.length < definition.minArgs || node.args.length > definition.maxArgs) {
      return createError(
        "#ARGS!",
        `${node.name} expects ${describeArity(definition.minArgs, definition.maxArgs)} but received ${node.args.length}.`,
        {
          position: node.start + 1,
          length: node.name.length,
          suggestion: `Use the signature ${definition.signature}.`,
        },
      );
    }

    // Lazy functions only evaluate the branch they need.
    if (node.name === "IF") {
      const condition = toBoolean(this.evaluateNode(node.args[0]));
      if (isFormulaError(condition)) return condition;
      if (condition) return this.evaluateNode(node.args[1]);
      return node.args.length > 2 ? this.evaluateNode(node.args[2]) : false;
    }

    if (node.name === "IFERROR") {
      const value = this.evaluateNode(node.args[0]);
      return isFormulaError(value) ? this.evaluateNode(node.args[1]) : value;
    }

    if (node.name === "IFNA") {
      const value = this.evaluateNode(node.args[0]);
      if (isFormulaError(value) && value.code === "#N/A") return this.evaluateNode(node.args[1]);
      return value;
    }

    const args = node.args.map((arg) => this.evaluateNode(arg));
    const result = definition.call(args);
    return result;
  }

  // -- parsing --------------------------------------------------------------

  private programFor(raw: string): CellProgram {
    const cached = this.programs.get(raw);
    if (cached) return cached;

    let program: CellProgram;

    if (raw === "") {
      program = { kind: "empty" };
    } else if (raw.startsWith("=")) {
      const result = parseExpression(raw.slice(1));
      if (result.ok) {
        program = { kind: "formula", ast: result.ast, raw };
      } else {
        program = {
          kind: "error",
          raw,
          error: createError(result.error.code, result.error.message, {
            position: result.error.position + 1,
            length: Math.max(1, result.error.length),
            suggestion: result.error.suggestion,
          }),
        };
      }
    } else {
      const trimmed = raw.trim();
      const numeric = Number(trimmed);
      if (trimmed === "") {
        program = { kind: "empty" };
      } else if (Number.isFinite(numeric) && trimmed !== "") {
        program = { kind: "literal", value: numeric };
      } else if (/^true$/i.test(trimmed)) {
        program = { kind: "literal", value: true };
      } else if (/^false$/i.test(trimmed)) {
        program = { kind: "literal", value: false };
      } else {
        program = { kind: "literal", value: raw };
      }
    }

    this.programs.set(raw, program);
    return program;
  }
}
