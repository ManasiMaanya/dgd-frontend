import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cellKey, columnName, isCellInRange, normalizeRange } from "../../spreadsheet/coordinates";
import { formatValue } from "../../spreadsheet/diagnostics";
import { buildFillUpdates } from "../../spreadsheet/fill";
import { SHEET_COLS, SHEET_ROWS, isFormulaError, type CellAddress, type CellRange } from "../../spreadsheet/types";
import type { SheetState } from "../../spreadsheet/useSheetState";
import type { Workbook } from "../../spreadsheet/workbook";

const ROW_HEIGHT = 27;
const COL_WIDTH = 104;
const OVERSCAN = 6;

interface SheetGridProps {
  workbook: Workbook;
  state: SheetState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function unionRange(a: CellRange, b: CellRange): CellRange {
  return normalizeRange({
    start: { row: Math.min(a.start.row, b.start.row), col: Math.min(a.start.col, b.start.col) },
    end: { row: Math.max(a.end.row, b.end.row), col: Math.max(a.end.col, b.end.col) },
  });
}

function computeFillTarget(source: CellRange, pointer: CellAddress): CellRange | null {
  const downOver = pointer.row > source.end.row ? pointer.row - source.end.row : 0;
  const upOver = pointer.row < source.start.row ? source.start.row - pointer.row : 0;
  const rightOver = pointer.col > source.end.col ? pointer.col - source.end.col : 0;
  const leftOver = pointer.col < source.start.col ? source.start.col - pointer.col : 0;

  const vertical = Math.max(downOver, upOver);
  const horizontal = Math.max(rightOver, leftOver);

  if (vertical === 0 && horizontal === 0) return null;

  if (vertical >= horizontal) {
    const rows = downOver > 0 ? { start: source.end.row + 1, end: pointer.row } : { start: pointer.row, end: source.start.row - 1 };
    return normalizeRange({
      start: { row: rows.start, col: source.start.col },
      end: { row: rows.end, col: source.end.col },
    });
  }

  const cols = rightOver > 0 ? { start: source.end.col + 1, end: pointer.col } : { start: pointer.col, end: source.start.col - 1 };
  return normalizeRange({
    start: { row: source.start.row, col: cols.start },
    end: { row: source.end.row, col: cols.end },
  });
}

export function SheetGrid({ workbook, state }: SheetGridProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLInputElement | null>(null);
  const internalClipboard = useRef<string[][]>([]);
  const editingRef = useRef(state.editing);
  useLayoutEffect(() => {
    editingRef.current = state.editing;
  }, [state.editing]);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewport, setViewport] = useState({ width: 900, height: 460 });
  const [dragging, setDragging] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillTarget, setFillTarget] = useState<CellRange | null>(null);

  const { selection, anchor } = state;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    setViewport({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  const { startRow, endRow, startCol, endCol } = useMemo(() => {
    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const lastRow = Math.min(SHEET_ROWS - 1, Math.ceil((scrollTop + viewport.height) / ROW_HEIGHT) + OVERSCAN);
    const firstCol = Math.max(0, Math.floor(scrollLeft / COL_WIDTH) - 1);
    const lastCol = Math.min(SHEET_COLS - 1, Math.ceil((scrollLeft + viewport.width) / COL_WIDTH) + 1);
    return { startRow: firstRow, endRow: lastRow, startCol: firstCol, endCol: lastCol };
  }, [scrollLeft, scrollTop, viewport.height, viewport.width]);

  useEffect(() => {
    if (state.editing?.surface !== "cell") return;
    const input = editorRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [state.editing?.surface, state.activeKey]);

  const restoreGridFocus = useCallback(() => {
    requestAnimationFrame(() => viewportRef.current?.focus());
  }, []);

  const cellFromPoint = useCallback((clientX: number, clientY: number): CellAddress | null => {
    const element = viewportRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left + element.scrollLeft;
    const y = clientY - rect.top + element.scrollTop;
    if (x < 0 || y < 0) return null;
    return {
      row: clamp(Math.floor(y / ROW_HEIGHT), 0, SHEET_ROWS - 1),
      col: clamp(Math.floor(x / COL_WIDTH), 0, SHEET_COLS - 1),
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: MouseEvent) => {
      const cell = cellFromPoint(event.clientX, event.clientY);
      if (cell) state.selectCell(cell.row, cell.col, true);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [cellFromPoint, dragging, state]);

  useEffect(() => {
    if (!filling) return;
    const onMove = (event: MouseEvent) => {
      const cell = cellFromPoint(event.clientX, event.clientY);
      if (cell) setFillTarget(computeFillTarget(selection, cell));
    };
    const onUp = () => {
      const target = fillTarget;
      if (target) {
        const updates = buildFillUpdates(workbook, selection, target);
        if (updates.length > 0) {
          workbook.setCells(updates, "Fill");
          const merged = unionRange(selection, target);
          state.setSelection(merged.start, merged.end);
        }
      }
      setFilling(false);
      setFillTarget(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [cellFromPoint, fillTarget, filling, selection, state, workbook]);

  const getSelectionMatrix = useCallback((): string[][] => {
    const matrix: string[][] = [];
    for (let row = selection.start.row; row <= selection.end.row; row += 1) {
      const line: string[] = [];
      for (let col = selection.start.col; col <= selection.end.col; col += 1) {
        line.push(workbook.getRaw(cellKey(row, col)));
      }
      matrix.push(line);
    }
    return matrix;
  }, [selection, workbook]);

  const copySelection = useCallback(() => {
    const matrix = getSelectionMatrix();
    internalClipboard.current = matrix;
    const text = matrix.map((line) => line.join("\t")).join("\n");
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  }, [getSelectionMatrix]);

  const pasteMatrix = useCallback(
    (matrix: string[][]) => {
      const updates = [];
      for (let row = 0; row < matrix.length; row += 1) {
        for (let col = 0; col < matrix[row].length; col += 1) {
          const targetRow = anchor.row + row;
          const targetCol = anchor.col + col;
          if (targetRow >= SHEET_ROWS || targetCol >= SHEET_COLS) continue;
          updates.push({ key: cellKey(targetRow, targetCol), raw: matrix[row][col] });
        }
      }
      if (updates.length === 0) return;
      workbook.setCells(updates, "Paste");
      const maxCols = Math.max(...matrix.map((line) => line.length));
      state.setSelection(anchor, {
        row: Math.min(SHEET_ROWS - 1, anchor.row + matrix.length - 1),
        col: Math.min(SHEET_COLS - 1, anchor.col + maxCols - 1),
      });
    },
    [anchor, state, workbook],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const meta = event.ctrlKey || event.metaKey;

      if (meta && (event.key === "z" || event.key === "Z")) {
        event.preventDefault();
        if (event.shiftKey) workbook.redo();
        else workbook.undo();
        return;
      }
      if (meta && (event.key === "y" || event.key === "Y")) {
        event.preventDefault();
        workbook.redo();
        return;
      }
      if (meta && (event.key === "c" || event.key === "C")) {
        event.preventDefault();
        copySelection();
        return;
      }
      if (meta && (event.key === "x" || event.key === "X")) {
        event.preventDefault();
        copySelection();
        workbook.clearRange(selection);
        return;
      }
      if (meta && (event.key === "a" || event.key === "A")) {
        event.preventDefault();
        state.selectAll();
        return;
      }
      if (meta && (event.key === "v" || event.key === "V")) {
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          state.moveFocus(-1, 0, event.shiftKey);
          return;
        case "ArrowDown":
          event.preventDefault();
          state.moveFocus(1, 0, event.shiftKey);
          return;
        case "ArrowLeft":
          event.preventDefault();
          state.moveFocus(0, -1, event.shiftKey);
          return;
        case "ArrowRight":
          event.preventDefault();
          state.moveFocus(0, 1, event.shiftKey);
          return;
        case "Tab":
          event.preventDefault();
          state.moveFocus(0, event.shiftKey ? -1 : 1);
          return;
        case "Enter":
          event.preventDefault();
          state.moveFocus(event.shiftKey ? -1 : 1, 0);
          return;
        case "F2":
          event.preventDefault();
          state.beginEdit("cell");
          return;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          workbook.clearRange(selection);
          return;
        case "Escape":
          state.cancelEdit();
          return;
        default:
          break;
      }

      if (event.key.length === 1 && !meta && !event.altKey) {
        event.preventDefault();
        const current = editingRef.current;
        if (current && current.surface === "cell") {
          state.updateEditing(current.value + event.key);
        } else {
          state.beginEdit("cell", event.key);
        }
      }
    },
    [copySelection, selection, state, workbook],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(".sheet-cell");
      if (!target) return;
      if (editingRef.current) state.commitEdit();
      const row = Number(target.dataset.row);
      const col = Number(target.dataset.col);
      state.selectCell(row, col, event.shiftKey);
      setDragging(true);
      viewportRef.current?.focus();
    },
    [state],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(".sheet-cell");
      if (!target) return;
      const row = Number(target.dataset.row);
      const col = Number(target.dataset.col);
      state.selectCell(row, col);
      state.beginEdit("cell");
    },
    [state],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const text = event.clipboardData.getData("text");
      if (text) {
        event.preventDefault();
        const matrix = text
          .replace(/\r/g, "")
          .split("\n")
          .filter((line, index, all) => !(index === all.length - 1 && line === ""))
          .map((line) => line.split("\t"));
        pasteMatrix(matrix);
        return;
      }
      if (internalClipboard.current.length > 0) {
        event.preventDefault();
        pasteMatrix(internalClipboard.current);
      }
    },
    [pasteMatrix],
  );

  const previewRange = fillTarget ? unionRange(selection, fillTarget) : selection;

  const cells: React.ReactNode[] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const key = cellKey(row, col);
      const value = workbook.getComputed(key);
      const selected = isCellInRange({ row, col }, previewRange);
      const isActive = row === anchor.row && col === anchor.col;
      const error = isFormulaError(value);
      const className = [
        "sheet-cell",
        typeof value === "number" ? "is-number" : "",
        typeof value === "boolean" ? "is-boolean" : "",
        error ? "is-error" : "",
        selected ? "is-selected" : "",
        isActive ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" ");

      cells.push(
        <div
          key={key}
          className={className}
          data-row={row}
          data-col={col}
          role="gridcell"
          title={error ? `${(value as { message: string }).message} ${(value as { suggestion?: string }).suggestion ?? ""}` : undefined}
          style={{ top: row * ROW_HEIGHT, left: col * COL_WIDTH, width: COL_WIDTH, height: ROW_HEIGHT }}
        >
          {formatValue(value)}
        </div>,
      );
    }
  }

  const rowIndices = Array.from({ length: endRow - startRow + 1 }, (_, offset) => startRow + offset);
  const colIndices = Array.from({ length: endCol - startCol + 1 }, (_, offset) => startCol + offset);

  const rowHeaders = rowIndices.map((row) => {
    const active = row >= selection.start.row && row <= selection.end.row;
    return (
      <div
        key={row}
        className={`sheet-rowhead-cell${active ? " is-active" : ""}`}
        style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}
        onClick={() => state.setSelection({ row, col: 0 }, { row, col: SHEET_COLS - 1 })}
      >
        {row + 1}
      </div>
    );
  });

  const colHeaders = colIndices.map((col) => {
    const active = col >= selection.start.col && col <= selection.end.col;
    return (
      <div
        key={col}
        className={`sheet-colhead-cell${active ? " is-active" : ""}`}
        style={{ left: col * COL_WIDTH, width: COL_WIDTH }}
        onClick={() => state.setSelection({ row: 0, col }, { row: SHEET_ROWS - 1, col })}
      >
        {columnName(col)}
      </div>
    );
  });

  const selectionStyle = {
    top: selection.start.row * ROW_HEIGHT,
    left: selection.start.col * COL_WIDTH,
    width: (selection.end.col - selection.start.col + 1) * COL_WIDTH,
    height: (selection.end.row - selection.start.row + 1) * ROW_HEIGHT,
  };

  return (
    <div className="sheet">
      <div className="sheet-corner" />
      <div className="sheet-colhead-wrap">
        <div
          className="sheet-colhead"
          style={{ transform: `translateX(${-scrollLeft}px)`, width: SHEET_COLS * COL_WIDTH }}
        >
          {colHeaders}
        </div>
      </div>
      <div className="sheet-rowhead-wrap">
        <div
          className="sheet-rowhead"
          style={{ transform: `translateY(${-scrollTop}px)`, height: SHEET_ROWS * ROW_HEIGHT }}
        >
          {rowHeaders}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="sheet-viewport"
        role="grid"
        tabIndex={0}
        aria-label="Workbook grid"
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
          setScrollLeft(event.currentTarget.scrollLeft);
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onPaste={handlePaste}
      >
        <div
          className="sheet-canvas"
          style={{
            width: SHEET_COLS * COL_WIDTH,
            height: SHEET_ROWS * ROW_HEIGHT,
          }}
        >
          {cells}

          <div className="sheet-selection" style={selectionStyle} />
          <div
            className="sheet-selection-handle"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFilling(true);
              setFillTarget(null);
            }}
            style={{
              top: (selection.end.row + 1) * ROW_HEIGHT - 5,
              left: (selection.end.col + 1) * COL_WIDTH - 5,
            }}
          />

          {state.editing?.surface === "cell" ? (
            <input
              ref={editorRef}
              className="sheet-cell-editor"
              autoFocus
              value={state.editing.value}
              style={{
                top: anchor.row * ROW_HEIGHT,
                left: anchor.col * COL_WIDTH,
                width: Math.max(COL_WIDTH, state.editing.value.length * 8 + 24),
                height: ROW_HEIGHT,
              }}
              onChange={(event) => state.updateEditing(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  state.commitEdit([event.shiftKey ? -1 : 1, 0]);
                  restoreGridFocus();
                } else if (event.key === "Tab") {
                  event.preventDefault();
                  state.commitEdit([0, event.shiftKey ? -1 : 1]);
                  restoreGridFocus();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  state.cancelEdit();
                  restoreGridFocus();
                }
              }}
              onBlur={() => {
                if (editingRef.current) state.commitEdit();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
