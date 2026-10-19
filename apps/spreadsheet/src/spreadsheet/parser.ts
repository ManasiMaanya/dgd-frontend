import { parseReference, type ParsedReference } from "./coordinates";
import { FormulaSyntaxError, tokenize, type Token } from "./tokenizer";

export interface BaseNode {
  start: number;
  end: number;
}

export interface NumberNode extends BaseNode {
  kind: "number";
  value: number;
}

export interface StringNode extends BaseNode {
  kind: "string";
  value: string;
}

export interface BooleanNode extends BaseNode {
  kind: "boolean";
  value: boolean;
}

export interface CellNode extends BaseNode {
  kind: "cell";
  row: number;
  col: number;
  label: string;
  absoluteRow: boolean;
  absoluteCol: boolean;
  reference: ParsedReference | null;
}

export interface RangeNode extends BaseNode {
  kind: "range";
  startCell: CellNode;
  endCell: CellNode;
}

export interface UnaryNode extends BaseNode {
  kind: "unary";
  operator: "+" | "-";
  operand: Node;
}

export interface BinaryNode extends BaseNode {
  kind: "binary";
  operator: "+" | "-" | "*" | "/" | "^" | "&" | "=" | "<>" | "<" | ">" | "<=" | ">=";
  left: Node;
  right: Node;
}

export interface PercentNode extends BaseNode {
  kind: "percent";
  operand: Node;
}

export interface FunctionNode extends BaseNode {
  kind: "function";
  name: string;
  args: Node[];
}

export interface NameNode extends BaseNode {
  kind: "name";
  name: string;
}

export type Node =
  | NumberNode
  | StringNode
  | BooleanNode
  | CellNode
  | RangeNode
  | UnaryNode
  | BinaryNode
  | PercentNode
  | FunctionNode
  | NameNode;

export interface ParseSuccess {
  ok: true;
  ast: Node;
}

export interface ParseFailure {
  ok: false;
  error: FormulaSyntaxError;
}

export type ParseResult = ParseSuccess | ParseFailure;

const COMPARISON_OPERATORS = new Set(["=", "<>", "<", ">", "<=", ">="]);

/**
 * Recursive-descent parser for spreadsheet expressions.
 * The caller strips the leading "=" before parsing; positions are relative to
 * the expression body and re-based by the engine when a diagnostic is built.
 */
export function parseExpression(expression: string): ParseResult {
  try {
    const tokens = tokenize(expression);
    const parser = new Parser(expression, tokens);
    const ast = parser.parse();
    return { ok: true, ast };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { ok: false, error };
    }
    throw error;
  }
}

class Parser {
  private index = 0;
  private readonly source: string;
  private readonly tokens: Token[];

  constructor(source: string, tokens: Token[]) {
    this.source = source;
    this.tokens = tokens;
  }

  parse(): Node {
    if (this.peek().type === "eof") {
      throw new FormulaSyntaxError("The formula is empty.", 0, {
        length: 0,
        suggestion: "Enter a value or a formula after the equals sign.",
      });
    }

    const node = this.parseComparison();
    const next = this.peek();

    if (next.type !== "eof") {
      throw new FormulaSyntaxError(`Unexpected "${next.value}".`, next.start, {
        length: Math.max(1, next.end - next.start),
        suggestion: "Check for a missing operator or an extra value.",
      });
    }

    return node;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const token = this.tokens[this.index];
    if (this.index < this.tokens.length - 1) this.index += 1;
    return token;
  }

  private match(type: Token["type"], value?: string): boolean {
    const token = this.peek();
    return token.type === type && (value === undefined || token.value === value);
  }

  private parseComparison(): Node {
    let left = this.parseConcat();

    while (this.match("operator") && COMPARISON_OPERATORS.has(this.peek().value)) {
      const operator = this.advance();
      const right = this.parseConcat();
      left = {
        kind: "binary",
        operator: operator.value as BinaryNode["operator"],
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }

    return left;
  }

  private parseConcat(): Node {
    let left = this.parseAdditive();

    while (this.match("operator", "&")) {
      this.advance();
      const right = this.parseAdditive();
      left = {
        kind: "binary",
        operator: "&",
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }

    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();

    while (this.match("operator") && (this.peek().value === "+" || this.peek().value === "-")) {
      const operator = this.advance();
      const right = this.parseMultiplicative();
      left = {
        kind: "binary",
        operator: operator.value as "+" | "-",
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }

    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parsePower();

    while (this.match("operator") && (this.peek().value === "*" || this.peek().value === "/")) {
      const operator = this.advance();
      const right = this.parsePower();
      left = {
        kind: "binary",
        operator: operator.value as "*" | "/",
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }

    return left;
  }

  private parsePower(): Node {
    const left = this.parseUnary();

    if (this.match("operator", "^")) {
      this.advance();
      const right = this.parsePower();
      return {
        kind: "binary",
        operator: "^",
        left,
        right,
        start: left.start,
        end: right.end,
      };
    }

    return left;
  }

  private parseUnary(): Node {
    if (this.match("operator") && (this.peek().value === "+" || this.peek().value === "-")) {
      const operator = this.advance();
      const operand = this.parseUnary();
      return {
        kind: "unary",
        operator: operator.value as "+" | "-",
        operand,
        start: operator.start,
        end: operand.end,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();

    while (this.match("percent")) {
      const token = this.advance();
      node = {
        kind: "percent",
        operand: node,
        start: node.start,
        end: token.end,
      };
    }

    return node;
  }

  private parsePrimary(): Node {
    const token = this.peek();

    if (token.type === "number") {
      this.advance();
      return {
        kind: "number",
        value: Number(token.value),
        start: token.start,
        end: token.end,
      };
    }

    if (token.type === "string") {
      this.advance();
      return {
        kind: "string",
        value: token.value,
        start: token.start,
        end: token.end,
      };
    }

    if (token.type === "cell") {
      this.advance();
      const reference = token.reference ?? parseReference(token.value);

      if (!reference) {
        throw new FormulaSyntaxError(`Invalid cell reference "${token.value}".`, token.start, {
          length: token.end - token.start,
          suggestion: "Use a reference such as A1 or $B$2.",
          code: "#REF!",
        });
      }

      const cell: CellNode = {
        kind: "cell",
        row: reference.row,
        col: reference.col,
        label: reference.label,
        absoluteRow: reference.absoluteRow,
        absoluteCol: reference.absoluteCol,
        reference,
        start: token.start,
        end: token.end,
      };

      if (this.match("colon")) {
        this.advance();
        const endToken = this.peek();

        if (endToken.type !== "cell") {
          throw new FormulaSyntaxError("A range needs a second cell reference.", endToken.start, {
            length: Math.max(1, endToken.end - endToken.start),
            suggestion: "Add an end cell such as B10.",
            code: "#REF!",
          });
        }

        this.advance();
        const endReference = endToken.reference ?? parseReference(endToken.value);

        if (!endReference) {
          throw new FormulaSyntaxError(
            `Invalid cell reference "${endToken.value}".`,
            endToken.start,
            {
              length: endToken.end - endToken.start,
              suggestion: "Use a reference such as A1 or $B$2.",
              code: "#REF!",
            },
          );
        }

        const endCell: CellNode = {
          kind: "cell",
          row: endReference.row,
          col: endReference.col,
          label: endReference.label,
          absoluteRow: endReference.absoluteRow,
          absoluteCol: endReference.absoluteCol,
          reference: endReference,
          start: endToken.start,
          end: endToken.end,
        };

        return {
          kind: "range",
          startCell: cell,
          endCell,
          start: cell.start,
          end: endCell.end,
        };
      }

      return cell;
    }

    if (token.type === "identifier") {
      this.advance();
      const upper = token.value.toUpperCase();

      if (upper === "TRUE" || upper === "FALSE") {
        return {
          kind: "boolean",
          value: upper === "TRUE",
          start: token.start,
          end: token.end,
        };
      }

      if (this.match("lparen")) {
        return this.parseFunctionCall(token);
      }

      return {
        kind: "name",
        name: token.value,
        start: token.start,
        end: token.end,
      };
    }

    if (token.type === "lparen") {
      const open = this.advance();
      const inner = this.parseComparison();

      if (!this.match("rparen")) {
        const next = this.peek();
        throw new FormulaSyntaxError("Missing closing parenthesis.", next.start, {
          length: next.type === "eof" ? 0 : next.end - next.start,
          suggestion: "Add a ')' to close the group.",
        });
      }

      this.advance();
      return { ...inner, start: open.start, end: this.tokens[this.index - 1].end };
    }

    if (token.type === "rparen") {
      throw new FormulaSyntaxError("Unexpected closing parenthesis.", token.start, {
        length: 1,
        suggestion: "Remove ')' or add the matching '(' earlier.",
      });
    }

    if (token.type === "comma") {
      throw new FormulaSyntaxError("Missing a value before the comma.", token.start, {
        length: 1,
        suggestion: "Add a value before the comma or remove it.",
      });
    }

    if (token.type === "eof") {
      throw new FormulaSyntaxError("The formula ends unexpectedly.", token.start, {
        length: 0,
        suggestion: "Complete the expression after the operator.",
      });
    }

    throw new FormulaSyntaxError(`Unexpected "${token.value}".`, token.start, {
      length: Math.max(1, token.end - token.start),
    });
  }

  private parseFunctionCall(nameToken: Token): Node {
    const name = nameToken.value.toUpperCase();
    this.advance();
    const args: Node[] = [];

    if (!this.match("rparen")) {
      while (true) {
        if (this.match("comma")) {
          const comma = this.advance();
          throw new FormulaSyntaxError("Missing a function argument before the comma.", comma.start, {
            length: 1,
            suggestion: "Add an argument or remove the extra comma.",
            code: "#ARGS!",
          });
        }

        args.push(this.parseComparison());

        if (this.match("comma")) {
          this.advance();
          continue;
        }
        break;
      }
    }

    if (!this.match("rparen")) {
      const next = this.peek();
      const atEnd = next.type === "eof";
      throw new FormulaSyntaxError("Missing closing parenthesis.", atEnd ? this.source.length : next.start, {
        length: atEnd ? 0 : next.end - next.start,
        suggestion: "Add ')' at the end of the formula.",
      });
    }

    const close = this.advance();

    return {
      kind: "function",
      name,
      args,
      start: nameToken.start,
      end: close.end,
    };
  }
}

export function collectReferences(node: Node): { cells: CellNode[]; hasRange: boolean } {
  const cells: CellNode[] = [];
  let hasRange = false;

  const walk = (current: Node): void => {
    switch (current.kind) {
      case "cell":
        cells.push(current);
        break;
      case "range":
        hasRange = true;
        cells.push(current.startCell, current.endCell);
        break;
      case "unary":
        walk(current.operand);
        break;
      case "percent":
        walk(current.operand);
        break;
      case "binary":
        walk(current.left);
        walk(current.right);
        break;
      case "function":
        current.args.forEach(walk);
        break;
      default:
        break;
    }
  };

  walk(node);
  return { cells, hasRange };
}
