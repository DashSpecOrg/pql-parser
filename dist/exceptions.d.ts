import { SourceLocation } from "./types";
export declare class PQLError extends Error {
    readonly location?: SourceLocation;
    readonly suggestion?: string;
    constructor(message: string, location?: SourceLocation, suggestion?: string);
}
export declare class LexerError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string);
}
export declare class ParserError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string);
}
export declare class ValidationError extends PQLError {
    constructor(message: string, location?: SourceLocation, suggestion?: string);
}
