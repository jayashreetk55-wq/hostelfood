/**
 * csvExporter.js
 * Converts an array of objects to a CSV string for download.
 */

/**
 * Convert an array of objects to a CSV string.
 * @param {Object[]} rows    - Array of flat objects
 * @param {string[]} headers - Column headers (must match object keys)
 * @returns {string} CSV string
 */
function objectsToCSV(rows, headers) {
  if (!rows || rows.length === 0) return headers.join(',') + '\n';

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ];

  return csvRows.join('\n');
}

module.exports = { objectsToCSV };
