import { SourceLocation } from "./types";

export class PQLError extends Error {
    public readonly location?: SourceLocation;
    public readonly suggestion?: string;

    constructor(message: string, location?: SourceLocation, suggestion?: string) {
        const locationStr = location 
            ? ` at line ${location.line}, column ${location.column}` 
            : '';
        const suggestionStr = suggestion ? `\nSuggestion: ${suggestion}` : '';
        super(`${message}${locationStr}${suggestionStr}`);
        this.location = location;
        this.suggestion = suggestion;
    }
}

export class LexerError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string) {
        super(`Lexer error: ${message}`, location, suggestion);
    }
}

export class ParserError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string) {
        super(`Parser error: ${message}`, location, suggestion);
    }
}

export class ValidationError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string) {
        super(`Validation error: ${message}`, location, suggestion);
    }
}
