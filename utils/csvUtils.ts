/**
 * Parses a single line of a CSV, handling quoted fields.
 * This is a simple implementation and may not cover all edge cases of RFC 4180.
 * @param text The string to parse.
 * @returns An array of strings representing the cells.
 */
export const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuote && text[i+1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(cell => cell.trim());
};

export interface SchemaValidationResult {
    isValid: boolean;
    rowCount: number;
    columnCount: number;
    headers: string[];
    errors: string[];
    malformedColumns: string[];
}

/**
 * Validates a CSV dataset against strict schema requirements:
 * - Header row present with >= 2 column variables
 * - Exact record count match (default N=100 agent records requirement)
 * - Every row has matching column count
 * - No empty, null, undefined, NaN, or malformed values in any column
 */
export const validateSimulationSchema = (csvString: string, requiredRecords = 100): SchemaValidationResult => {
    const result: SchemaValidationResult = {
        isValid: true,
        rowCount: 0,
        columnCount: 0,
        headers: [],
        errors: [],
        malformedColumns: []
    };

    if (!csvString || typeof csvString !== 'string' || !csvString.trim()) {
        result.isValid = false;
        result.errors.push("CSV dataset is empty or undefined.");
        return result;
    }

    const lines = csvString.trim().replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        result.isValid = false;
        result.errors.push("Dataset must contain a header row and data rows.");
        return result;
    }

    // Parse header using robust line parser
    const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
    result.headers = headers;
    result.columnCount = headers.length;

    if (headers.length < 2) {
        result.isValid = false;
        result.errors.push("Header must define at least 2 column variables.");
    }

    const dataRows = lines.slice(1);
    result.rowCount = dataRows.length;

    // Strict N=100 agent record requirement check
    if (result.rowCount !== requiredRecords) {
        result.isValid = false;
        result.errors.push(`Record count mismatch: Expected N=${requiredRecords} agent records, but dataset contains ${result.rowCount} records.`);
    }

    const malformedColsSet = new Set<string>();

    dataRows.forEach((rowLine, rowIndex) => {
        const cells = parseCsvLine(rowLine);
        if (cells.length !== headers.length) {
            result.isValid = false;
            result.errors.push(`Row ${rowIndex + 1} has ${cells.length} columns, expected ${headers.length}.`);
        }

        headers.forEach((header, colIndex) => {
            const val = cells[colIndex] !== undefined ? cells[colIndex] : '';
            const trimmed = String(val).trim();
            if (
                trimmed === '' || 
                trimmed === 'null' || 
                trimmed === 'undefined' || 
                trimmed === 'NaN' || 
                trimmed === '[object Object]'
            ) {
                result.isValid = false;
                malformedColsSet.add(header || `Column_${colIndex + 1}`);
                if (result.errors.length < 10) {
                    result.errors.push(`Malformed value ('${trimmed}') in column '${header}' at record row ${rowIndex + 1}.`);
                }
            }
        });
    });

    result.malformedColumns = Array.from(malformedColsSet);
    return result;
};


/**
 * Cleans and formats a raw string into a standardized CSV format.
 * - Trims whitespace from all cells.
 * - Enforces a consistent number of columns for all rows based on the header.
 * - Quotes all output fields to prevent issues with commas or other special characters.
 * @param csvString The raw CSV data as a string.
 * @returns A cleaned and standardized CSV string.
 */
export const cleanAndFormatCsv = (csvString: string): string => {
    if (!csvString || typeof csvString !== 'string') {
        return '';
    }

    const lines = csvString.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length === 0) {
        return '';
    }
    
    // Parse all lines into a 2D array of cells
    const parsedData = lines.map(line => parseCsvLine(line));

    // Determine the number of columns from the header row
    const headerColumnCount = parsedData[0]?.length || 0;
    if (headerColumnCount === 0) {
        return ''; // Don't process empty or malformed headers
    }

    // Process and normalize all rows
    const cleanedData = parsedData.map(row => {
        // Pad rows that are too short
        while (row.length < headerColumnCount) {
            row.push('');
        }
        // Truncate rows that are too long
        if (row.length > headerColumnCount) {
            row = row.slice(0, headerColumnCount);
        }
        return row;
    });

    // Helper to quote a single cell value for CSV output
    const quoteCell = (cell: string): string => {
        const strCell = String(cell || '');
        // Escape existing quotes and wrap the whole thing in quotes
        const escapedCell = strCell.replace(/"/g, '""');
        return `"${escapedCell}"`;
    };

    // Re-serialize the cleaned data back into a CSV string
    const formattedLines = cleanedData.map(row => 
        row.map(quoteCell).join(',')
    );

    return formattedLines.join('\n');
};
