"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ParserError = exports.LexerError = exports.PQLError = void 0;
class PQLError extends Error {
    constructor(message, location, suggestion) {
        const locationStr = location
            ? ` at line ${location.line}, column ${location.column}`
            : '';
        const suggestionStr = suggestion ? `\nSuggestion: ${suggestion}` : '';
        super(`${message}${locationStr}${suggestionStr}`);
        this.location = location;
        this.suggestion = suggestion;
    }
}
exports.PQLError = PQLError;
class LexerError extends PQLError {
    constructor(message, location, suggestion) {
        super(`Lexer error: ${message}`, location, suggestion);
    }
}
exports.LexerError = LexerError;
class ParserError extends PQLError {
    constructor(message, location, suggestion) {
        super(`Parser error: ${message}`, location, suggestion);
    }
}
exports.ParserError = ParserError;
class ValidationError extends PQLError {
    constructor(message, location, suggestion) {
        super(`Validation error: ${message}`, location, suggestion);
    }
}
exports.ValidationError = ValidationError;
