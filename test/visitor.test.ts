import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { ColumnCollector, AggregationChecker } from '../src/visitor';

describe("visitor.ts", () => {
    describe("ColumnCollector", () => {
        const collector = new ColumnCollector();

        test("collects columns from simple query", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("x");
            expect(columns).toContain("y");
        });

        test("collects columns from WHERE clause", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE z > 0")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("z");
        });

        test("collects columns from GROUP BY", () => {
            const query = new Parser(new Lexer("PLOT BAR(cat, SUM(val)) FROM t GROUP BY cat")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("cat");
            expect(columns).toContain("val");
        });

        test("collects columns from ORDER BY", () => {
            const query = new Parser(new Lexer("PLOT LINE(x, y) FROM t ORDER BY x")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("x");
        });

        test("collects columns from HAVING clause", () => {
            const query = new Parser(new Lexer("PLOT BAR(cat, SUM(val)) FROM t GROUP BY cat HAVING AVG(price) > 10")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("price");
        });

        test("collects columns from BETWEEN condition", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE age BETWEEN 18 AND 65")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("age");
        });

        test("collects columns from IN condition", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE status IN ('a', 'b')")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("status");
        });

        test("collects columns from LIKE condition", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE name LIKE 'test%'")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("name");
        });

        test("collects columns from HEATMAP", () => {
            const query = new Parser(new Lexer("PLOT HEATMAP(a, b, c) FROM t")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("a");
            expect(columns).toContain("b");
            expect(columns).toContain("c");
        });

        test("collects columns from complex AND/OR conditions", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE (a > 0 OR b < 10) AND c = 'test'")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("a");
            expect(columns).toContain("b");
            expect(columns).toContain("c");
        });

        test("collects columns from NOT condition", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t WHERE NOT active > 0")).parse();
            const columns = collector.visitQuery(query);
            expect(columns).toContain("active");
        });
    });

    describe("AggregationChecker", () => {
        const checker = new AggregationChecker();

        test("detects no aggregation in simple query", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, y) FROM t")).parse();
            expect(checker.visitQuery(query)).toBe(false);
        });

        test("detects aggregation in query", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, SUM(y)) FROM t GROUP BY x")).parse();
            expect(checker.visitQuery(query)).toBe(true);
        });

        test("detects COUNT aggregation", () => {
            const query = new Parser(new Lexer("PLOT BAR(x, COUNT()) FROM t GROUP BY x")).parse();
            expect(checker.visitQuery(query)).toBe(true);
        });

        test("detects aggregation in HEATMAP", () => {
            const query = new Parser(new Lexer("PLOT HEATMAP(x, y, AVG(z)) FROM t GROUP BY x")).parse();
            expect(checker.visitQuery(query)).toBe(true);
        });
    });
});
