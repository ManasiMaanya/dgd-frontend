import { parseReference, type ParsedReference } from "./coordinates";
import type { CellErrorCode } from "./types";

export type TokenType =
  | "number"
  | "string"
  | "cell"
  | "identifier"
  | "boolean"
  | "operator"
  | "lparen"
  | "rparen"
  | "comma"
  | "colon"
  | "percent"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  reference?: ParsedReference;
}

export class FormulaSyntaxError extends Error {
  readonly position: number;
  readonly length: number;
  readonly suggestion?: string;
  readonly code: CellErrorCode;

  constructor(
    message: string,
    position: number,
    options: { length?: number; suggestion?: string; code?: CellErrorCode } = {},
  ) {
    super(message);
    this.name = "FormulaSyntaxError";
    this.position = position;
    this.length = options.length ?? 1;
    this.suggestion = options.suggestion;
    this.code = options.code ?? "#PARSE!";
  }
}

const CELL_PATTERN = /^\$?[A-Za-z]{1,3}\$?\d{1,7}$/;

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isLetter(char: string): boolean {
  return (char >= "A" && char <= "Z") || (char >= "a" && char <= "z");
}

function isCellStart(char: string): boolean {
  return char === "$" || isLetter(char);
}

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      index += 1;
      continue;
    }

    if (char === '"') {
      const start = index;
      index += 1;
      let text = "";
      let closed = false;

      while (index < expression.length) {
        const current = expression[index];
        if (current === '"') {
          if (expression[index + 1] === '"') {
            text += '"';
            index += 2;
            continue;
          }
          closed = true;
          index += 1;
          break;
        }
        text += current;
        index += 1;
      }

      if (!closed) {
        throw new FormulaSyntaxError("Unterminated text value.", start, {
          length: expression.length - start,
          suggestion: 'Add a closing double quote (") after the text.',
        });
      }

      tokens.push({ type: "string", value: text, start, end: index });
      continue;
    }

    if (isDigit(char) || (char === "." && isDigit(expression[index + 1] ?? ""))) {
      const start = index;
      let seenDot = false;

      while (index < expression.length) {
        const current = expression[index];
        if (isDigit(current)) {
          index += 1;
          continue;
        }
        if (current === "." && !seenDot) {
          seenDot = true;
          index += 1;
          continue;
        }
        if ((current === "e" || current === "E") && index > start) {
          const next = expression[index + 1];
          const afterSign = expression[index + 2];
          if (isDigit(next ?? "") || ((next === "+" || next === "-") && isDigit(afterSign ?? ""))) {
            index += next === "+" || next === "-" ? 2 : 1;
            while (index < expression.length && isDigit(expression[index])) index += 1;
          }
        }
        break;
      }

      tokens.push({ type: "number", value: expression.slice(start, index), start, end: index });
      continue;
    }

    if (isCellStart(char)) {
      const start = index;
      let cursor = index;

      if (expression[cursor] === "$") cursor += 1;
      while (cursor < expression.length && isLetter(expression[cursor])) cursor += 1;
      if (expression[cursor] === "$") cursor += 1;
      while (cursor < expression.length && isDigit(expression[cursor])) cursor += 1;

      const value = expression.slice(start, cursor);
      const nextNonSpace = expression.slice(cursor).match(/^\s*(.)/)?.[1] ?? "";
      const looksLikeReference = CELL_PATTERN.test(value);

      if (looksLikeReference && nextNonSpace !== "(") {
        tokens.push({
          type: "cell",
          value,
          start,
          end: cursor,
          reference: parseReference(value) ?? undefined,
        });
      } else {
        tokens.push({ type: "identifier", value, start, end: cursor });
      }

      index = cursor;
      continue;
    }

    const twoChar = expression.slice(index, index + 2);
    if (twoChar === "<=" || twoChar === ">=" || twoChar === "<>") {
      tokens.push({ type: "operator", value: twoChar, start: index, end: index + 2 });
      index += 2;
      continue;
    }

    if ("+-*/^&=<>".includes(char)) {
      tokens.push({ type: "operator", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ":") {
      tokens.push({ type: "colon", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === "%") {
      tokens.push({ type: "percent", value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    throw new FormulaSyntaxError(`Unexpected character "${char}".`, index, {
      suggestion: `Remove "${char}" or replace it with a valid operator.`,
    });
  }

  tokens.push({ type: "eof", value: "", start: expression.length, end: expression.length });
  return tokens;
}
