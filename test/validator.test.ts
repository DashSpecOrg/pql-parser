import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { Validator } from '../src/validator';

describe("validator.ts", () => {
    const validator = new Validator();

    test("valid simple query", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y)")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test("valid aggregation query with GROUP BY", () => {
        const query = new Parser(new Lexer("PLOT BAR(category, SUM(value)) GROUP BY category")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(true);
    });

    test("aggregation without GROUP BY is invalid", () => {
        const query = new Parser(new Lexer("PLOT BAR(category, SUM(value))")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test("HAVING without GROUP BY is invalid", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) HAVING COUNT() > 5")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes("HAVING"))).toBe(true);
    });

    test("valid HAVING with GROUP BY", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, COUNT()) GROUP BY x HAVING COUNT() > 5")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(true);
    });

    test("negative LIMIT is invalid", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) LIMIT 10")).parse();
        query.limitAndOffset!.limit = -1;
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
    });

    test("negative OFFSET is invalid", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) LIMIT 10 OFFSET 5")).parse();
        query.limitAndOffset!.offset = -1;
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
    });

    test("HISTOGRAM with aggregation is invalid", () => {
        const query = new Parser(new Lexer("PLOT HISTOGRAM(SUM(value)) GROUP BY x")).parse();
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
    });

    test("HISTOGRAM with negative bins is invalid", () => {
        const query = new Parser(new Lexer("PLOT HISTOGRAM(value, 10)")).parse();
        // Manually set negative bins for testing
        (query.plotClause as any).bins = -5;
        const result = validator.validate(query);
        expect(result.valid).toBe(false);
    });

    test("warnings for mixed aggregation without GROUP BY", () => {
        // This creates a query that mixes aggregated and non-aggregated columns
        const query = new Parser(new Lexer("PLOT BAR(x, y)")).parse();
        // Manually add aggregation to one column
        (query.plotClause as any).valuesColumn.aggregationFunction = "SUM";
        const result = validator.validate(query);
        // Should have errors (aggregation without GROUP BY)
        expect(result.errors.length).toBeGreaterThan(0);
    });
});
