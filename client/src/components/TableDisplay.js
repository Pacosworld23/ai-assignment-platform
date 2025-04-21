import React from 'react';
import './TableDisplay.css';

const TableDisplay = ({ tables = [] }) => {
  // Only keep tables that actually have a non-empty data array
  const validTables = Array.isArray(tables)
    ? tables.filter(t => Array.isArray(t.data) && t.data.length > 0)
    : [];

  if (validTables.length === 0) return null;

  return (
    <div className="tables-container">
      {validTables.map((table, idx) => {
        // Destructure header row and body rows
        const [headers, ...rows] = table.data;
        return (
          <div key={idx} className="table-wrapper">
            {table.id && (
              <div className="table-description">{table.id}</div>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default TableDisplay;
