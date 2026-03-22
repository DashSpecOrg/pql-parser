import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { PrettyPrinter, prettyPrint } from '../src/pretty-printer';

describe("pretty-printer.ts", () => {
    test("prints simple BAR query", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT BAR(x, y)");
    });

    test("prints query with WHERE clause", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE z > 0")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT BAR(x, y) WHERE z > 0");
    });

    test("prints query with GROUP BY", () => {
        const query = new Parser(new Lexer("PLOT BAR(cat, SUM(val)) GROUP BY cat")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT BAR(cat, SUM(val)) GROUP BY cat");
    });

    test("prints query with HAVING", () => {
        const query = new Parser(new Lexer("PLOT BAR(cat, SUM(val)) GROUP BY cat HAVING SUM(val) > 100")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("HAVING SUM(val) > 100");
    });

    test("prints query with ORDER BY", () => {
        const query = new Parser(new Lexer("PLOT LINE(x, y) ORDER BY x DESC")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("ORDER BY x DESC");
    });

    test("prints query with LIMIT and OFFSET", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) LIMIT 10 OFFSET 5")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("LIMIT 10 OFFSET 5");
    });

    test("prints BETWEEN condition", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE z BETWEEN 1 AND 10")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("z BETWEEN 1 AND 10");
    });

    test("prints IN condition", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE cat IN ('a', 'b')")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("cat IN ('a', 'b')");
    });

    test("prints LIKE condition", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE name LIKE 'test%'")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("name LIKE 'test%'");
    });

    test("prints NOT condition", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE NOT z > 0")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("NOT z > 0");
    });

    test("prints PIE plot", () => {
        const query = new Parser(new Lexer("PLOT PIE(cat, val)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT PIE(cat, val)");
    });

    test("prints HISTOGRAM plot with bins", () => {
        const query = new Parser(new Lexer("PLOT HISTOGRAM(values, 10)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT HISTOGRAM(values, 10)");
    });

    test("prints HEATMAP plot", () => {
        const query = new Parser(new Lexer("PLOT HEATMAP(x, y, z)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toBe("PLOT HEATMAP(x, y, z)");
    });

    test("prints with lowercase option", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y)")).parse();
        const result = prettyPrint(query, { uppercase: false, newlines: false });
        expect(result).toBe("plot bar(x, y)");
    });

    test("prints with newlines", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE z > 0 LIMIT 10")).parse();
        const result = prettyPrint(query, { newlines: true });
        expect(result).toContain("\n");
    });

    test("escapes special identifiers", () => {
        const query = new Parser(new Lexer("PLOT BAR(`my column`, y)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("`my column`");
    });

    test("prints column alias", () => {
        const query = new Parser(new Lexer("PLOT BAR(xcol AS x, ycol AS y)")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("xcol AS x");
        expect(result).toContain("ycol AS y");
    });

    test("prints NULL value", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE z = NULL")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("z = NULL");
    });

    test("prints complex AND/OR conditions with parentheses", () => {
        const query = new Parser(new Lexer("PLOT BAR(x, y) WHERE (a > 0 OR b < 10) AND c = 'test'")).parse();
        const result = prettyPrint(query, { newlines: false });
        expect(result).toContain("(a > 0 OR b < 10)");
    });

    test("round-trip parsing", () => {
        const original = "PLOT BAR(category, SUM(value)) WHERE status = 'active' GROUP BY category HAVING SUM(value) > 100 ORDER BY category ASC LIMIT 10";
        const query = new Parser(new Lexer(original)).parse();
        const printed = prettyPrint(query, { newlines: false });
        const reparsed = new Parser(new Lexer(printed)).parse();
        
        expect(reparsed.plotClause.plotFunction).toBe(query.plotClause.plotFunction);
        expect(reparsed.groupKey).toBe(query.groupKey);
        expect(reparsed.orderBy).toEqual(query.orderBy);
        expect(reparsed.limitAndOffset?.limit).toBe(query.limitAndOffset?.limit);
    });
});
