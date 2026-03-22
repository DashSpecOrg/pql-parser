import {
    PQLQuery,
    PlotClause,
    ColumnMetadata,
    WhereCondition,
    HavingCondition,
    BarPlotCall,
    PointPlotCall,
    PiePlotCall,
    HistogramPlotCall,
    HeatmapPlotCall
} from "./types";

export type PrettyPrintOptions = {
    uppercase?: boolean;
    indent?: string;
    newlines?: boolean;
};

const DEFAULT_OPTIONS: PrettyPrintOptions = {
    uppercase: true,
    indent: "  ",
    newlines: true
};

/**
 * Pretty prints a PQL query AST back to string form
 */
export class PrettyPrinter {
    private _options: PrettyPrintOptions;

    constructor(options: PrettyPrintOptions = {}) {
        this._options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Formats a PQL query AST to a string
     */
    public print(query: PQLQuery): string {
        const parts: string[] = [];

        parts.push(this._printPlotClause(query.plotClause));
        parts.push(this._keyword("FROM") + " " + this._escapeIdentifier(query.fromClause.table));

        if (query.whereCondition) {
            parts.push(this._keyword("WHERE") + " " + this._printWhereCondition(query.whereCondition));
        }

        if (query.groupKey) {
            parts.push(this._keyword("GROUP") + " " + this._keyword("BY") + " " + query.groupKey);
        }

        if (query.havingCondition) {
            parts.push(this._keyword("HAVING") + " " + this._printHavingCondition(query.havingCondition));
        }

        if (query.orderBy) {
            parts.push(
                this._keyword("ORDER") + " " + this._keyword("BY") + " " + 
                query.orderBy.column + " " + 
                this._keyword(query.orderBy.direction)
            );
        }

        if (query.limitAndOffset) {
            let limitStr = this._keyword("LIMIT") + " " + query.limitAndOffset.limit;
            if (query.limitAndOffset.offset > 0) {
                limitStr += " " + this._keyword("OFFSET") + " " + query.limitAndOffset.offset;
            }
            parts.push(limitStr);
        }

        const separator = this._options.newlines ? "\n" : " ";
        return parts.join(separator);
    }

    private _printPlotClause(clause: PlotClause): string {
        const plotFunc = this._keyword("PLOT") + " " + this._keyword(clause.plotFunction);
        
        switch (clause.plotFunction) {
            case "BAR":
            case "PIE": {
                const c = clause as BarPlotCall | PiePlotCall;
                return `${plotFunc}(${this._printColumn(c.categoriesColumn)}, ${this._printColumn(c.valuesColumn)})`;
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const c = clause as PointPlotCall;
                return `${plotFunc}(${this._printColumn(c.xColumn)}, ${this._printColumn(c.yColumn)})`;
            }
            case "HISTOGRAM": {
                const c = clause as HistogramPlotCall;
                const binsPart = c.bins !== undefined ? `, ${c.bins}` : "";
                return `${plotFunc}(${this._printColumn(c.column)}${binsPart})`;
            }
            case "HEATMAP": {
                const c = clause as HeatmapPlotCall;
                return `${plotFunc}(${this._printColumn(c.xColumn)}, ${this._printColumn(c.yColumn)}, ${this._printColumn(c.valueColumn)})`;
            }
            default:
                return plotFunc + "()";
        }
    }

    private _printColumn(column: ColumnMetadata): string {
        let result: string;

        if (column.aggregationFunction) {
            const colPart = column.column || "";
            result = `${this._keyword(column.aggregationFunction)}(${colPart})`;
        } else {
            result = this._escapeIdentifier(column.column || column.identifier);
        }

        // Add AS clause if identifier differs from default
        const defaultIdentifier = column.aggregationFunction
            ? `${column.aggregationFunction}(${column.column || ""})`
            : column.column;

        if (column.identifier !== defaultIdentifier) {
            result += ` ${this._keyword("AS")} ${this._escapeIdentifier(column.identifier)}`;
        }

        return result;
    }

    private _printWhereCondition(condition: WhereCondition): string {
        if ("and" in condition) {
            const parts = condition.and.map(c => this._printWhereCondition(c));
            return parts.length > 1 ? `(${parts.join(` ${this._keyword("AND")} `)})` : parts[0];
        }
        if ("or" in condition) {
            const parts = condition.or.map(c => this._printWhereCondition(c));
            return parts.length > 1 ? `(${parts.join(` ${this._keyword("OR")} `)})` : parts[0];
        }
        if ("not" in condition) {
            return `${this._keyword("NOT")} ${this._printWhereCondition(condition.not)}`;
        }
        if ("gt" in condition) {
            return `${condition.gt.key} > ${condition.gt.value}`;
        }
        if ("gte" in condition) {
            return `${condition.gte.key} >= ${condition.gte.value}`;
        }
        if ("lt" in condition) {
            return `${condition.lt.key} < ${condition.lt.value}`;
        }
        if ("lte" in condition) {
            return `${condition.lte.key} <= ${condition.lte.value}`;
        }
        if ("eq" in condition) {
            return `${condition.eq.key} = ${this._printValue(condition.eq.value)}`;
        }
        if ("neq" in condition) {
            return `${condition.neq.key} != ${this._printValue(condition.neq.value)}`;
        }
        if ("between" in condition) {
            return `${condition.between.key} ${this._keyword("BETWEEN")} ${condition.between.low} ${this._keyword("AND")} ${condition.between.high}`;
        }
        if ("in" in condition) {
            const values = condition.in.values.map(v => this._printValue(v)).join(", ");
            return `${condition.in.key} ${this._keyword("IN")} (${values})`;
        }
        if ("like" in condition) {
            return `${condition.like.key} ${this._keyword("LIKE")} '${condition.like.pattern}'`;
        }
        return "";
    }

    private _printHavingCondition(condition: HavingCondition): string {
        if ("and" in condition) {
            const parts = condition.and.map(c => this._printHavingCondition(c));
            return parts.length > 1 ? `(${parts.join(` ${this._keyword("AND")} `)})` : parts[0];
        }
        if ("or" in condition) {
            const parts = condition.or.map(c => this._printHavingCondition(c));
            return parts.length > 1 ? `(${parts.join(` ${this._keyword("OR")} `)})` : parts[0];
        }
        if ("aggregation" in condition) {
            const aggFunc = this._keyword(condition.aggregation.function);
            const colPart = condition.aggregation.column || "";
            return `${aggFunc}(${colPart}) ${condition.operator} ${condition.value}`;
        }
        return "";
    }

    private _printValue(value: string | number | null): string {
        if (value === null) {
            return this._keyword("NULL");
        }
        if (typeof value === "string") {
            return `'${value.replace(/'/g, "\\'")}'`;
        }
        return String(value);
    }

    private _keyword(word: string): string {
        return this._options.uppercase ? word.toUpperCase() : word.toLowerCase();
    }

    private _escapeIdentifier(identifier: string): string {
        // Escape if contains special characters or starts with number
        if (/[^A-Za-z0-9_]/.test(identifier) || /^[0-9]/.test(identifier)) {
            return `\`${identifier}\``;
        }
        return identifier;
    }
}

/**
 * Convenience function to pretty print a query
 */
export function prettyPrint(query: PQLQuery, options?: PrettyPrintOptions): string {
    return new PrettyPrinter(options).print(query);
}
