import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * Calculator Tool - Evaluates mathematical expressions
 */
const calculatorTool: MCPTool = {
  name: 'calculator',
  description: 'Math calculator tool that evaluates mathematical expressions. Supports +, -, *, /, //, %, ** operators and pi, e constants.',
  version: '2.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'evaluate',
        description: 'Evaluate a mathematical expression. Supports operators: +, -, *, /, // (floor div), % (mod), ** or ^ (power). Supports constants: pi, e. Supports math functions: sin, cos, tan, sqrt, abs, log, log10, exp, floor, ceil, round.',
        inputSchema: {
          expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4", "pi * 2", "sqrt(16)", "2^10")'),
        },
        handler: async (params) => {
          const { expression } = params as { expression: string };
          const result = evaluateExpression(expression);
          return { expression, result };
        },
      },
    ];
  },

  async initialize() {
    // No initialization required
  },

  async healthCheck() {
    return true;
  },
};

/**
 * Allowed constants
 */
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E,
};

/**
 * Allowed math functions
 */
const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  trunc: Math.trunc,
  sign: Math.sign,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
};

/**
 * Token types for lexer
 */
type TokenType = 'NUMBER' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
}

/**
 * Tokenize the expression
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number (including decimals)
    if (/\d/.test(char) || (char === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }

    // Identifier (function names, constants)
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: ident });
      continue;
    }

    // Two-character operators
    if (i + 1 < expr.length) {
      const twoChar = expr.slice(i, i + 2);
      if (twoChar === '**' || twoChar === '//') {
        tokens.push({ type: 'OPERATOR', value: twoChar });
        i += 2;
        continue;
      }
    }

    // Single-character operators and parentheses
    if ('+-*/%^'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

/**
 * Recursive descent parser and evaluator
 */
class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private consume(expectedType?: TokenType): Token {
    const token = this.current();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${token.type}`);
    }
    this.pos++;
    return token;
  }

  parse(): number {
    const result = this.parseExpression();
    if (this.current().type !== 'EOF') {
      throw new Error('Unexpected token after expression');
    }
    return result;
  }

  // Expression: Term (('+' | '-') Term)*
  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.current().type === 'OPERATOR' &&
           (this.current().value === '+' || this.current().value === '-')) {
      const op = this.consume().value as string;
      const right = this.parseTerm();
      left = op === '+' ? left + right : left - right;
    }

    return left;
  }

  // Term: Power (('*' | '/' | '//' | '%') Power)*
  private parseTerm(): number {
    let left = this.parsePower();

    while (this.current().type === 'OPERATOR' &&
           ['*', '/', '//', '%'].includes(this.current().value as string)) {
      const op = this.consume().value as string;
      const right = this.parsePower();

      switch (op) {
        case '*':
          left = left * right;
          break;
        case '/':
          if (right === 0) throw new Error('Division by zero');
          left = left / right;
          break;
        case '//':
          if (right === 0) throw new Error('Division by zero');
          left = Math.floor(left / right);
          break;
        case '%':
          if (right === 0) throw new Error('Modulo by zero');
          left = left % right;
          break;
      }
    }

    return left;
  }

  // Power: Unary (('**' | '^') Power)?  (right associative)
  private parsePower(): number {
    const base = this.parseUnary();

    if (this.current().type === 'OPERATOR' &&
        (this.current().value === '**' || this.current().value === '^')) {
      this.consume();
      const exp = this.parsePower(); // Right associative
      return Math.pow(base, exp);
    }

    return base;
  }

  // Unary: ('-' | '+') Unary | Primary
  private parseUnary(): number {
    if (this.current().type === 'OPERATOR' && this.current().value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    if (this.current().type === 'OPERATOR' && this.current().value === '+') {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  // Primary: NUMBER | IDENTIFIER | IDENTIFIER '(' args ')' | '(' Expression ')'
  private parsePrimary(): number {
    const token = this.current();

    // Number
    if (token.type === 'NUMBER') {
      this.consume();
      return token.value as number;
    }

    // Identifier (constant or function)
    if (token.type === 'IDENTIFIER') {
      const name = this.consume().value as string;

      // Function call
      if (this.current().type === 'LPAREN') {
        this.consume(); // consume '('
        const args: number[] = [];

        if (this.current().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.current().type === 'COMMA') {
            this.consume(); // consume ','
            args.push(this.parseExpression());
          }
        }

        this.consume('RPAREN');

        const func = FUNCTIONS[name];
        if (!func) {
          throw new Error(`Unknown function: ${name}`);
        }
        return func(...args);
      }

      // Constant
      if (name in CONSTANTS) {
        return CONSTANTS[name];
      }

      throw new Error(`Unknown identifier: ${name}`);
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.consume();
      const result = this.parseExpression();
      this.consume('RPAREN');
      return result;
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }
}

/**
 * Evaluate a mathematical expression
 */
function evaluateExpression(expression: string): number {
  // Normalize operators
  let normalized = expression
    .replace(/\^/g, '**')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  // Handle implicit multiplication: 2pi -> 2*pi, 2(3) -> 2*(3)
  normalized = normalized
    .replace(/(\d)([a-zA-Z])/g, '$1*$2')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/\)([a-zA-Z])/g, ')*$1');

  const tokens = tokenize(normalized);
  const parser = new Parser(tokens);
  const result = parser.parse();

  // Handle floating point precision issues
  if (Math.abs(result) < 1e-10) {
    return 0;
  }

  return result;
}

export default calculatorTool;
