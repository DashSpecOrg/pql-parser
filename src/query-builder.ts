import {
    PQLQuery,
    PlotClause,
    PlotFunction,
    AggregationFunction,
    ColumnMetadata,
    WhereCondition,
    HavingCondition,
    OrderByClause,
    LimitAndOffset,
    BarPlotCall,
    PointPlotCall,
    PiePlotCall,
    HistogramPlotCall,
    HeatmapPlotCall
} from "./types";

/**
 * Fluent API for building PQL queries programmatically
 */
export class QueryBuilder {
    private _plotClause?: PlotClause;
    private _fromTable?: string;
    private _whereCondition?: WhereCondition;
    private _groupKey?: string;
    private _havingCondition?: HavingCondition;
    private _orderBy?: OrderByClause;
    private _limitAndOffset?: LimitAndOffset;

    /**
     * Creates a BAR plot
     */
    bar(categories: ColumnInput, values: ColumnInput): this {
        this._plotClause = {
            plotFunction: "BAR",
            categoriesColumn: this._toColumnMetadata(categories),
            valuesColumn: this._toColumnMetadata(values)
        } as BarPlotCall;
        return this;
    }

    /**
     * Creates a LINE plot
     */
    line(x: ColumnInput, y: ColumnInput): this {
        this._plotClause = {
            plotFunction: "LINE",
            xColumn: this._toColumnMetadata(x),
            yColumn: this._toColumnMetadata(y)
        } as PointPlotCall;
        return this;
    }

    /**
     * Creates a SCATTER plot
     */
    scatter(x: ColumnInput, y: ColumnInput): this {
        this._plotClause = {
            plotFunction: "SCATTER",
            xColumn: this._toColumnMetadata(x),
            yColumn: this._toColumnMetadata(y)
        } as PointPlotCall;
        return this;
    }

    /**
     * Creates a PIE plot
     */
    pie(categories: ColumnInput, values: ColumnInput): this {
        this._plotClause = {
            plotFunction: "PIE",
            categoriesColumn: this._toColumnMetadata(categories),
            valuesColumn: this._toColumnMetadata(values)
        } as PiePlotCall;
        return this;
    }

    /**
     * Creates a HISTOGRAM plot
     */
    histogram(column: ColumnInput, bins?: number): this {
        this._plotClause = {
            plotFunction: "HISTOGRAM",
            column: this._toColumnMetadata(column),
            bins
        } as HistogramPlotCall;
        return this;
    }

    /**
     * Creates an AREA plot
     */
    area(x: ColumnInput, y: ColumnInput): this {
        this._plotClause = {
            plotFunction: "AREA",
            xColumn: this._toColumnMetadata(x),
            yColumn: this._toColumnMetadata(y)
        } as PointPlotCall;
        return this;
    }

    /**
     * Creates a HEATMAP plot
     */
    heatmap(x: ColumnInput, y: ColumnInput, value: ColumnInput): this {
        this._plotClause = {
            plotFunction: "HEATMAP",
            xColumn: this._toColumnMetadata(x),
            yColumn: this._toColumnMetadata(y),
            valueColumn: this._toColumnMetadata(value)
        } as HeatmapPlotCall;
        return this;
    }

    /**
     * Adds a WHERE condition
     */
    where(condition: WhereCondition): this {
        this._whereCondition = condition;
        return this;
    }

    /**
     * Sets the FROM table
     */
    from(table: string): this {
        this._fromTable = table;
        return this;
    }

    /**
     * Adds a GROUP BY clause
     */
    groupBy(column: string): this {
        this._groupKey = column;
        return this;
    }

    /**
     * Adds a HAVING condition
     */
    having(condition: HavingCondition): this {
        this._havingCondition = condition;
        return this;
    }

    /**
     * Adds an ORDER BY clause
     */
    orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): this {
        this._orderBy = { column, direction };
        return this;
    }

    /**
     * Adds a LIMIT clause
     */
    limit(limit: number, offset: number = 0): this {
        this._limitAndOffset = { limit, offset };
        return this;
    }

    /**
     * Builds the final PQL query
     */
    build(): PQLQuery {
        if (!this._plotClause) {
            throw new Error("Plot clause is required. Call bar(), line(), scatter(), etc. first.");
        }
        if (!this._fromTable) {
            throw new Error("FROM clause is required. Call from() first.");
        }

        const query: PQLQuery = {
            plotClause: this._plotClause,
            fromClause: { table: this._fromTable }
        };
        if (this._whereCondition) {
            query.whereCondition = this._whereCondition;
        }
        if (this._groupKey) {
            query.groupKey = this._groupKey;
        }
        if (this._havingCondition) {
            query.havingCondition = this._havingCondition;
        }
        if (this._orderBy) {
            query.orderBy = this._orderBy;
        }
        if (this._limitAndOffset) {
            query.limitAndOffset = this._limitAndOffset;
        }

        return query;
    }

    private _toColumnMetadata(input: ColumnInput): ColumnMetadata {
        if (typeof input === "string") {
            return { identifier: input, column: input };
        }
        return input;
    }
}

type ColumnInput = string | ColumnMetadata;

// Helper functions for building conditions

/**
 * Creates a column with an aggregation function
 */
export function agg(func: AggregationFunction, column?: string, alias?: string): ColumnMetadata {
    const identifier = alias || `${func}(${column || ""})`;
    const result: ColumnMetadata = { identifier };
    if (column) {
        result.column = column;
    }
    result.aggregationFunction = func;
    return result;
}

/**
 * Creates a column reference with optional alias
 */
export function col(column: string, alias?: string): ColumnMetadata {
    return {
        identifier: alias || column,
        column
    };
}

// Condition builders

export function and(...conditions: WhereCondition[]): WhereCondition {
    return { and: conditions };
}

export function or(...conditions: WhereCondition[]): WhereCondition {
    return { or: conditions };
}

export function not(condition: WhereCondition): WhereCondition {
    return { not: condition };
}

export function gt(key: string, value: number): WhereCondition {
    return { gt: { key, value } };
}

export function gte(key: string, value: number): WhereCondition {
    return { gte: { key, value } };
}

export function lt(key: string, value: number): WhereCondition {
    return { lt: { key, value } };
}

export function lte(key: string, value: number): WhereCondition {
    return { lte: { key, value } };
}

export function eq(key: string, value: string | number | null): WhereCondition {
    return { eq: { key, value } };
}

export function neq(key: string, value: string | number | null): WhereCondition {
    return { neq: { key, value } };
}

export function between(key: string, low: number, high: number): WhereCondition {
    return { between: { key, low, high } };
}

export function inValues(key: string, values: (string | number | null)[]): WhereCondition {
    return { in: { key, values } };
}

export function like(key: string, pattern: string): WhereCondition {
    return { like: { key, pattern } };
}

// Having condition builders

export function havingAnd(...conditions: HavingCondition[]): HavingCondition {
    return { and: conditions };
}

export function havingOr(...conditions: HavingCondition[]): HavingCondition {
    return { or: conditions };
}

export function havingAgg(
    func: AggregationFunction,
    column: string | undefined,
    operator: ">" | ">=" | "<" | "<=" | "=" | "!=",
    value: number
): HavingCondition {
    return {
        aggregation: { function: func, column },
        operator,
        value
    };
}
