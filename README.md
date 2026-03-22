# pql-parser

Plot query language parser.

A 2D plot generation tool made with this parser is hosted at <a href="https://devtools.joeyshi.xyz/csv_vis">https://devtools.joeyshi.xyz/pql_compiler</a>.

## Installation

```bash
npm install pql-parser
```

## Usage

### Parsing Queries

```typescript
import { Lexer, Parser } from 'pql-parser';

const query = new Parser(new Lexer("PLOT BAR(category, SUM(value)) WHERE status = 'active' GROUPBY category")).parse();
```

### Query Builder API

Build queries programmatically instead of parsing strings:

```typescript
import { QueryBuilder, agg, eq, gt, and, between } from 'pql-parser';

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
```

### Pretty Printing

Convert AST back to formatted query string:

```typescript
import { prettyPrint } from 'pql-parser';

const formatted = prettyPrint(query, { uppercase: true, newlines: true });
```

### Validation

Validate queries for semantic correctness:

```typescript
import { Validator } from 'pql-parser';

const validator = new Validator();
const result = validator.validate(query);

if (!result.valid) {
    console.log(result.errors);
}
```

### Visitor Pattern

Traverse and analyze the AST:

```typescript
import { ColumnCollector, AggregationChecker } from 'pql-parser';

const columns = new ColumnCollector().visitQuery(query);
const hasAggregation = new AggregationChecker().visitQuery(query);
```

## Syntax

```
PLOT <plot_function>
[WHERE <condition>]
[GROUP BY <column>]
[HAVING <aggregation_condition>]
[ORDER BY <column> [ASC|DESC]]
[LIMIT <limit> [OFFSET <offset>]]
```

### Plot Functions

| Function | Syntax | Description |
|----------|--------|-------------|
| BAR | `BAR(category, value)` | Bar chart |
| LINE | `LINE(x, y)` | Line chart |
| SCATTER | `SCATTER(x, y)` | Scatter plot |
| PIE | `PIE(category, value)` | Pie chart |
| HISTOGRAM | `HISTOGRAM(column [, bins])` | Histogram |
| AREA | `AREA(x, y)` | Area chart |
| HEATMAP | `HEATMAP(x, y, value)` | Heatmap |

### Aggregation Functions

- `MIN(column)` - Minimum value
- `MAX(column)` - Maximum value
- `AVG(column)` - Average value
- `SUM(column)` - Sum of values
- `COUNT()` - Count of rows

### WHERE Conditions

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `col = 'value'` | Equal |
| `!=`, `<>` | `col != 5` | Not equal |
| `>`, `>=` | `col > 10` | Greater than |
| `<`, `<=` | `col < 100` | Less than |
| `BETWEEN` | `col BETWEEN 1 AND 10` | Range check |
| `IN` | `col IN ('a', 'b', 'c')` | Set membership |
| `LIKE` | `col LIKE 'test%'` | Pattern matching |
| `AND` | `a > 0 AND b < 10` | Logical AND |
| `OR` | `a = 1 OR b = 2` | Logical OR |
| `NOT` | `NOT col > 5` | Logical NOT |

### Comments

```sql
-- This is a line comment
PLOT BAR(x, y) /* This is a block comment */ WHERE z > 0
```

## Examples

### Simple Bar Chart
```sql
PLOT BAR(category, value)
```

### Aggregated Data with Filtering
```sql
PLOT BAR(region, SUM(sales) AS total_sales)
WHERE year >= 2020
GROUP BY region
HAVING SUM(sales) > 10000
ORDER BY total_sales DESC
LIMIT 10
```

### Time Series Line Chart
```sql
PLOT LINE(date, price)
WHERE symbol = 'AAPL' AND date BETWEEN 2020 AND 2025
ORDER BY date ASC
```

### Scatter Plot with Multiple Conditions
```sql
PLOT SCATTER(height, weight)
WHERE age BETWEEN 18 AND 65 AND gender IN ('M', 'F')
```

### Heatmap
```sql
PLOT HEATMAP(hour, day_of_week, AVG(temperature))
GROUP BY hour
```

## EBNF

```
<plot_statement> ::= "PLOT" <plot_call> [<where_clause>] [<group_by_clause>] [<having_clause>] [<order_by_clause>] [<limit_and_offset_clause>]

<plot_clause> ::= <bar_call> | <line_call> | <scatter_call> | <pie_call> | <histogram_call> | <area_call> | <heatmap_call>

<bar_call> ::= "BAR" "(" <attribute> "," <attribute> ")"
<line_call> ::= "LINE" "(" <attribute> "," <attribute> ")"
<scatter_call> ::= "SCATTER" "(" <attribute> "," <attribute> ")"
<pie_call> ::= "PIE" "(" <attribute> "," <attribute> ")"
<histogram_call> ::= "HISTOGRAM" "(" <attribute> ["," <number>] ")"
<area_call> ::= "AREA" "(" <attribute> "," <attribute> ")"
<heatmap_call> ::= "HEATMAP" "(" <attribute> "," <attribute> "," <attribute> ")"

<where_clause> ::= "WHERE" <where_condition>
<group_by_clause> ::= "GROUP" "BY" <identifier>
<having_clause> ::= "HAVING" <having_condition>
<order_by_clause> ::= "ORDER" "BY" <identifier> ["ASC" | "DESC"]
<limit_and_offset_clause> ::= "LIMIT" <number> ["OFFSET" <number>]

<attribute> ::= <aggregated_column> ["AS" <identifier>]
<aggregated_column> ::= <aggregation_function> "(" [<identifier>] ")" | <identifier>
<aggregation_function> ::= "MIN" | "MAX" | "AVG" | "COUNT" | "SUM"

<where_condition> ::= <where_condition_group> { ("AND" | "OR") <where_condition_group> }
<where_condition_group> ::= <comparison> | <between_condition> | <in_condition> | <like_condition> | "NOT" <where_condition_group> | "(" <where_condition> ")"

<comparison> ::= <identifier> <comparison_operator> <value>
<between_condition> ::= <identifier> "BETWEEN" <number> "AND" <number>
<in_condition> ::= <identifier> "IN" "(" <value> {"," <value>} ")"
<like_condition> ::= <identifier> "LIKE" <string>

<having_condition> ::= <having_condition_group> { ("AND" | "OR") <having_condition_group> }
<having_condition_group> ::= <aggregated_column> <comparison_operator> <number> | "(" <having_condition> ")"

<comparison_operator> ::= ">" | "<" | ">=" | "<=" | "=" | "!=" | "<>"

<value> ::= <number> | <string> | "NULL"
<number> ::= ["-"] <digit> {<digit>} ["." <digit> {<digit>}]
<string> ::= "'" {<any_char>} "'"
<identifier> ::= <alphabetic> {<alphabetic> | <digit> | "_"} | "`" {<any_char>} "`"

<digit> ::= "0" | ... | "9"
<alphabetic> ::= "A" | ... | "Z" | "a" | ... | "z"
```

## API Reference

### Classes

- `Lexer` - Tokenizes PQL query strings
- `Parser` - Parses tokens into AST
- `Validator` - Validates query semantics
- `PrettyPrinter` - Formats AST back to string
- `QueryBuilder` - Fluent API for building queries
- `ColumnCollector` - Visitor that collects column names
- `AggregationChecker` - Visitor that checks for aggregations

### Error Classes

- `PQLError` - Base error class with location info
- `LexerError` - Tokenization errors
- `ParserError` - Parsing errors
- `ValidationError` - Semantic validation errors

## License

MIT
