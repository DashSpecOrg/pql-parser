"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
const exceptions_1 = require("./exceptions");
/**
 * Lexer for tokenizing PQL queries
 */
class Lexer {
    constructor(_input) {
        this._input = _input;
        this._position = 0;
        this._line = 1;
        this._column = 1;
    }
    /**
     * Retrieves the current position of the lexer
     */
    get currentPosition() {
        return this._position;
    }
    /**
     * Retrieves the current line number
     */
    get currentLine() {
        return this._line;
    }
    /**
     * Retrieves the current column number
     */
    get currentColumn() {
        return this._column;
    }
    /**
     * Retrieves the current char of the lexer
     */
    get currentChar() {
        return this._input[this._position];
    }
    /**
     * Gets the current source location
     */
    getLocation() {
        return {
            line: this._line,
            column: this._column,
            offset: this._position
        };
    }
    /**
     * Peeks at the next character without advancing
     */
    peek() {
        const peekPosition = this._position + 1;
        if (peekPosition >= this._input.length) {
            return null;
        }
        return this._input[peekPosition];
    }
    /**
     * Peeks at a character at a specific offset
     */
    peekAt(offset) {
        const peekPosition = this._position + offset;
        if (peekPosition >= this._input.length) {
            return null;
        }
        return this._input[peekPosition];
    }
    /**
     * Retrieves the next token from the input string
     */
    nextToken() {
        this._skipWhitespaceAndComments();
        const location = this.getLocation();
        if (!this.currentChar) {
            return { type: "EOF", value: "", location };
        }
        // Numbers (including decimals)
        if (isDigit(this.currentChar) || (this.currentChar === '.' && this.peek() && isDigit(this.peek()))) {
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
                }
                else {
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: ">", location };
                }
            case "<":
                if (this.peek() === "=") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "<=", location };
                }
                else if (this.peek() === ">") {
                    this._advance();
                    this._advance();
                    return { type: "COMPARISON_OPERATOR", value: "<>", location };
                }
                else {
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
                case "FROM":
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
        throw new exceptions_1.LexerError(`Invalid character '${this.currentChar}'`, location, this._getSuggestion(this.currentChar));
    }
    _advance() {
        if (this.currentChar === '\n') {
            this._line++;
            this._column = 1;
        }
        else {
            this._column++;
        }
        this._position++;
    }
    _skipWhitespaceAndComments() {
        while (this.currentChar) {
            if (/\s/.test(this.currentChar)) {
                this._advance();
            }
            else if (this.currentChar === '-' && this.peek() === '-') {
                this._skipLineComment();
            }
            else if (this.currentChar === '/' && this.peek() === '*') {
                this._skipBlockComment();
            }
            else {
                break;
            }
        }
    }
    _skipLineComment() {
        while (this.currentChar && this.currentChar !== '\n') {
            this._advance();
        }
        if (this.currentChar === '\n') {
            this._advance();
        }
    }
    _skipBlockComment() {
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
        throw new exceptions_1.LexerError("Unterminated block comment", startLocation);
    }
    _readAlphanumeric() {
        let result = "";
        while (this.currentChar && /[A-Za-z0-9_]/.test(this.currentChar)) {
            result += this.currentChar;
            this._advance();
        }
        return result;
    }
    _readTo(endChar) {
        const startLocation = this.getLocation();
        let result = "";
        while (this.currentChar !== endChar) {
            if (!this.currentChar) {
                throw new exceptions_1.LexerError(`Unterminated string, expected '${endChar}'`, startLocation);
            }
            // Handle escape sequences
            if (this.currentChar === '\\' && this.peek() === endChar) {
                this._advance();
                result += this.currentChar;
                this._advance();
            }
            else {
                result += this.currentChar;
                this._advance();
            }
        }
        this._advance(); // Skip endChar
        return result;
    }
    _readNumber() {
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
    _getSuggestion(char) {
        const suggestions = {
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
exports.Lexer = Lexer;
function isAlphabetic(char) {
    return /[A-Za-z]/.test(char);
}
function isDigit(char) {
    return /[0-9]/.test(char);
}
