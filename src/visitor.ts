import {
    PQLQuery,
    PlotClause,
    FromClause,
    ColumnMetadata,
    WhereCondition,
    HavingCondition,
    OrderByClause,
    LimitAndOffset,
    ASTVisitor,
    BarPlotCall,
    PointPlotCall,
    PiePlotCall,
    HistogramPlotCall,
    HeatmapPlotCall
} from "./types";

/**
 * Base visitor class with default implementations that traverse the AST
 */
export abstract class BaseVisitor<T> implements ASTVisitor<T> {
    abstract visitQuery(query: PQLQuery): T;
    abstract visitPlotClause(clause: PlotClause): T;
    abstract visitFromClause(from: FromClause): T;
    abstract visitColumnMetadata(column: ColumnMetadata): T;
    abstract visitWhereCondition(condition: WhereCondition): T;
    abstract visitHavingCondition(condition: HavingCondition): T;
    abstract visitOrderByClause(orderBy: OrderByClause): T;
    abstract visitLimitAndOffset(limitOffset: LimitAndOffset): T;
}

/**
 * Visitor that collects all column names referenced in a query
 */
export class ColumnCollector extends BaseVisitor<string[]> {
    private _columns: Set<string> = new Set();

    visitQuery(query: PQLQuery): string[] {
        this._columns.clear();
        this.visitPlotClause(query.plotClause);
        this.visitFromClause(query.fromClause);

        if (query.whereCondition) {
            this.visitWhereCondition(query.whereCondition);
        }
        if (query.groupKey) {
            this._columns.add(query.groupKey);
        }
        if (query.havingCondition) {
            this.visitHavingCondition(query.havingCondition);
        }
        if (query.orderBy) {
            this.visitOrderByClause(query.orderBy);
        }
        
        return Array.from(this._columns);
    }

    visitPlotClause(clause: PlotClause): string[] {
        switch (clause.plotFunction) {
            case "BAR":
            case "PIE": {
                const c = clause as BarPlotCall | PiePlotCall;
                this.visitColumnMetadata(c.categoriesColumn);
                this.visitColumnMetadata(c.valuesColumn);
                break;
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const c = clause as PointPlotCall;
                this.visitColumnMetadata(c.xColumn);
                this.visitColumnMetadata(c.yColumn);
                break;
            }
            case "HISTOGRAM": {
                const c = clause as HistogramPlotCall;
                this.visitColumnMetadata(c.column);
                break;
            }
            case "HEATMAP": {
                const c = clause as HeatmapPlotCall;
                this.visitColumnMetadata(c.xColumn);
                this.visitColumnMetadata(c.yColumn);
                this.visitColumnMetadata(c.valueColumn);
                break;
            }
        }
        return Array.from(this._columns);
    }

    visitColumnMetadata(column: ColumnMetadata): string[] {
        if (column.column) {
            this._columns.add(column.column);
        }
        return Array.from(this._columns);
    }

    visitWhereCondition(condition: WhereCondition): string[] {
        if ("and" in condition) {
            condition.and.forEach(c => this.visitWhereCondition(c));
        } else if ("or" in condition) {
            condition.or.forEach(c => this.visitWhereCondition(c));
        } else if ("not" in condition) {
            this.visitWhereCondition(condition.not);
        } else if ("gt" in condition) {
            this._columns.add(condition.gt.key);
        } else if ("gte" in condition) {
            this._columns.add(condition.gte.key);
        } else if ("lt" in condition) {
            this._columns.add(condition.lt.key);
        } else if ("lte" in condition) {
            this._columns.add(condition.lte.key);
        } else if ("eq" in condition) {
            this._columns.add(condition.eq.key);
        } else if ("neq" in condition) {
            this._columns.add(condition.neq.key);
        } else if ("between" in condition) {
            this._columns.add(condition.between.key);
        } else if ("in" in condition) {
            this._columns.add(condition.in.key);
        } else if ("like" in condition) {
            this._columns.add(condition.like.key);
        }
        return Array.from(this._columns);
    }

    visitHavingCondition(condition: HavingCondition): string[] {
        if ("and" in condition) {
            condition.and.forEach(c => this.visitHavingCondition(c));
        } else if ("or" in condition) {
            condition.or.forEach(c => this.visitHavingCondition(c));
        } else if ("aggregation" in condition) {
            if (condition.aggregation.column) {
                this._columns.add(condition.aggregation.column);
            }
        }
        return Array.from(this._columns);
    }

    visitOrderByClause(orderBy: OrderByClause): string[] {
        this._columns.add(orderBy.column);
        return Array.from(this._columns);
    }

    visitFromClause(_from: FromClause): string[] {
        return Array.from(this._columns);
    }

    visitLimitAndOffset(_limitOffset: LimitAndOffset): string[] {
        return Array.from(this._columns);
    }
}

/**
 * Visitor that checks if a query uses aggregation functions
 */
export class AggregationChecker extends BaseVisitor<boolean> {
    private _hasAggregation = false;

    visitQuery(query: PQLQuery): boolean {
        this._hasAggregation = false;
        this.visitPlotClause(query.plotClause);
        return this._hasAggregation;
    }

    visitPlotClause(clause: PlotClause): boolean {
        switch (clause.plotFunction) {
            case "BAR":
            case "PIE": {
                const c = clause as BarPlotCall | PiePlotCall;
                this.visitColumnMetadata(c.categoriesColumn);
                this.visitColumnMetadata(c.valuesColumn);
                break;
            }
            case "LINE":
            case "SCATTER":
            case "AREA": {
                const c = clause as PointPlotCall;
                this.visitColumnMetadata(c.xColumn);
                this.visitColumnMetadata(c.yColumn);
                break;
            }
            case "HISTOGRAM": {
                const c = clause as HistogramPlotCall;
                this.visitColumnMetadata(c.column);
                break;
            }
            case "HEATMAP": {
                const c = clause as HeatmapPlotCall;
                this.visitColumnMetadata(c.xColumn);
                this.visitColumnMetadata(c.yColumn);
                this.visitColumnMetadata(c.valueColumn);
                break;
            }
        }
        return this._hasAggregation;
    }

    visitColumnMetadata(column: ColumnMetadata): boolean {
        if (column.aggregationFunction) {
            this._hasAggregation = true;
        }
        return this._hasAggregation;
    }

    visitWhereCondition(_condition: WhereCondition): boolean {
        return this._hasAggregation;
    }

    visitFromClause(_from: FromClause): boolean {
        return this._hasAggregation;
    }

    visitHavingCondition(_condition: HavingCondition): boolean {
        return this._hasAggregation;
    }

    visitOrderByClause(_orderBy: OrderByClause): boolean {
        return this._hasAggregation;
    }

    visitLimitAndOffset(_limitOffset: LimitAndOffset): boolean {
        return this._hasAggregation;
    }
}
