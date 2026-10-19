| Function | Signature | Description |
| --- | --- | --- |
| **Math & stats** | | |
| `ABS` | `ABS(number)` | Absolute value of a number. |
| `AVERAGE` | `AVERAGE(number1, [number2], …)` | Returns the arithmetic mean of numeric values. |
| `AVERAGEIF` | `AVERAGEIF(range, criteria, [average_range])` | Averages values that satisfy a criteria. |
| `CEILING` | `CEILING(number, [significance])` | Rounds a number up to the nearest multiple. |
| `COUNT` | `COUNT(value1, [value2], …)` | Counts how many values are numbers. |
| `COUNTA` | `COUNTA(value1, [value2], …)` | Counts non-empty values in the arguments. |
| `COUNTBLANK` | `COUNTBLANK(range)` | Counts empty cells inside a range. |
| `COUNTIF` | `COUNTIF(range, criteria)` | Counts values that satisfy a criteria. |
| `EXP` | `EXP(number)` | e raised to the given power. |
| `FLOOR` | `FLOOR(number, [significance])` | Rounds a number down to the nearest multiple. |
| `INT` | `INT(number)` | Rounds down to the nearest integer. |
| `LN` | `LN(number)` | Natural logarithm. |
| `LOG` | `LOG(number, [base])` | Logarithm with an optional base, defaulting to 10. |
| `LOG10` | `LOG10(number)` | Base-10 logarithm. |
| `MAX` | `MAX(number1, [number2], …)` | Returns the largest numeric value. |
| `MEDIAN` | `MEDIAN(number1, [number2], …)` | Returns the middle number of a data set. |
| `MIN` | `MIN(number1, [number2], …)` | Returns the smallest numeric value. |
| `MOD` | `MOD(number, divisor)` | Remainder after division. |
| `PI` | `PI()` | The constant π. |
| `POWER` | `POWER(number, power)` | Raises a number to a power. |
| `PRODUCT` | `PRODUCT(number1, [number2], …)` | Multiplies all numeric values together. |
| `ROUND` | `ROUND(number, [digits])` | Rounds a number to a given number of digits. |
| `ROUNDDOWN` | `ROUNDDOWN(number, [digits])` | Rounds a number toward zero. |
| `ROUNDUP` | `ROUNDUP(number, [digits])` | Rounds a number away from zero. |
| `SIGN` | `SIGN(number)` | Returns -1, 0, or 1 for the sign of a number. |
| `SQRT` | `SQRT(number)` | Square root of a number. |
| `STDEV` | `STDEV(number1, [number2], …)` | Sample standard deviation of numeric values. |
| `SUM` | `SUM(number1, [number2], …)` | Adds every numeric value across arguments and ranges. Text and blanks are ignored. |
| `SUMIF` | `SUMIF(range, criteria, [sum_range])` | Adds values that satisfy a criteria. Supports > < >= <= <> and the wildcards * and ?. |
| `SUMPRODUCT` | `SUMPRODUCT(range1, [range2], …)` | Multiplies equally sized ranges element by element, then sums the result. |
| `TRUNC` | `TRUNC(number, [digits])` | Truncates a number toward zero. |
| **Logical** | | |
| `AND` | `AND(logical1, [logical2], …)` | TRUE when every argument is true. |
| `FALSE` | `FALSE()` | Returns the boolean FALSE. |
| `IF` | `IF(test, true_value, [false_value])` | Returns one value when the test is true and another when false. Only the taken branch is evaluated. |
| `IFERROR` | `IFERROR(value, fallback)` | Returns the fallback when the value is an error. |
| `IFNA` | `IFNA(value, fallback)` | Returns the fallback only when the value is #N/A. |
| `NOT` | `NOT(logical)` | Reverses a boolean value. |
| `OR` | `OR(logical1, [logical2], …)` | TRUE when any argument is true. |
| `TRUE` | `TRUE()` | Returns the boolean TRUE. |
| **Text** | | |
| `CHAR` | `CHAR(code)` | Character for a numeric code. |
| `CODE` | `CODE(text)` | Numeric code of the first character. |
| `CONCAT` | `CONCAT(value1, [value2], …)` | Joins values into one text string. |
| `CONCATENATE` | `CONCATENATE(value1, [value2], …)` | Joins values into one text string. |
| `EXACT` | `EXACT(text1, text2)` | TRUE when two text values match exactly. |
| `FIND` | `FIND(needle, text, [start])` | Case-sensitive position of text inside another value. |
| `LEFT` | `LEFT(text, [length])` | First characters of a text value. |
| `LEN` | `LEN(text)` | Number of characters in a text value. |
| `LOWER` | `LOWER(text)` | Converts text to lowercase. |
| `MID` | `MID(text, start, length)` | Characters from the middle of a text value. |
| `PROPER` | `PROPER(text)` | Capitalizes each word. |
| `REPLACE` | `REPLACE(text, start, length, new)` | Replaces part of a text value by position. |
| `REPT` | `REPT(text, count)` | Repeats a text value. |
| `RIGHT` | `RIGHT(text, [length])` | Last characters of a text value. |
| `SEARCH` | `SEARCH(needle, text, [start])` | Case-insensitive position of text inside another value. |
| `SUBSTITUTE` | `SUBSTITUTE(text, old, new, [occurrence])` | Replaces text inside a value. |
| `TEXTJOIN` | `TEXTJOIN(delimiter, ignore_empty, value1, …)` | Joins values with a delimiter. |
| `TRIM` | `TRIM(text)` | Removes leading, trailing, and repeated spaces. |
| `UPPER` | `UPPER(text)` | Converts text to uppercase. |
| `VALUE` | `VALUE(text)` | Converts numeric text to a number. |
| **Lookup** | | |
| `COLUMNS` | `COLUMNS(range)` | Number of columns in a range. |
| `HLOOKUP` | `HLOOKUP(value, range, row, [approximate])` | Searches the first row of a range and returns a value from another row. |
| `INDEX` | `INDEX(range, row, [column])` | Returns a value at a position inside a range. |
| `LOOKUP` | `LOOKUP(value, range)` | Approximate lookup in a single row or column. |
| `MATCH` | `MATCH(value, range, [type])` | Position of a value inside a range. Type 0 is exact, 1 ascending, -1 descending. |
| `ROWS` | `ROWS(range)` | Number of rows in a range. |
| `VLOOKUP` | `VLOOKUP(value, range, column, [approximate])` | Searches the first column of a range and returns a value from another column. Exact by default. |
| **Information** | | |
| `ISBLANK` | `ISBLANK(value)` | TRUE when the value is empty. |
| `ISERROR` | `ISERROR(value)` | TRUE when the value is any error. |
| `ISEVEN` | `ISEVEN(number)` | TRUE when the number is even. |
| `ISLOGICAL` | `ISLOGICAL(value)` | TRUE when the value is a boolean. |
| `ISNUMBER` | `ISNUMBER(value)` | TRUE when the value is a number. |
| `ISODD` | `ISODD(number)` | TRUE when the number is odd. |
| `ISTEXT` | `ISTEXT(value)` | TRUE when the value is text. |
| `N` | `N(value)` | Converts a value to a number: booleans become 1 or 0, numbers stay, everything else becomes 0. |
| `NA` | `NA()` | Returns the #N/A error. |

Total: 75 functions.