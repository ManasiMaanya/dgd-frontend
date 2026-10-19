import { useCallback, useMemo, useState } from "react";

import { cellKey, normalizeRange } from "./coordinates";
import { SHEET_COLS, SHEET_ROWS, type CellAddress, type CellRange } from "./types";
import type { Workbook } from "./workbook";

export interface EditingState {
  value: string;
  surface: "cell" | "bar";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampAddress(address: CellAddress): CellAddress {
  return {
    row: clamp(address.row, 0, SHEET_ROWS - 1),
    col: clamp(address.col, 0, SHEET_COLS - 1),
  };
}

export interface SheetState {
  anchor: CellAddress;
  focus: CellAddress;
  selection: CellRange;
  activeAddress: CellAddress;
  activeKey: string;
  editing: EditingState | null;
  selectCell: (row: number, col: number, extend?: boolean) => void;
  setSelection: (anchor: CellAddress, focus: CellAddress) => void;
  selectAll: () => void;
  moveFocus: (deltaRow: number, deltaCol: number, extend?: boolean) => void;
  beginEdit: (surface: "cell" | "bar", initial?: string) => void;
  updateEditing: (value: string) => void;
  commitEdit: (move?: [number, number]) => void;
  cancelEdit: () => void;
}

export function useSheetState(workbook: Workbook): SheetState {
  const [anchor, setAnchor] = useState<CellAddress>({ row: 0, col: 0 });
  const [focus, setFocus] = useState<CellAddress>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<EditingState | null>(null);

  const selection = useMemo(() => normalizeRange({ start: anchor, end: focus }), [anchor, focus]);
  const activeKey = cellKey(anchor.row, anchor.col);

  const selectCell = useCallback((row: number, col: number, extend = false) => {
    const address = clampAddress({ row, col });
    setEditing(null);
    if (extend) {
      setFocus(address);
    } else {
      setAnchor(address);
      setFocus(address);
    }
  }, []);

  const setSelection = useCallback((nextAnchor: CellAddress, nextFocus: CellAddress) => {
    setEditing(null);
    setAnchor(clampAddress(nextAnchor));
    setFocus(clampAddress(nextFocus));
  }, []);

  const selectAll = useCallback(() => {
    setEditing(null);
    setAnchor({ row: 0, col: 0 });
    setFocus({ row: SHEET_ROWS - 1, col: SHEET_COLS - 1 });
  }, []);

  const moveFocus = useCallback(
    (deltaRow: number, deltaCol: number, extend = false) => {
      const base = extend ? focus : anchor;
      const next = clampAddress({ row: base.row + deltaRow, col: base.col + deltaCol });
      if (extend) {
        setFocus(next);
      } else {
        setAnchor(next);
        setFocus(next);
      }
    },
    [anchor, focus],
  );

  const beginEdit = useCallback(
    (surface: "cell" | "bar", initial?: string) => {
      const raw = initial ?? workbook.getRaw(cellKey(anchor.row, anchor.col));
      setEditing({ value: raw, surface });
    },
    [anchor.col, anchor.row, workbook],
  );

  const updateEditing = useCallback((value: string) => {
    setEditing((previous) => (previous ? { ...previous, value } : previous));
  }, []);

  const commitEdit = useCallback(
    (move?: [number, number]) => {
      if (editing) {
        workbook.setCell(activeKey, editing.value);
      }
      setEditing(null);
      if (move) moveFocus(move[0], move[1]);
    },
    [activeKey, editing, moveFocus, workbook],
  );

  const cancelEdit = useCallback(() => setEditing(null), []);

  return {
    anchor,
    focus,
    selection,
    activeAddress: anchor,
    activeKey,
    editing,
    selectCell,
    setSelection,
    selectAll,
    moveFocus,
    beginEdit,
    updateEditing,
    commitEdit,
    cancelEdit,
  };
}
