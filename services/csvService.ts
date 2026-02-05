// services/csvService.ts

const escapeCsvCell = (cellData: any): string => {
    const stringData = String(cellData ?? '');
    // If the string contains a comma, double quote, or newline, wrap it in double quotes.
    if (/[",\n]/.test(stringData)) {
        // Within a double-quoted string, double quotes must be escaped by another double quote.
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
};

export const exportToCsv = (filename: string, data: any[]) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    // Pre-process data to stringify complex objects
    const processedData = data.map(row => {
        const newRow: { [key: string]: any } = {};
        for (const key in row) {
            const value = row[key];
            if (typeof value === 'object' && value !== null) {
                newRow[key] = JSON.stringify(value);
            } else {
                newRow[key] = value;
            }
        }
        return newRow;
    });

    const headers = Object.keys(processedData[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...processedData.map(row =>
            headers.map(header => escapeCsvCell(row[header])).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') { // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    // Unquote the values
    return result.map(val => {
        if (val.startsWith('"') && val.endsWith('"')) {
            return val.slice(1, -1).replace(/""/g, '"');
        }
        return val;
    });
}

export const parseCsv = <T>(file: File): Promise<T[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvString = event.target?.result as string;
                const lines = csvString.split(/\r\n|\n/).filter(line => line.trim());
                if (lines.length < 1) {
                    throw new Error("CSV file appears to be empty.");
                }
                
                const headers = lines[0].split(',').map(h => h.trim());
                const data: T[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = splitCsvLine(lines[i]);
                    if (values.length !== headers.length) {
                         console.warn(`Row ${i+1} has incorrect number of columns. Expected ${headers.length}, got ${values.length}. Skipping.`);
                         continue;
                    }

                    const row: { [key: string]: any } = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    data.push(row as T);
                }
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
};