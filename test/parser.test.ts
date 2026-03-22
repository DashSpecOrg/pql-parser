import { BarPlotCall, PointPlotCall, PiePlotCall, HistogramPlotCall, HeatmapPlotCall } from '../src/types';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

describe("parser.ts", () => {
    test("basic plot statement", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("BAR");
        const plotClause = actual.plotClause as BarPlotCall;
        expect(plotClause.categoriesColumn.column).toBe("xcol");
        expect(plotClause.valuesColumn.column).toBe("ycol");
    });

    test("FROM clause is parsed", () => {
        const input = "PLOT BAR(x, y) FROM sales";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.fromClause.table).toBe("sales");
    });

    test("FROM clause with escaped identifier", () => {
        const input = "PLOT BAR(x, y) FROM `my table`";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.fromClause.table).toBe("my table");
    });

    test("missing FROM clause throws error", () => {
        const input = "PLOT BAR(x, y) WHERE z > 0";
        expect(() => new Parser(new Lexer(input)).parse()).toThrow();
    });

    test("plot statement with named attributes", () => {
        const input = "PLOT BAR(xcol AS x, ycol AS y) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        const plotClause = actual.plotClause as BarPlotCall;
        expect(plotClause.categoriesColumn.identifier).toBe("x");
        expect(plotClause.valuesColumn.identifier).toBe("y");
    });

    test("plot statement with escaped identifiers", () => {
        const input = "PLOT BAR(` xcol `, `25`) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        const plotClause = actual.plotClause as BarPlotCall;
        expect(plotClause.categoriesColumn.column).toBe(" xcol ");
        expect(plotClause.valuesColumn.column).toBe("25");
    });

    test("plot statement with string where clause", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE zcol = 'on'";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({ eq: { key: "zcol", value: "on" } });
    });

    test("plot statement with greater than where clause", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE zcol > 0";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({ gt: { key: "zcol", value: 0 } });
    });

    test("plot statement with AND where clause", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE zcol > 0 AND zcol < 10";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            and: [
                { gt: { key: "zcol", value: 0 } },
                { lt: { key: "zcol", value: 10 } }
            ]
        });
    });

    test("plot statement with OR where clause", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE zcol > 0 OR zcol < 10";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            or: [
                { gt: { key: "zcol", value: 0 } },
                { lt: { key: "zcol", value: 10 } }
            ]
        });
    });

    test("plot statement with AND and OR conditions", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE zcol > 0 OR zcol < 10 AND xcol > 0";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            or: [
                { gt: { key: "zcol", value: 0 } },
                {
                    and: [
                        { lt: { key: "zcol", value: 10 } },
                        { gt: { key: "xcol", value: 0 } }
                    ]
                }
            ]
        });
    });

    test("plot statement with WHERE clause with parentheses", () => {
        const input = "PLOT BAR(xcol, ycol) FROM t WHERE (zcol > 0 OR zcol < 10) AND xcol > 0";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            and: [
                {
                    or: [
                        { gt: { key: "zcol", value: 0 } },
                        { lt: { key: "zcol", value: 10 } }
                    ]
                },
                { gt: { key: "xcol", value: 0 } }
            ]
        });
    });

    test("plot statement with groupby clause", () => {
        const input = "PLOT BAR(xcol, AVG(ycol)) FROM t GROUP BY xcol";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.groupKey).toBe("xcol");
        const plotClause = actual.plotClause as BarPlotCall;
        expect(plotClause.valuesColumn.aggregationFunction).toBe("AVG");
    });

    test("plot statement with empty count aggregation", () => {
        const input = "PLOT SCATTER(xcol, COUNT()) FROM t GROUP BY xcol";
        const actual = new Parser(new Lexer(input)).parse();
        const plotClause = actual.plotClause as PointPlotCall;
        expect(plotClause.yColumn.aggregationFunction).toBe("COUNT");
        expect(plotClause.yColumn.column).toBeUndefined();
    });

    test("plot statement with limit and offset", () => {
        const input = "PLOT SCATTER(xcol, COUNT()) FROM t GROUP BY xcol LIMIT 1 OFFSET 2";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.limitAndOffset).toEqual({ limit: 1, offset: 2 });
    });

    test("PIE plot", () => {
        const input = "PLOT PIE(category, value) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("PIE");
        const plotClause = actual.plotClause as PiePlotCall;
        expect(plotClause.categoriesColumn.column).toBe("category");
        expect(plotClause.valuesColumn.column).toBe("value");
    });

    test("HISTOGRAM plot", () => {
        const input = "PLOT HISTOGRAM(values, 10) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("HISTOGRAM");
        const plotClause = actual.plotClause as HistogramPlotCall;
        expect(plotClause.column.column).toBe("values");
        expect(plotClause.bins).toBe(10);
    });

    test("HISTOGRAM plot without bins", () => {
        const input = "PLOT HISTOGRAM(values) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        const plotClause = actual.plotClause as HistogramPlotCall;
        expect(plotClause.bins).toBeUndefined();
    });

    test("AREA plot", () => {
        const input = "PLOT AREA(date, value) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("AREA");
        const plotClause = actual.plotClause as PointPlotCall;
        expect(plotClause.xColumn.column).toBe("date");
        expect(plotClause.yColumn.column).toBe("value");
    });

    test("HEATMAP plot", () => {
        const input = "PLOT HEATMAP(x, y, intensity) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("HEATMAP");
        const plotClause = actual.plotClause as HeatmapPlotCall;
        expect(plotClause.xColumn.column).toBe("x");
        expect(plotClause.yColumn.column).toBe("y");
        expect(plotClause.valueColumn.column).toBe("intensity");
    });

    test("BETWEEN condition", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE value BETWEEN 10 AND 100";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            between: { key: "value", low: 10, high: 100 }
        });
    });

    test("IN condition", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE category IN ('A', 'B', 'C')";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            in: { key: "category", values: ["A", "B", "C"] }
        });
    });

    test("IN condition with numbers", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE id IN (1, 2, 3)";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            in: { key: "id", values: [1, 2, 3] }
        });
    });

    test("LIKE condition", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE name LIKE 'test%'";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            like: { key: "name", pattern: "test%" }
        });
    });

    test("NOT condition", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE NOT value > 10";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            not: { gt: { key: "value", value: 10 } }
        });
    });

    test("ORDER BY clause ascending", () => {
        const input = "PLOT LINE(date, value) FROM t ORDER BY date ASC";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.orderBy).toEqual({ column: "date", direction: "ASC" });
    });

    test("ORDER BY clause descending", () => {
        const input = "PLOT LINE(date, value) FROM t ORDER BY value DESC";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.orderBy).toEqual({ column: "value", direction: "DESC" });
    });

    test("ORDER BY clause default direction", () => {
        const input = "PLOT LINE(date, value) FROM t ORDER BY date";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.orderBy).toEqual({ column: "date", direction: "ASC" });
    });

    test("HAVING clause", () => {
        const input = "PLOT BAR(category, SUM(sales)) FROM t GROUP BY category HAVING SUM(sales) > 1000";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.havingCondition).toEqual({
            aggregation: { function: "SUM", column: "sales" },
            operator: ">",
            value: 1000
        });
    });

    test("HAVING clause with COUNT", () => {
        const input = "PLOT BAR(category, COUNT()) FROM t GROUP BY category HAVING COUNT() >= 5";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.havingCondition).toEqual({
            aggregation: { function: "COUNT", column: undefined },
            operator: ">=",
            value: 5
        });
    });

    test("HAVING clause with AND", () => {
        const input = "PLOT BAR(cat, SUM(val)) FROM t GROUP BY cat HAVING SUM(val) > 100 AND AVG(val) < 50";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.havingCondition).toEqual({
            and: [
                { aggregation: { function: "SUM", column: "val" }, operator: ">", value: 100 },
                { aggregation: { function: "AVG", column: "val" }, operator: "<", value: 50 }
            ]
        });
    });

    test("floating point comparison", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE price > 19.99";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            gt: { key: "price", value: 19.99 }
        });
    });

    test("full query with all clauses", () => {
        const input = `
            PLOT BAR(category, SUM(sales))
            FROM orders
            WHERE region = 'US' AND year BETWEEN 2020 AND 2025
            GROUP BY category
            HAVING SUM(sales) > 1000
            ORDER BY category ASC
            LIMIT 10 OFFSET 5
        `;
        const actual = new Parser(new Lexer(input)).parse();
        
        expect(actual.plotClause.plotFunction).toBe("BAR");
        expect(actual.fromClause.table).toBe("orders");
        expect(actual.whereCondition).toBeDefined();
        expect(actual.groupKey).toBe("category");
        expect(actual.havingCondition).toBeDefined();
        expect(actual.orderBy).toEqual({ column: "category", direction: "ASC" });
        expect(actual.limitAndOffset).toEqual({ limit: 10, offset: 5 });
    });

    test("query with comments", () => {
        const input = `
            -- This is a comment
            PLOT BAR(x, y) FROM t /* inline comment */ WHERE z > 0
        `;
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.plotClause.plotFunction).toBe("BAR");
        expect(actual.whereCondition).toEqual({ gt: { key: "z", value: 0 } });
    });

    test("<> not equal operator", () => {
        const input = "PLOT BAR(x, y) FROM t WHERE status <> 'inactive'";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.whereCondition).toEqual({
            neq: { key: "status", value: "inactive" }
        });
    });

    test("source location in AST", () => {
        const input = "PLOT BAR(x, y) FROM t";
        const actual = new Parser(new Lexer(input)).parse();
        expect(actual.location).toBeDefined();
        expect(actual.location?.line).toBe(1);
        expect(actual.location?.column).toBe(1);
    });
});
