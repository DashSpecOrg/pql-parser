import {
    QueryBuilder,
    agg,
    col,
    and,
    or,
    not,
    gt,
    gte,
    lt,
    lte,
    eq,
    neq,
    between,
    inValues,
    like,
    havingAgg
} from '../src/query-builder';
import { BarPlotCall, PointPlotCall, PiePlotCall, HistogramPlotCall, HeatmapPlotCall } from '../src/types';

describe("query-builder.ts", () => {
    describe("QueryBuilder", () => {
        test("builds BAR plot", () => {
            const query = new QueryBuilder()
                .bar("category", "value")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("BAR");
            const plot = query.plotClause as BarPlotCall;
            expect(plot.categoriesColumn.column).toBe("category");
            expect(plot.valuesColumn.column).toBe("value");
        });

        test("builds LINE plot", () => {
            const query = new QueryBuilder()
                .line("x", "y")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("LINE");
        });

        test("builds SCATTER plot", () => {
            const query = new QueryBuilder()
                .scatter("x", "y")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("SCATTER");
        });

        test("builds PIE plot", () => {
            const query = new QueryBuilder()
                .pie("category", "value")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("PIE");
        });

        test("builds HISTOGRAM plot", () => {
            const query = new QueryBuilder()
                .histogram("values", 10)
                .build();
            
            expect(query.plotClause.plotFunction).toBe("HISTOGRAM");
            const plot = query.plotClause as HistogramPlotCall;
            expect(plot.bins).toBe(10);
        });

        test("builds AREA plot", () => {
            const query = new QueryBuilder()
                .area("date", "value")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("AREA");
        });

        test("builds HEATMAP plot", () => {
            const query = new QueryBuilder()
                .heatmap("x", "y", "intensity")
                .build();
            
            expect(query.plotClause.plotFunction).toBe("HEATMAP");
            const plot = query.plotClause as HeatmapPlotCall;
            expect(plot.valueColumn.column).toBe("intensity");
        });

        test("builds query with WHERE clause", () => {
            const query = new QueryBuilder()
                .bar("x", "y")
                .where(gt("z", 0))
                .build();
            
            expect(query.whereCondition).toEqual({ gt: { key: "z", value: 0 } });
        });

        test("builds query with GROUP BY", () => {
            const query = new QueryBuilder()
                .bar("category", agg("SUM", "value"))
                .groupBy("category")
                .build();
            
            expect(query.groupKey).toBe("category");
        });

        test("builds query with HAVING", () => {
            const query = new QueryBuilder()
                .bar("category", agg("SUM", "value"))
                .groupBy("category")
                .having(havingAgg("SUM", "value", ">", 100))
                .build();
            
            expect(query.havingCondition).toBeDefined();
        });

        test("builds query with ORDER BY", () => {
            const query = new QueryBuilder()
                .line("x", "y")
                .orderBy("x", "DESC")
                .build();
            
            expect(query.orderBy).toEqual({ column: "x", direction: "DESC" });
        });

        test("builds query with LIMIT", () => {
            const query = new QueryBuilder()
                .bar("x", "y")
                .limit(10, 5)
                .build();
            
            expect(query.limitAndOffset).toEqual({ limit: 10, offset: 5 });
        });

        test("throws error when no plot clause", () => {
            expect(() => new QueryBuilder().build()).toThrow();
        });

        test("builds complex query", () => {
            const query = new QueryBuilder()
                .bar("category", agg("SUM", "sales", "total_sales"))
                .where(and(
                    eq("region", "US"),
                    between("year", 2020, 2025)
                ))
                .groupBy("category")
                .having(havingAgg("SUM", "sales", ">", 1000))
                .orderBy("category", "ASC")
                .limit(10)
                .build();
            
            expect(query.plotClause.plotFunction).toBe("BAR");
            expect(query.whereCondition).toBeDefined();
            expect(query.groupKey).toBe("category");
            expect(query.havingCondition).toBeDefined();
            expect(query.orderBy).toBeDefined();
            expect(query.limitAndOffset).toBeDefined();
        });
    });

    describe("helper functions", () => {
        test("agg creates aggregation column", () => {
            const column = agg("SUM", "value", "total");
            expect(column.aggregationFunction).toBe("SUM");
            expect(column.column).toBe("value");
            expect(column.identifier).toBe("total");
        });

        test("agg without alias uses default identifier", () => {
            const column = agg("AVG", "price");
            expect(column.identifier).toBe("AVG(price)");
        });

        test("col creates column reference", () => {
            const column = col("name", "alias");
            expect(column.column).toBe("name");
            expect(column.identifier).toBe("alias");
        });

        test("and combines conditions", () => {
            const condition = and(gt("a", 0), lt("b", 10));
            expect(condition).toEqual({
                and: [
                    { gt: { key: "a", value: 0 } },
                    { lt: { key: "b", value: 10 } }
                ]
            });
        });

        test("or combines conditions", () => {
            const condition = or(eq("status", "active"), eq("status", "pending"));
            expect(condition).toEqual({
                or: [
                    { eq: { key: "status", value: "active" } },
                    { eq: { key: "status", value: "pending" } }
                ]
            });
        });

        test("not negates condition", () => {
            const condition = not(gt("value", 100));
            expect(condition).toEqual({
                not: { gt: { key: "value", value: 100 } }
            });
        });

        test("comparison operators", () => {
            expect(gt("a", 1)).toEqual({ gt: { key: "a", value: 1 } });
            expect(gte("a", 1)).toEqual({ gte: { key: "a", value: 1 } });
            expect(lt("a", 1)).toEqual({ lt: { key: "a", value: 1 } });
            expect(lte("a", 1)).toEqual({ lte: { key: "a", value: 1 } });
            expect(eq("a", "test")).toEqual({ eq: { key: "a", value: "test" } });
            expect(neq("a", null)).toEqual({ neq: { key: "a", value: null } });
        });

        test("between creates range condition", () => {
            const condition = between("age", 18, 65);
            expect(condition).toEqual({
                between: { key: "age", low: 18, high: 65 }
            });
        });

        test("inValues creates IN condition", () => {
            const condition = inValues("status", ["a", "b", "c"]);
            expect(condition).toEqual({
                in: { key: "status", values: ["a", "b", "c"] }
            });
        });

        test("like creates LIKE condition", () => {
            const condition = like("name", "test%");
            expect(condition).toEqual({
                like: { key: "name", pattern: "test%" }
            });
        });

        test("havingAgg creates HAVING condition", () => {
            const condition = havingAgg("SUM", "value", ">", 100);
            expect(condition).toEqual({
                aggregation: { function: "SUM", column: "value" },
                operator: ">",
                value: 100
            });
        });
    });
});
