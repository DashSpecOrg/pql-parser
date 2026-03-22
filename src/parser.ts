import {
    AggregationFunction,
    LimitAndOffset,
    PlotFunction,
    Token,
    TokenType,
    PQLQuery,
    PlotClause,
    ColumnMetadata,
    WhereCondition,
    HavingCondition,
    BarPlotCall,
    PointPlotCall,
    PiePlotCall,
    HistogramPlotCall,
    HeatmapPlotCall,
    OrderByClause,
    SourceLocation
} from './types';
import { Lexer } from './lexer';
import { ParserError } from './exceptions';

/**
 * Parser for PQL queries
 */
export class Parser {
    private _lexer: Lexer;
    private _currentToken: Token;

    constructor(lexer: Lexer) {
        this._lexer = lexer;
        this._currentToken = this._lexer.nextToken();
    }

    /**
     * Parses the PQL query into a syntax tree
     */
    public parse(): PQLQuery {
        const location = this._currentToken.location;
        const plotClause = this._consumePlotClause();

        this._consumeToken("KEYWORD", "FROM");
        const tableLoc = this._currentToken.location;
        const table = this._consumeToken("IDENTIFIER").value;

        const query: PQLQuery = {
            plotClause,
            fromClause: { table, location: tableLoc },
            location
        };

        if (this._currentToken.value === "WHERE") {
            this._consumeToken("KEYWORD");
            query.whereCondition = this._consumeCondition();
        }

        if (this._currentToken.value === "GROUP") {
            this._consumeToken("KEYWORD");
            this._consumeToken("KEYWORD", "BY");
            query.groupKey = this._consumeToken("IDENTIFIER").value;
        }

        if (this._currentToken.value === "HAVING") {
            this._consumeToken("KEYWORD");
            query.havingCondition = this._consumeHavingCondition();
        }

        if (this._currentToken.value === "ORDER") {
            query.orderBy = this._consumeOrderByClause();
        }

        if (this._currentToken.value === "LIMIT") {
            query.limitAndOffset = this._consumeLimitAndOffsetClause();
        }

        this._consumeToken("EOF");
        return query;
    }

    private _consumePlotClause(): PlotClause {
        const location = this._currentToken.location;
        this._consumeToken("KEYWORD", "PLOT");
        const plotFunction = <PlotFunction>this._consumeToken("PLOT_FUNCTION").value;
        this._consumeToken("LPAREN");
        const plotClause = this._consumePlotArgs(plotFunction, location);
        this._consumeToken("RPAREN");
        return plotClause;
    }

    private _consumePlotArgs(plotFunction: PlotFunction, location: SourceLocation): PlotClause {
        switch (plotFunction) {
            case "BAR":
            case "PIE": {
                const categoriesColumn = this._consumeColumn();
                this._consumeToken("COMMA");
                const valuesColumn = this._consumeColumn();
                if (plotFunction === "PIE") {
                    return {
                        plotFunction,
                        categoriesColumn,
                        valuesColumn,
                        location
                    } as PiePlotCall;
                }
                return {
                    plotFunction,
                    categoriesColumn,
                    valuesColumn,
                    location
                } as BarPlotCall;
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const xColumn = this._consumeColumn();
                this._consumeToken("COMMA");
                const yColumn = this._consumeColumn();
                return {
                    plotFunction,
                    xColumn,
                    yColumn,
                    location
                } as PointPlotCall;
            }
            case "HISTOGRAM": {
                const column = this._consumeColumn();
                let bins: number | undefined;
                if (this._currentToken.type === "COMMA") {
                    this._consumeToken("COMMA");
                    bins = Number(this._consumeToken("NUMBER").value);
                }
                return {
                    plotFunction,
                    column,
                    bins,
                    location
                } as HistogramPlotCall;
            }
            case "HEATMAP": {
                const xColumn = this._consumeColumn();
                this._consumeToken("COMMA");
                const yColumn = this._consumeColumn();
                this._consumeToken("COMMA");
                const valueColumn = this._consumeColumn();
                return {
                    plotFunction,
                    xColumn,
                    yColumn,
                    valueColumn,
                    location
                } as HeatmapPlotCall;
            }
            default:
                throw new ParserError(
                    `Invalid plot type '${plotFunction}'`,
                    location,
                    `Valid plot types are: BAR, LINE, SCATTER, PIE, HISTOGRAM, AREA, HEATMAP`
                );
        }
    }

    private _consumeColumn(): ColumnMetadata {
        const location = this._currentToken.location;
        let column: string | undefined = undefined;
        let aggregationFunction: AggregationFunction | undefined = undefined;

        if (this._currentToken.type === "AGGREGATION_FUNCTION") {
            aggregationFunction = <AggregationFunction>this._consumeToken("AGGREGATION_FUNCTION").value;
            this._consumeToken("LPAREN");
            if (aggregationFunction !== "COUNT") {
                column = this._consumeToken("IDENTIFIER").value;
            }
            this._consumeToken("RPAREN");
        } else {
            column = this._consumeToken("IDENTIFIER").value;
        }

        let identifier: string | undefined = undefined;
        if (this._currentToken.value === "AS") {
            this._consumeToken("KEYWORD");
            identifier = this._consumeToken("IDENTIFIER").value;
        }

        if (!identifier) {
            if (aggregationFunction) {
                identifier = `${aggregationFunction}(${column ?? ""})`;
            } else {
                identifier = column!;
            }
        }

        const columnMetadata: ColumnMetadata = { identifier, location };
        if (column) {
            columnMetadata.column = column;
        }
        if (aggregationFunction) {
            columnMetadata.aggregationFunction = aggregationFunction;
        }
        return columnMetadata;
    }

    private _consumeCondition(): WhereCondition {
        const filters: WhereCondition[] = [];

        while (true) {
            const innerConditions = [this._consumeConditionGroup()];
            while (this._currentToken.value === "AND") {
                this._consumeToken("LOGICAL_OPERATOR");
                innerConditions.push(this._consumeConditionGroup());
            }
            const innerCondition = innerConditions.length === 1
                ? innerConditions[0]
                : { and: innerConditions };
            filters.push(innerCondition);
            if (this._currentToken.value !== "OR") {
                break;
            }
            this._currentToken = this._lexer.nextToken();
        }

        if (filters.length === 1) {
            return filters[0];
        }

        return { or: filters };
    }

    private _consumeConditionGroup(): WhereCondition {
        // Handle NOT operator
        if (this._currentToken.value === "NOT") {
            this._consumeToken("LOGICAL_OPERATOR");
            return { not: this._consumeConditionGroup() };
        }

        if (this._currentToken.type === "IDENTIFIER") {
            return this._consumeComparison();
        }
        this._consumeToken("LPAREN");
        const condition = this._consumeCondition();
        this._consumeToken("RPAREN");
        return condition;
    }

    private _consumeComparison(): WhereCondition {
        const key = this._consumeToken("IDENTIFIER").value;

        // Handle BETWEEN
        if (this._currentToken.value === "BETWEEN") {
            this._consumeToken("KEYWORD");
            const low = Number(this._consumeToken("NUMBER").value);
            this._consumeToken("LOGICAL_OPERATOR", "AND");
            const high = Number(this._consumeToken("NUMBER").value);
            return { between: { key, low, high } };
        }

        // Handle IN
        if (this._currentToken.value === "IN") {
            this._consumeToken("KEYWORD");
            this._consumeToken("LPAREN");
            const values: (string | number | null)[] = [];
            values.push(this._consumeComparisonValue());
            while (this._currentToken.type === "COMMA") {
                this._consumeToken("COMMA");
                values.push(this._consumeComparisonValue());
            }
            this._consumeToken("RPAREN");
            return { in: { key, values } };
        }

        // Handle LIKE
        if (this._currentToken.value === "LIKE") {
            this._consumeToken("KEYWORD");
            const pattern = this._consumeToken("STRING").value;
            return { like: { key, pattern } };
        }

        const comparisonOperator = this._consumeToken("COMPARISON_OPERATOR").value;

        let value;
        switch (comparisonOperator) {
            case ">":
                value = Number(this._consumeToken("NUMBER").value);
                return { gt: { key, value } };
            case ">=":
                value = Number(this._consumeToken("NUMBER").value);
                return { gte: { key, value } };
            case "<":
                value = Number(this._consumeToken("NUMBER").value);
                return { lt: { key, value } };
            case "<=":
                value = Number(this._consumeToken("NUMBER").value);
                return { lte: { key, value } };
            case "=":
                return { eq: { key, value: this._consumeComparisonValue() } };
            case "!=":
            case "<>":
                return { neq: { key, value: this._consumeComparisonValue() } };
            default:
                throw new ParserError(
                    `Invalid comparison operator '${comparisonOperator}'`,
                    this._currentToken.location
                );
        }
    }

    private _consumeHavingCondition(): HavingCondition {
        const conditions: HavingCondition[] = [];

        while (true) {
            const innerConditions = [this._consumeHavingConditionGroup()];
            while (this._currentToken.value === "AND") {
                this._consumeToken("LOGICAL_OPERATOR");
                innerConditions.push(this._consumeHavingConditionGroup());
            }
            const innerCondition = innerConditions.length === 1
                ? innerConditions[0]
                : { and: innerConditions };
            conditions.push(innerCondition);
            if (this._currentToken.value !== "OR") {
                break;
            }
            this._currentToken = this._lexer.nextToken();
        }

        if (conditions.length === 1) {
            return conditions[0];
        }

        return { or: conditions };
    }

    private _consumeHavingConditionGroup(): HavingCondition {
        if (this._currentToken.type === "AGGREGATION_FUNCTION") {
            return this._consumeHavingComparison();
        }
        this._consumeToken("LPAREN");
        const condition = this._consumeHavingCondition();
        this._consumeToken("RPAREN");
        return condition;
    }

    private _consumeHavingComparison(): HavingCondition {
        const aggFunction = <AggregationFunction>this._consumeToken("AGGREGATION_FUNCTION").value;
        this._consumeToken("LPAREN");
        let column: string | undefined;
        if (aggFunction !== "COUNT") {
            column = this._consumeToken("IDENTIFIER").value;
        }
        this._consumeToken("RPAREN");

        const operator = this._consumeToken("COMPARISON_OPERATOR").value as ">" | ">=" | "<" | "<=" | "=" | "!=";
        const value = Number(this._consumeToken("NUMBER").value);

        return {
            aggregation: {
                function: aggFunction,
                column
            },
            operator,
            value
        };
    }

    private _consumeOrderByClause(): OrderByClause {
        this._consumeToken("KEYWORD", "ORDER");
        this._consumeToken("KEYWORD", "BY");
        const column = this._consumeToken("IDENTIFIER").value;
        let direction: "ASC" | "DESC" = "ASC";
        
        if (this._currentToken.value === "ASC" || this._currentToken.value === "DESC") {
            direction = this._consumeToken("KEYWORD").value as "ASC" | "DESC";
        }

        return { column, direction };
    }

    private _consumeLimitAndOffsetClause(): LimitAndOffset {
        this._consumeToken("KEYWORD");
        const limit = Number(this._consumeToken("NUMBER").value);
        if (this._currentToken.value !== "OFFSET") {
            return { limit, offset: 0 };
        }
        this._consumeToken("KEYWORD");
        const offset = Number(this._consumeToken("NUMBER").value);
        return { limit, offset };
    }

    private _consumeToken(tokenType: TokenType, value?: string): Token {
        const token = this._currentToken;
        if (token.type === tokenType && (!value || token.value === value)) {
            this._currentToken = this._lexer.nextToken();
            return token;
        } else {
            const expected = value ? `'${value}'` : tokenType;
            const got = token.value ? `'${token.value}'` : token.type;
            throw new ParserError(
                `Expected ${expected} but got ${got}`,
                token.location,
                this._getTokenSuggestion(tokenType, token)
            );
        }
    }

    private _consumeComparisonValue(): string | number | null {
        const token = this._currentToken;
        this._currentToken = this._lexer.nextToken();
        switch (token.type) {
            case "STRING":
                return token.value;
            case "NUMBER":
                return Number(token.value);
            case "NULL":
                return null;
            default:
                throw new ParserError(
                    "Expected string, number, or NULL",
                    token.location
                );
        }
    }

    private _getTokenSuggestion(expected: TokenType, got: Token): string | undefined {
        if (expected === "KEYWORD" && got.type === "IDENTIFIER") {
            const keywords = ["PLOT", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "LIMIT", "OFFSET", "AS", "BETWEEN", "IN", "LIKE"];
            const similar = keywords.find(k => 
                k.toLowerCase().startsWith(got.value.toLowerCase()) ||
                got.value.toLowerCase().startsWith(k.toLowerCase())
            );
            if (similar) {
                return `Did you mean '${similar}'?`;
            }
        }
        return undefined;
    }
}
