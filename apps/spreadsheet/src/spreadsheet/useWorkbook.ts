import { useEffect, useReducer, useState } from "react";

import { SAMPLE_CELLS } from "./sample";
import { Workbook } from "./workbook";

/**
 * Owns a single Workbook instance for the lifetime of the component tree and
 * re-renders subscribers whenever the workbook publishes a change.
 */
export function useWorkbook(initial: Record<string, string> = SAMPLE_CELLS): Workbook {
  const [workbook] = useState(() => new Workbook(initial));
  const [, forceRender] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    return workbook.subscribe(forceRender);
  }, [workbook]);

  return workbook;
}
