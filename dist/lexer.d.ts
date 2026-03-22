import { SourceLocation, Token } from "./types";
/**
 * Lexer for tokenizing PQL queries
 */
export declare class Lexer {
    private readonly _input;
    private _position;
    private _line;
    private _column;
    constructor(_input: string);
    /**
     * Retrieves the current position of the lexer
     */
    get currentPosition(): number;
    /**
     * Retrieves the current line number
     */
    get currentLine(): number;
    /**
     * Retrieves the current column number
     */
    get currentColumn(): number;
    /**
     * Retrieves the current char of the lexer
     */
    get currentChar(): string | undefined;
    /**
     * Gets the current source location
     */
    getLocation(): SourceLocation;
    /**
     * Peeks at the next character without advancing
     */
    peek(): string | null;
    /**
     * Peeks at a character at a specific offset
     */
    peekAt(offset: number): string | null;
    /**
     * Retrieves the next token from the input string
     */
    nextToken(): Token;
    private _advance;
    private _skipWhitespaceAndComments;
    private _skipLineComment;
    private _skipBlockComment;
    private _readAlphanumeric;
    private _readTo;
    private _readNumber;
    private _getSuggestion;
}
