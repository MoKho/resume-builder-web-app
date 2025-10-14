import React, { useState, useRef, useEffect } from 'react';

interface ScoreDisplayProps {
  score: number | null;
  rawCsv: string | null;
  label: string;
}

const CsvTable: React.FC<{ csvString: string | null }> = ({ csvString }) => {
  if (!csvString) return null;

  try {
    const rows = csvString.trim().split('\n').map(row => 
        // A simple regex to handle potentially quoted fields, not a full-blown CSV parser.
        row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(field => field.trim().replace(/^"|"$/g, ''))
    );
    if (rows.length === 0) return null;
  
    const header = rows[0];
    const bodyRows = rows.slice(1);
  
    return (
      <div className="styled-scrollbar overflow-auto max-h-48 bg-slate-800 rounded">
          <table className="w-full text-left text-xs table-auto">
              <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                  <tr>
                      {header.map((cell, index) => (
                          <th key={index} className="p-2 font-semibold text-slate-300 border-b border-slate-600 truncate">
                              {cell}
                          </th>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {bodyRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                          {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-slate-400">
                                  {cell}
                              </td>
                          ))}
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    );
  } catch (e) {
      console.error("Failed to parse CSV string:", e);
      return <pre className="styled-scrollbar text-xs text-slate-300 whitespace-pre-wrap overflow-auto max-h-48 p-2 bg-slate-800 rounded">{csvString}</pre>;
  }
};


const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, rawCsv, label }) => {
  const [showRawCsv, setShowRawCsv] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowRawCsv(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (score === null || score === undefined) return null;

  return (
    <div className="flex items-center gap-4 mb-2 flex-shrink-0">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-200">{label}:</span>
        <span className="text-3xl font-bold text-teal-400">{score}</span>
        <span className="text-slate-400 text-lg">/ 100</span>
      </div>
      {rawCsv && (
        <div className="relative flex items-center">
          <button
            ref={buttonRef}
            onClick={() => setShowRawCsv(v => !v)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Show raw score data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
          {showRawCsv && (
             <div
               ref={popoverRef}
               className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 z-20"
             >
               <h4 className="font-semibold text-slate-100 mb-2 text-sm">Raw Scoring Data</h4>
               <CsvTable csvString={rawCsv} />
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-slate-900 border-b border-r border-slate-700 transform rotate-45"></div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;