"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const exceptions_1 = require("./exceptions");
/**
 * Parser for PQL queries
 */
class Parser {
    constructor(lexer) {
        this._lexer = lexer;
        this._currentToken = this._lexer.nextToken();
    }
    /**
     * Parses the PQL query into a syntax tree
     */
    parse() {
        const location = this._currentToken.location;
        const query = {
            plotClause: this._consumePlotClause(),
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
    _consumePlotClause() {
        const location = this._currentToken.location;
        this._consumeToken("KEYWORD", "PLOT");
        const plotFunction = this._consumeToken("PLOT_FUNCTION").value;
        this._consumeToken("LPAREN");
        const plotClause = this._consumePlotArgs(plotFunction, location);
        this._consumeToken("RPAREN");
        return plotClause;
    }
    _consumePlotArgs(plotFunction, location) {
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
                    };
                }
                return {
                    plotFunction,
                    categoriesColumn,
                    valuesColumn,
                    location
                };
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
                };
            }
            case "HISTOGRAM": {
                const column = this._consumeColumn();
                let bins;
                if (this._currentToken.type === "COMMA") {
                    this._consumeToken("COMMA");
                    bins = Number(this._consumeToken("NUMBER").value);
                }
                return {
                    plotFunction,
                    column,
                    bins,
                    location
                };
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
                };
            }
            default:
                throw new exceptions_1.ParserError(`Invalid plot type '${plotFunction}'`, location, `Valid plot types are: BAR, LINE, SCATTER, PIE, HISTOGRAM, AREA, HEATMAP`);
        }
    }
    _consumeColumn() {
        const location = this._currentToken.location;
        let column = undefined;
        let aggregationFunction = undefined;
        if (this._currentToken.type === "AGGREGATION_FUNCTION") {
            aggregationFunction = this._consumeToken("AGGREGATION_FUNCTION").value;
            this._consumeToken("LPAREN");
            if (aggregationFunction !== "COUNT") {
                column = this._consumeToken("IDENTIFIER").value;
            }
            this._consumeToken("RPAREN");
        }
        else {
            column = this._consumeToken("IDENTIFIER").value;
        }
        let identifier = undefined;
        if (this._currentToken.value === "AS") {
            this._consumeToken("KEYWORD");
            identifier = this._consumeToken("IDENTIFIER").value;
        }
        if (!identifier) {
            if (aggregationFunction) {
                identifier = `${aggregationFunction}(${column !== null && column !== void 0 ? column : ""})`;
            }
            else {
                identifier = column;
            }
        }
        const columnMetadata = { identifier, location };
        if (column) {
            columnMetadata.column = column;
        }
        if (aggregationFunction) {
            columnMetadata.aggregationFunction = aggregationFunction;
        }
        return columnMetadata;
    }
    _consumeCondition() {
        const filters = [];
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
    _consumeConditionGroup() {
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
    _consumeComparison() {
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
            const values = [];
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
                throw new exceptions_1.ParserError(`Invalid comparison operator '${comparisonOperator}'`, this._currentToken.location);
        }
    }
    _consumeHavingCondition() {
        const conditions = [];
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
    _consumeHavingConditionGroup() {
        if (this._currentToken.type === "AGGREGATION_FUNCTION") {
            return this._consumeHavingComparison();
        }
        this._consumeToken("LPAREN");
        const condition = this._consumeHavingCondition();
        this._consumeToken("RPAREN");
        return condition;
    }
    _consumeHavingComparison() {
        const aggFunction = this._consumeToken("AGGREGATION_FUNCTION").value;
        this._consumeToken("LPAREN");
        let column;
        if (aggFunction !== "COUNT") {
            column = this._consumeToken("IDENTIFIER").value;
        }
        this._consumeToken("RPAREN");
        const operator = this._consumeToken("COMPARISON_OPERATOR").value;
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
    _consumeOrderByClause() {
        this._consumeToken("KEYWORD", "ORDER");
        this._consumeToken("KEYWORD", "BY");
        const column = this._consumeToken("IDENTIFIER").value;
        let direction = "ASC";
        if (this._currentToken.value === "ASC" || this._currentToken.value === "DESC") {
            direction = this._consumeToken("KEYWORD").value;
        }
        return { column, direction };
    }
    _consumeLimitAndOffsetClause() {
        this._consumeToken("KEYWORD");
        const limit = Number(this._consumeToken("NUMBER").value);
        if (this._currentToken.value !== "OFFSET") {
            return { limit, offset: 0 };
        }
        this._consumeToken("KEYWORD");
        const offset = Number(this._consumeToken("NUMBER").value);
        return { limit, offset };
    }
    _consumeToken(tokenType, value) {
        const token = this._currentToken;
        if (token.type === tokenType && (!value || token.value === value)) {
            this._currentToken = this._lexer.nextToken();
            return token;
        }
        else {
            const expected = value ? `'${value}'` : tokenType;
            const got = token.value ? `'${token.value}'` : token.type;
            throw new exceptions_1.ParserError(`Expected ${expected} but got ${got}`, token.location, this._getTokenSuggestion(tokenType, token));
        }
    }
    _consumeComparisonValue() {
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
                throw new exceptions_1.ParserError("Expected string, number, or NULL", token.location);
        }
    }
    _getTokenSuggestion(expected, got) {
        if (expected === "KEYWORD" && got.type === "IDENTIFIER") {
            const keywords = ["PLOT", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "LIMIT", "OFFSET", "AS", "BETWEEN", "IN", "LIKE"];
            const similar = keywords.find(k => k.toLowerCase().startsWith(got.value.toLowerCase()) ||
                got.value.toLowerCase().startsWith(k.toLowerCase()));
            if (similar) {
                return `Did you mean '${similar}'?`;
            }
        }
        return undefined;
    }
}
exports.Parser = Parser;
