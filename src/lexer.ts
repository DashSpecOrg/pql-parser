import { LexerError } from "./exceptions";
import { SourceLocation, Token } from "./types";

/**
 * Lexer for tokenizing PQL queries
 */
export class Lexer {
    private _position: number;
    private _line: number;
    private _column: number;

    constructor(private readonly _input: string) {
        this._position = 0;
        this._line = 1;
        this._column = 1;
    }

    /**
     * Retrieves the current position of the lexer
     */
    public get currentPosition(): number {
        return this._position;
    }

    /**
     * Retrieves the current line number
     */
    public get currentLine(): number {
        return this._line;
    }

    /**
     * Retrieves the current column number
     */
    public get currentColumn(): number {
        return this._column;
    }

    /**
     * Retrieves the current char of the lexer
     */
    public get currentChar(): string | undefined {
        return this._input[this._position];
    }

    /**
     * Gets the current source location
     */
    public getLocation(): SourceLocation {
        return {
            line: this._line,
            column: this._column,
            offset: this._position
        };
    }

    /**
     * Peeks at the next character without advancing
     */
    public peek(): string | null {
        const peekPosition = this._position + 1;
        if (peekPosition >= this._input.length) {
            return null;
        }
        return this._input[peekPosition];
    }

    /**
     * Peeks at a character at a specific offset
     */
    public peekAt(offset: number): string | null {
        const peekPosition = this._position + offset;
        if (peekPosition >= this._input.length) {
            return null;
        }
        return this._input[peekPosition];
    }

    /**
     * Retrieves the next token from the input string
     */
    public nextToken(): Token {
        this._skipWhitespaceAndComments();

        const location = this.getLocation();

        if (!this.currentChar) {
            return { type: "EOF", value: "", location };
        }

        // Numbers (including decimals)
        if (isDigit(this.currentChar) || (this.currentChar === '.' && this.peek() && isDigit(this.peek()!))) {
            return { type: "NUMBER", value: this._readNumber(), location };
        }

        switch (this.currentChar) {
            case "'":
                this._advance();
                return { type: "STRING", value: this._readTo("'"), location };
            case "`":
                this._advance();
                return { type: "IDENTIFIER", value: this._readTo("`"), location };
            case ",":
                this._advance();
                return { type: "COMMA", value: ",", location };
            case "(":
                this._advance();
                return { type: "LPAREN", value: "(", location };
            case ")":
                this._advance();
                return { type: "RPAREN", value: ")", location };
            case ">":
                if (this.peek() === "=") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: ">=", location };
                } else {
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: ">", location };
                }
            case "<":
                if (this.peek() === "=") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "<=", location };
                } else if (this.peek() === ">") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "<>", location };
                } else {
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "<", location };
                }
            case "=":
                this._advance();
                return { type: "COMPARISON_OPERATOR", value: "=", location };
            case "!":
                if (this.peek() === "=") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "!=", location };
                }
                break;
            case "%":
                this._advance();
                return { type: "STRING", value: "%", location };
        }

        if (isAlphabetic(this.currentChar)) {
            const identifier = this._readAlphanumeric();
            const upperIdentifier = identifier.toUpperCase();
            
            switch (upperIdentifier) {
                case "PLOT":
                case "AS":
                case "WHERE":
                case "GROUP":
                case "ORDER":
                case "BY":
                case "HAVING":
                case "LIMIT":
                case "OFFSET":
                case "BETWEEN":
                case "IN":
                case "LIKE":
                case "ASC":
                case "DESC":
                    if (!this.currentChar || /[\s(]/.test(this.currentChar)) {
                        return { type: "KEYWORD", value: upperIdentifier, location };
                    }
                    break;
                case "AND":
                case "OR":
                case "NOT":
                    if (!this.currentChar || /[\s(]/.test(this.currentChar)) {
                        return { type: "LOGICAL_OPERATOR", value: upperIdentifier, location };
                    }
                    break;
                case "BAR":
                case "LINE":
                case "SCATTER":
                case "PIE":
                case "HISTOGRAM":
                case "AREA":
                case "HEATMAP":
                    if (!this.currentChar || /[\s(]/.test(this.currentChar)) {
                        return { type: "PLOT_FUNCTION", value: upperIdentifier, location };
                    }
                    break;
                case "MIN":
                case "MAX":
                case "AVG":
                case "COUNT":
                case "SUM":
                    if (!this.currentChar || /[\s(]/.test(this.currentChar)) {
                        return { type: "AGGREGATION_FUNCTION", value: upperIdentifier, location };
                    }
                    break;
                case "NULL":
                    return { type: "NULL", value: upperIdentifier, location };
            }

            if (!this.currentChar || /[\s,)]/.test(this.currentChar)) {
                return { type: "IDENTIFIER", value: identifier, location };
            }
        }

        throw new LexerError(
            `Invalid character '${this.currentChar}'`,
            location,
            this._getSuggestion(this.currentChar)
        );
    }

    private _advance(): void {
        if (this.currentChar === '\n') {
            this._line++;
            this._column = 1;
        } else {
            this._column++;
        }
        this._position++;
    }

    private _skipWhitespaceAndComments(): void {
        while (this.currentChar) {
            if (/\s/.test(this.currentChar)) {
                this._advance();
            } else if (this.currentChar === '-' && this.peek() === '-') {
                this._skipLineComment();
            } else if (this.currentChar === '/' && this.peek() === '*') {
                this._skipBlockComment();
            } else {
                break;
            }
        }
    }

    private _skipLineComment(): void {
        while (this.currentChar && this.currentChar !== '\n') {
            this._advance();
        }
        if (this.currentChar === '\n') {
            this._advance();
        }
    }

    private _skipBlockComment(): void {
        const startLocation = this.getLocation();
        this._advance(); // skip /
        this._advance(); // skip *
        
        while (this.currentChar) {
            if (this.currentChar === '*' && this.peek() === '/') {
                this._advance();
                this._advance();
                return;
            }
            this._advance();
        }
        
        throw new LexerError("Unterminated block comment", startLocation);
    }

    private _readAlphanumeric(): string {
        let result = "";
        while (this.currentChar && /[A-Za-z0-9_]/.test(this.currentChar)) {
            result += this.currentChar;
            this._advance();
        }
        return result;
    }

    private _readTo(endChar: string): string {
        const startLocation = this.getLocation();
        let result = "";
        while (this.currentChar !== endChar) {
            if (!this.currentChar) {
                throw new LexerError(
                    `Unterminated string, expected '${endChar}'`,
                    startLocation
                );
            }
            // Handle escape sequences
            if (this.currentChar === '\\' && this.peek() === endChar) {
                this._advance();
                result += this.currentChar;
                this._advance();
            } else {
                result += this.currentChar;
                this._advance();
            }
        }
        this._advance(); // Skip endChar
        return result;
    }

    private _readNumber(): string {
        let result = "";
        let hasDecimal = false;
        
        while (this.currentChar && (isDigit(this.currentChar) || this.currentChar === '.')) {
            if (this.currentChar === '.') {
                if (hasDecimal) {
                    break; // Second decimal point, stop reading
                }
                hasDecimal = true;
            }
            result += this.currentChar;
            this._advance();
        }
        return result;
    }

    private _getSuggestion(char: string): string | undefined {
        const suggestions: Record<string, string> = {
            '"': "Use single quotes (') for strings",
            ';': "PQL statements don't require semicolons",
            '[': "Use parentheses () for grouping",
            ']': "Use parentheses () for grouping",
            '{': "Use parentheses () for grouping",
            '}': "Use parentheses () for grouping",
        };
        return suggestions[char];
    }
}

function isAlphabetic(char: string): boolean {
    return /[A-Za-z]/.test(char);
}

function isDigit(char: string): boolean {
    return /[0-9]/.test(char);
}
