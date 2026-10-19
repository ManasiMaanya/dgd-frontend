import { describe, expect, it } from "vitest";

import { parseExpression } from "../parser";
import { formatRange } from "../coordinates";
import { isFormulaError, type EvaluatedValue } from "../types";
import { Workbook } from "../workbook";

function value(workbook: Workbook, key: string): EvaluatedValue {
  return workbook.getComputed(key);
}

function numeric(workbook: Workbook, key: string): number {
  const result = value(workbook, key);
  if (typeof result !== "number") {
    throw new Error(`Expected ${key} to be a number but received ${JSON.stringify(result)}`);
  }
  return result;
}

function errorCode(workbook: Workbook, key: string): string {
  const result = value(workbook, key);
  if (!isFormulaError(result)) {
    throw new Error(`Expected ${key} to be an error but received ${JSON.stringify(result)}`);
  }
  return result.code;
}

describe("parser diagnostics", () => {
  it("reports the missing closing parenthesis from the brief with a caret and suggestion", () => {
    const result = parseExpression("SUM(A1, B2");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.message).toBe("Missing closing parenthesis.");
    expect(result.error.position).toBe("SUM(A1, B2".length);
    expect(result.error.suggestion).toBe("Add ')' at the end of the formula.");
  });

  it("flags an unterminated string", () => {
    const result = parseExpression('CONCAT("open');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Unterminated");
  });

  it("parses nested function calls into an AST", () => {
    const result = parseExpression('IF(SUM(A1:A3) > 10, "big", "small")');
    expect(result.ok).toBe(true);
  });
});

describe("evaluator", () => {
  it("evaluates arithmetic with operator precedence", () => {
    const workbook = new Workbook({ A1: "2", A2: "3", B1: "=A1+A2*2", B2: "=(A1+A2)*2", B3: "=2^3^2" });
    expect(numeric(workbook, "B1")).toBe(8);
    expect(numeric(workbook, "B2")).toBe(10);
    expect(numeric(workbook, "B3")).toBe(512);
  });

  it("evaluates ranges and aggregation", () => {
    const workbook = new Workbook({
      A1: "1",
      A2: "2",
      A3: "3",
      A4: "text",
      B1: "=SUM(A1:A4)",
      B2: "=AVERAGE(A1:A3)",
      B3: "=COUNT(A1:A4)",
      B4: "=MIN(A1:A4)",
      B5: "=MAX(A1:A4)",
    });
    expect(numeric(workbook, "B1")).toBe(6);
    expect(numeric(workbook, "B2")).toBe(2);
    expect(numeric(workbook, "B3")).toBe(3);
    expect(numeric(workbook, "B4")).toBe(1);
    expect(numeric(workbook, "B5")).toBe(3);
  });

  it("does not evaluate the untaken branch of IF", () => {
    const workbook = new Workbook({ A1: "0", B1: '=IF(A1=0, "safe", 1/A1)' });
    expect(value(workbook, "B1")).toBe("safe");
  });

  it("supports logical and text functions", () => {
    const workbook = new Workbook({
      A1: "North",
      A2: "South",
      B1: '=CONCAT(A1, " / ", UPPER(A2))',
      B2: "=AND(1=1, 2>1)",
      B3: "=NOT(OR(FALSE, FALSE))",
      B4: '=TEXTJOIN(", ", TRUE, A1:A2)',
      B5: '=LEFT(A1, 3) & RIGHT(A2, 2)',
    });
    expect(value(workbook, "B1")).toBe("North / SOUTH");
    expect(value(workbook, "B2")).toBe(true);
    expect(value(workbook, "B3")).toBe(true);
    expect(value(workbook, "B4")).toBe("North, South");
    expect(value(workbook, "B5")).toBe("North");
  });

  it("evaluates VLOOKUP, INDEX, and MATCH together", () => {
    const workbook = new Workbook({
      A1: "Region",
      B1: "Revenue",
      A2: "North",
      B2: "23680",
      A3: "South",
      B3: "20680",
      A4: "East",
      B4: "24570",
      D1: '=VLOOKUP("South", A2:B4, 2, FALSE)',
      D2: "=INDEX(A2:A4, MATCH(MAX(B2:B4), B2:B4, 0))",
      D3: "=COUNTIF(B2:B4, \">21000\")",
    });
    expect(numeric(workbook, "D1")).toBe(20680);
    expect(value(workbook, "D2")).toBe("East");
    expect(numeric(workbook, "D3")).toBe(2);
  });

  it("propagates runtime errors", () => {
    const workbook = new Workbook({ A1: "0", B1: "=1/A1", B2: "=A9999+1", B3: '=SUMM(A1:A2)' });
    expect(errorCode(workbook, "B1")).toBe("#DIV/0!");
    expect(errorCode(workbook, "B2")).toBe("#REF!");
    expect(errorCode(workbook, "B3")).toBe("#NAME?");
  });

  it("suggests a close function name for typos", () => {
    const workbook = new Workbook({ A1: "1", A2: "2", B1: "=SUMM(A1:A2)" });
    const diagnostic = workbook.getDiagnostic("B1");
    expect(diagnostic?.suggestion).toContain("SUM");
  });

  it("reports arity errors", () => {
    const workbook = new Workbook({ A1: "1", B1: "=IF(A1)" });
    expect(errorCode(workbook, "B1")).toBe("#ARGS!");
  });

  it("rejects a formula that resolves to a whole range", () => {
    const workbook = new Workbook({ A1: "1", A2: "2", B1: "=A1:A2" });
    expect(errorCode(workbook, "B1")).toBe("#VALUE!");
  });
});

describe("dependency graph and recalculation", () => {
  it("recalculates only the affected cells", () => {
    const workbook = new Workbook({
      A1: "1",
      A2: "2",
      A3: "=A1+A2",
      A4: "=A3*10",
      B1: "=SUM(A1:A2)",
      C1: "5",
      C2: "=C1*2",
    });

    expect(numeric(workbook, "A4")).toBe(30);

    workbook.setCell("A1", "5");

    expect(numeric(workbook, "A3")).toBe(7);
    expect(numeric(workbook, "A4")).toBe(70);
    // A3 and A4 cascade from A1; B1 also depends on A1; C2 is untouched.
    expect(workbook.getReport().recalculated).toBeLessThanOrEqual(4);
    expect(workbook.getReport().recalculated).toBeGreaterThanOrEqual(3);
  });

  it("updates dependencies when a formula is rewritten", () => {
    const workbook = new Workbook({ A1: "1", A2: "2", B1: "=A1", C1: "=B1*10" });
    expect(numeric(workbook, "C1")).toBe(10);

    workbook.setCell("B1", "=A2");
    expect(numeric(workbook, "C1")).toBe(20);

    workbook.setCell("A2", "9");
    expect(numeric(workbook, "C1")).toBe(90);

    // A1 is no longer a dependency of B1, so changing it must not affect C1.
    workbook.setCell("A1", "100");
    expect(numeric(workbook, "C1")).toBe(90);
  });
});

describe("circular references", () => {
  it("detects a direct self reference", () => {
    const workbook = new Workbook({ A1: "=A1+1" });
    expect(errorCode(workbook, "A1")).toBe("#CYCLE!");
    expect(workbook.getDiagnostic("A1")?.message).toContain("Circular reference");
  });

  it("detects an indirect cycle and marks every member", () => {
    const workbook = new Workbook({ A1: "=B1+1", B1: "=C1+1", C1: "=A1+1" });
    expect(errorCode(workbook, "A1")).toBe("#CYCLE!");
    expect(errorCode(workbook, "B1")).toBe("#CYCLE!");
    expect(errorCode(workbook, "C1")).toBe("#CYCLE!");
  });

  it("recovers when the cycle is broken", () => {
    const workbook = new Workbook({ A1: "=B1", B1: "=A1" });
    expect(errorCode(workbook, "A1")).toBe("#CYCLE!");

    workbook.setCell("B1", "5");
    expect(numeric(workbook, "A1")).toBe(5);
    expect(numeric(workbook, "B1")).toBe(5);
  });
});

describe("history", () => {
  it("supports undo and redo across dependent edits", () => {
    const workbook = new Workbook({ A1: "1", A2: "2", B1: "=A1+A2" });
    workbook.setCell("A1", "10");
    expect(numeric(workbook, "B1")).toBe(12);

    expect(workbook.undo()).toBe(true);
    expect(numeric(workbook, "B1")).toBe(3);

    expect(workbook.redo()).toBe(true);
    expect(numeric(workbook, "B1")).toBe(12);
  });

  it("batches multi-cell updates into one history entry", () => {
    const workbook = new Workbook({});
    workbook.setCells(
      [
        { key: "A1", raw: "1" },
        { key: "A2", raw: "2" },
        { key: "A3", raw: "=A1+A2" },
      ],
      "Paste",
    );
    expect(numeric(workbook, "A3")).toBe(3);
    workbook.undo();
    expect(value(workbook, "A3")).toBe(null);
  });
});

describe("selection stats", () => {
  it("summarizes the selected range", () => {
    const workbook = new Workbook({ A1: "1", A2: "2", A3: "text", A4: "=A1+A2" });
    const stats = workbook.getSelectedStats({ start: { row: 0, col: 0 }, end: { row: 3, col: 0 } });
    expect(stats.count).toBe(4);
    expect(stats.numericCount).toBe(3);
    expect(stats.sum).toBe(6);
    expect(stats.average).toBe(2);

    const range = { start: { row: 0, col: 0 }, end: { row: 3, col: 0 } };
    expect(formatRange(range)).toBe("A1:A4");
  });
});
