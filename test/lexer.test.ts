import { Lexer } from '../src/lexer';
import { Token } from '../src/types';

describe("lexer.ts", () => {
    test("basic plot statement", () => {
        const input = "PLOT BAR(xcol, ycol)";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with named attributes", () => {
        const input = "PLOT BAR(xcol AS x, ycol AS y)";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "KEYWORD", value: "AS" },
            { type: "IDENTIFIER", value: "x" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "KEYWORD", value: "AS" },
            { type: "IDENTIFIER", value: "y" },
            { type: "RPAREN", value: ")" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with escaped identifiers", () => {
        const input = "PLOT BAR(` xcol `, `25`)";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: " xcol " },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "25" },
            { type: "RPAREN", value: ")" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with string where clause", () => {
        const input = "PLOT BAR(xcol, ycol) WHERE zcol = 'on'";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
            { type: "KEYWORD", value: "WHERE" },
            { type: "IDENTIFIER", value: "zcol" },
            { type: "COMPARISON_OPERATOR", value: "=" },
            { type: "STRING", value: "on" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with greater than where clause", () => {
        const input = "PLOT BAR(xcol, ycol) WHERE zcol > 0";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
            { type: "KEYWORD", value: "WHERE" },
            { type: "IDENTIFIER", value: "zcol" },
            { type: "COMPARISON_OPERATOR", value: ">" },
            { type: "NUMBER", value: "0" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with less than or equal where clause", () => {
        const input = "PLOT BAR(xcol, ycol) WHERE zcol <= 123";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
            { type: "KEYWORD", value: "WHERE" },
            { type: "IDENTIFIER", value: "zcol" },
            { type: "COMPARISON_OPERATOR", value: "<=" },
            { type: "NUMBER", value: "123" },
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with groupby clause", () => {
        const input = "PLOT BAR(xcol, AVG(ycol)) GROUP BY xcol";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "AGGREGATION_FUNCTION", value: "AVG" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
            { type: "RPAREN", value: ")" },
            { type: "KEYWORD", value: "GROUP" },
            { type: "KEYWORD", value: "BY" },
            { type: "IDENTIFIER", value: "xcol" }
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with limit and offset clause", () => {
        const input = "PLOT BAR(xcol, AVG(ycol)) GROUP BY xcol LIMIT 1 OFFSET 2";
        const lexer = new Lexer(input);
        const expected = [
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "COMMA", value: "," },
            { type: "AGGREGATION_FUNCTION", value: "AVG" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "ycol" },
            { type: "RPAREN", value: ")" },
            { type: "RPAREN", value: ")" },
            { type: "KEYWORD", value: "GROUP" },
            { type: "KEYWORD", value: "BY" },
            { type: "IDENTIFIER", value: "xcol" },
            { type: "KEYWORD", value: "LIMIT" },
            { type: "NUMBER", value: "1" },
            { type: "KEYWORD", value: "OFFSET" },
            { type: "NUMBER", value: "2" }
        ];
        const actual = getTokens(lexer);
        expect(actual.map(t => ({ type: t.type, value: t.value }))).toEqual(expected);
    });

    test("plot statement with invalid alphanumeric token", () => {
        const input = "PLOT-";
        const lexer = new Lexer(input);
        try {
            lexer.nextToken();
            fail();
        } catch {
            return;
        }
    });

    // New tests for enhanced features

    test("floating point numbers", () => {
        const input = "PLOT BAR(x, y) WHERE price > 19.99";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        const numberToken = tokens.find(t => t.type === "NUMBER");
        expect(numberToken?.value).toBe("19.99");
    });

    test("line comments", () => {
        const input = `PLOT BAR(x, y) -- this is a comment
WHERE z > 0`;
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.map(t => t.type)).not.toContain("COMMENT");
        expect(tokens.find(t => t.value === "WHERE")).toBeTruthy();
    });

    test("block comments", () => {
        const input = "PLOT /* comment */ BAR(x, y)";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.map(t => ({ type: t.type, value: t.value }))).toEqual([
            { type: "KEYWORD", value: "PLOT" },
            { type: "PLOT_FUNCTION", value: "BAR" },
            { type: "LPAREN", value: "(" },
            { type: "IDENTIFIER", value: "x" },
            { type: "COMMA", value: "," },
            { type: "IDENTIFIER", value: "y" },
            { type: "RPAREN", value: ")" },
        ]);
    });

    test("BETWEEN keyword", () => {
        const input = "PLOT BAR(x, y) WHERE z BETWEEN 1 AND 10";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "BETWEEN")).toBeTruthy();
    });

    test("IN keyword", () => {
        const input = "PLOT BAR(x, y) WHERE z IN ('a', 'b')";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "IN")).toBeTruthy();
    });

    test("LIKE keyword", () => {
        const input = "PLOT BAR(x, y) WHERE name LIKE 'test%'";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "LIKE")).toBeTruthy();
    });

    test("new plot functions", () => {
        const plotFunctions = ["PIE", "HISTOGRAM", "AREA", "HEATMAP"];
        for (const func of plotFunctions) {
            const input = `PLOT ${func}(x, y)`;
            const lexer = new Lexer(input);
            const tokens = getTokens(lexer);
            expect(tokens.find(t => t.value === func)).toBeTruthy();
        }
    });

    test("ORDERBY keyword", () => {
        const input = "PLOT BAR(x, y) ORDER BY x ASC";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "ORDER")).toBeTruthy();
        expect(tokens.find(t => t.value === "BY")).toBeTruthy();
        expect(tokens.find(t => t.value === "ASC")).toBeTruthy();
    });

    test("HAVING keyword", () => {
        const input = "PLOT BAR(x, SUM(y)) GROUP BY x HAVING SUM(y) > 100";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "HAVING")).toBeTruthy();
    });

    test("NOT keyword", () => {
        const input = "PLOT BAR(x, y) WHERE NOT z > 0";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "NOT")).toBeTruthy();
    });

    test("source location tracking", () => {
        const input = "PLOT BAR(x, y)";
        const lexer = new Lexer(input);
        const token = lexer.nextToken();
        expect(token.location).toEqual({ line: 1, column: 1, offset: 0 });
    });

    test("multiline source location tracking", () => {
        const input = `PLOT
BAR(x, y)`;
        const lexer = new Lexer(input);
        lexer.nextToken(); // PLOT
        const barToken = lexer.nextToken(); // BAR
        expect(barToken.location.line).toBe(2);
        expect(barToken.location.column).toBe(1);
    });

    test("unterminated block comment throws error", () => {
        const input = "PLOT /* unterminated";
        const lexer = new Lexer(input);
        lexer.nextToken(); // PLOT
        expect(() => lexer.nextToken()).toThrow();
    });

    test("<> as not equal operator", () => {
        const input = "PLOT BAR(x, y) WHERE z <> 5";
        const lexer = new Lexer(input);
        const tokens = getTokens(lexer);
        expect(tokens.find(t => t.value === "<>")).toBeTruthy();
    });
});

function getTokens(lexer: Lexer): Token[] {
    const tokens: Token[] = [];
    while (true) {
        const nextToken = lexer.nextToken();
        if (nextToken.type === "EOF") {
            break;
        }
        tokens.push(nextToken);
    }
    return tokens;
}
