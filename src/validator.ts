import { ValidationError } from "./exceptions";
import {
    PQLQuery,
    PlotClause,
    BarPlotCall,
    PointPlotCall,
    PiePlotCall,
    HistogramPlotCall,
    HeatmapPlotCall,
    ColumnMetadata
} from "./types";

export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
};

/**
 * Validates PQL queries for semantic correctness
 */
export class Validator {
    /**
     * Validates a parsed PQL query
     */
    public validate(query: PQLQuery): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        this._validatePlotClause(query.plotClause, query, errors, warnings);
        this._validateAggregationConsistency(query, errors, warnings);
        this._validateHavingClause(query, errors, warnings);
        this._validateLimitOffset(query, errors, warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    private _validatePlotClause(
        clause: PlotClause,
        query: PQLQuery,
        errors: ValidationError[],
        warnings: string[]
    ): void {
        switch (clause.plotFunction) {
            case "BAR":
            case "PIE": {
                const c = clause as BarPlotCall | PiePlotCall;
                this._validateColumnForPlot(c.categoriesColumn, "categories", query, errors);
                this._validateColumnForPlot(c.valuesColumn, "values", query, errors);
                break;
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const c = clause as PointPlotCall;
                this._validateColumnForPlot(c.xColumn, "x", query, errors);
                this._validateColumnForPlot(c.yColumn, "y", query, errors);
                break;
            }
            case "HISTOGRAM": {
                const c = clause as HistogramPlotCall;
                if (c.column.aggregationFunction) {
                    errors.push(new ValidationError(
                        "HISTOGRAM column should not use aggregation functions",
                        c.column.location
                    ));
                }
                if (c.bins !== undefined && c.bins <= 0) {
                    errors.push(new ValidationError(
                        "HISTOGRAM bins must be a positive number",
                        clause.location
                    ));
                }
                break;
            }
            case "HEATMAP": {
                const c = clause as HeatmapPlotCall;
                this._validateColumnForPlot(c.xColumn, "x", query, errors);
                this._validateColumnForPlot(c.yColumn, "y", query, errors);
                this._validateColumnForPlot(c.valueColumn, "value", query, errors);
                break;
            }
        }
    }

    private _validateColumnForPlot(
        column: ColumnMetadata,
        role: string,
        query: PQLQuery,
        errors: ValidationError[]
    ): void {
        // If there's a GROUP BY, value columns should have aggregation
        if (query.groupKey && role === "values" && !column.aggregationFunction) {
            errors.push(new ValidationError(
                `Column '${column.identifier}' should use an aggregation function when GROUP BY is present`,
                column.location,
                `Try using SUM(${column.column}), AVG(${column.column}), etc.`
            ));
        }

        // If there's no GROUP BY, columns shouldn't have aggregation (except COUNT)
        if (!query.groupKey && column.aggregationFunction) {
            errors.push(new ValidationError(
                `Aggregation function ${column.aggregationFunction} requires a GROUP BY clause`,
                column.location,
                `Add 'GROUPBY ${column.column || 'column_name'}' to your query`
            ));
        }
    }

    private _validateAggregationConsistency(
        query: PQLQuery,
        errors: ValidationError[],
        warnings: string[]
    ): void {
        const columns = this._getPlotColumns(query.plotClause);
        const hasAggregation = columns.some(c => c.aggregationFunction);
        const hasNonAggregation = columns.some(c => !c.aggregationFunction && c.column);

        if (hasAggregation && hasNonAggregation && !query.groupKey) {
            warnings.push(
                "Query mixes aggregated and non-aggregated columns without GROUP BY. " +
                "This may produce unexpected results."
            );
        }
    }

    private _validateHavingClause(
        query: PQLQuery,
        errors: ValidationError[],
        _warnings: string[]
    ): void {
        if (query.havingCondition && !query.groupKey) {
            errors.push(new ValidationError(
                "HAVING clause requires a GROUP BY clause",
                query.location,
                "Add a GROUP BY clause or remove the HAVING clause"
            ));
        }
    }

    private _validateLimitOffset(
        query: PQLQuery,
        errors: ValidationError[],
        _warnings: string[]
    ): void {
        if (query.limitAndOffset) {
            if (query.limitAndOffset.limit < 0) {
                errors.push(new ValidationError(
                    "LIMIT must be a non-negative number",
                    query.location
                ));
            }
            if (query.limitAndOffset.offset < 0) {
                errors.push(new ValidationError(
                    "OFFSET must be a non-negative number",
                    query.location
                ));
            }
        }
    }

    private _getPlotColumns(clause: PlotClause): ColumnMetadata[] {
        switch (clause.plotFunction) {
            case "BAR":
            case "PIE": {
                const c = clause as BarPlotCall | PiePlotCall;
                return [c.categoriesColumn, c.valuesColumn];
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const c = clause as PointPlotCall;
                return [c.xColumn, c.yColumn];
            }
            case "HISTOGRAM": {
                const c = clause as HistogramPlotCall;
                return [c.column];
            }
            case "HEATMAP": {
                const c = clause as HeatmapPlotCall;
                return [c.xColumn, c.yColumn, c.valueColumn];
            }
            default:
                return [];
        }
    }
}
