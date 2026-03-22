export type TokenType = "KEYWORD" | "IDENTIFIER" | "PLOT_FUNCTION" | "LPAREN" | "RPAREN" | "COMMA" | "STRING" | "NUMBER" | "NULL" | "COMPARISON_OPERATOR" | "LOGICAL_OPERATOR" | "AGGREGATION_FUNCTION" | "COMMENT" | "EOF";
export type PlotFunction = "BAR" | "LINE" | "SCATTER" | "PIE" | "HISTOGRAM" | "AREA" | "HEATMAP";
export type AggregationFunction = "MIN" | "MAX" | "AVG" | "SUM" | "COUNT";
export type SourceLocation = {
    line: number;
    column: number;
    offset: number;
};
export type Token = {
    type: TokenType;
    value: string;
    location: SourceLocation;
};
export type PQLQuery = {
    plotClause: PlotClause;
    whereCondition?: WhereCondition;
    groupKey?: string;
    havingCondition?: HavingCondition;
    orderBy?: OrderByClause;
    limitAndOffset?: LimitAndOffset;
    location?: SourceLocation;
};
export interface PlotClause {
    plotFunction: PlotFunction;
    location?: SourceLocation;
}
export type ColumnMetadata = {
    identifier: string;
    column?: string;
    aggregationFunction?: AggregationFunction;
    location?: SourceLocation;
};
export interface BarPlotCall extends PlotClause {
    plotFunction: "BAR";
    categoriesColumn: ColumnMetadata;
    valuesColumn: ColumnMetadata;
}
export interface PointPlotCall extends PlotClause {
    plotFunction: "LINE" | "SCATTER" | "AREA";
    xColumn: ColumnMetadata;
    yColumn: ColumnMetadata;
}
export interface PiePlotCall extends PlotClause {
    plotFunction: "PIE";
    categoriesColumn: ColumnMetadata;
    valuesColumn: ColumnMetadata;
}
export interface HistogramPlotCall extends PlotClause {
    plotFunction: "HISTOGRAM";
    column: ColumnMetadata;
    bins?: number;
}
export interface HeatmapPlotCall extends PlotClause {
    plotFunction: "HEATMAP";
    xColumn: ColumnMetadata;
    yColumn: ColumnMetadata;
    valueColumn: ColumnMetadata;
}
export type PlotFunctionArg = {
    argName: string;
    columnIdentifier: string;
};
export type WhereCondition = AndCondition | OrCondition | NotCondition | GreaterThanCondition | GreaterThanOrEqualCondition | LessThanCondition | LessThanOrEqualCondition | EqualCondition | NotEqualCondition | BetweenCondition | InCondition | LikeCondition;
export type HavingCondition = HavingAndCondition | HavingOrCondition | HavingComparisonCondition;
export type HavingAndCondition = {
    and: HavingCondition[];
};
export type HavingOrCondition = {
    or: HavingCondition[];
};
export type HavingComparisonCondition = {
    aggregation: {
        function: AggregationFunction;
        column?: string;
    };
    operator: ">" | ">=" | "<" | "<=" | "=" | "!=";
    value: number;
};
export type AndCondition = {
    and: WhereCondition[];
};
export type OrCondition = {
    or: WhereCondition[];
};
export type NotCondition = {
    not: WhereCondition;
};
export type GreaterThanCondition = {
    gt: CompareKeyAndValue<number>;
};
export type GreaterThanOrEqualCondition = {
    gte: CompareKeyAndValue<number>;
};
export type LessThanCondition = {
    lt: CompareKeyAndValue<number>;
};
export type LessThanOrEqualCondition = {
    lte: CompareKeyAndValue<number>;
};
export type EqualCondition = {
    eq: CompareKeyAndValue<any>;
};
export type NotEqualCondition = {
    neq: CompareKeyAndValue<any>;
};
export type BetweenCondition = {
    between: {
        key: string;
        low: number;
        high: number;
    };
};
export type InCondition = {
    in: {
        key: string;
        values: (string | number | null)[];
    };
};
export type LikeCondition = {
    like: {
        key: string;
        pattern: string;
    };
};
export type CompareKeyAndValue<T> = {
    key: string;
    value: T;
};
export type OrderByClause = {
    column: string;
    direction: "ASC" | "DESC";
};
export type LimitAndOffset = {
    limit: number;
    offset: number;
};
export interface ASTVisitor<T> {
    visitQuery(query: PQLQuery): T;
    visitPlotClause(clause: PlotClause): T;
    visitColumnMetadata(column: ColumnMetadata): T;
    visitWhereCondition(condition: WhereCondition): T;
    visitHavingCondition(condition: HavingCondition): T;
    visitOrderByClause(orderBy: OrderByClause): T;
    visitLimitAndOffset(limitOffset: LimitAndOffset): T;
}
