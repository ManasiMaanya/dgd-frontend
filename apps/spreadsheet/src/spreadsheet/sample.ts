/**
 * A small starter workbook that exercises arithmetic, ranges, nested calls,
 * conditionals, aggregation, and every lookup function in the engine.
 */
export const SAMPLE_CELLS: Record<string, string> = {
  A1: "Region",
  B1: "Units",
  C1: "Unit price",
  D1: "Revenue",
  E1: "Status",

  A2: "North",
  B2: "1280",
  C2: "18.5",
  D2: "=B2*C2",
  E2: '=IF(D2>20000, "Strong", "Watch")',

  A3: "South",
  B3: "940",
  C3: "22",
  D3: "=B3*C3",
  E3: '=IF(D3>20000, "Strong", "Watch")',

  A4: "East",
  B4: "1560",
  C4: "15.75",
  D4: "=B4*C4",
  E4: '=IF(D4>20000, "Strong", "Watch")',

  A5: "West",
  B5: "1120",
  C5: "19.2",
  D5: "=B5*C5",
  E5: '=IF(D5>20000, "Strong", "Watch")',

  A6: "Central",
  B6: "870",
  C6: "24.5",
  D6: "=B6*C6",
  E6: '=IF(D6>20000, "Strong", "Watch")',

  A7: "Coastal",
  B7: "640",
  C7: "28",
  D7: "=B7*C7",
  E7: '=IF(D7>20000, "Strong", "Watch")',

  A9: "Total revenue",
  D9: "=SUM(D2:D7)",

  A10: "Average revenue",
  D10: "=ROUND(AVERAGE(D2:D7), 2)",

  A11: "Best region",
  D11: "=INDEX(A2:A7, MATCH(MAX(D2:D7), D2:D7, 0))",

  A12: "North check",
  D12: '=VLOOKUP("North", A2:D7, 4, FALSE)',

  A13: "Regions over 1,000 units",
  D13: '=COUNTIF(B2:B7, ">1000")',

  A14: "Row labels",
  D14: '=TEXTJOIN(", ", TRUE, A2:A5)',
};

export const SAMPLE_TITLE = "Regional revenue model";
