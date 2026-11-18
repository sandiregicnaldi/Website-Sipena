const fs = require('fs');
const readline = require('readline');

async function inspectTables() {
  const fileStream = fs.createReadStream('migration/epublishing_LIVE_2026.sql', { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const tables = {};
  let currentTable = null;

  for await (const line of rl) {
    const tableMatch = line.match(/CREATE TABLE [`"']?([a-zA-Z0-9_]+)[`"']?/i);
    if (tableMatch) {
      currentTable = tableMatch[1];
      tables[currentTable] = { columns: [], rowsEstimate: 0, sampleInsert: null };
      continue;
    }

    if (currentTable) {
      if (line.startsWith(') ENGINE=')) {
        currentTable = null;
      } else {
        const colMatch = line.match(/^  [`"']?([a-zA-Z0-9_]+)[`"']?\s+([a-zA-Z0-9_()]+)/);
        if (colMatch) {
          tables[currentTable].columns.push(`${colMatch[1]} (${colMatch[2]})`);
        }
      }
    }

    if (line.includes('INSERT INTO')) {
      const insMatch = line.match(/INSERT INTO [`"']?([a-zA-Z0-9_]+)[`"']?/i);
      if (insMatch) {
        const tbl = insMatch[1];
        if (!tables[tbl]) tables[tbl] = { columns: [], rowsEstimate: 0, sampleInsert: null };
        // Estimate rows by counting values tuples
        const tuples = (line.match(/\),\(/g) || []).length + 1;
        tables[tbl].rowsEstimate += tuples;
        if (!tables[tbl].sampleInsert) {
          tables[tbl].sampleInsert = line.substring(0, 300);
        }
      }
    }
  }

  console.log('=== TABLES IN EPUBISHING DATABASE ===');
  for (const [name, info] of Object.entries(tables)) {
    console.log(`\nTable: [${name}] | Rows: ~${info.rowsEstimate}`);
    console.log(`Columns: ${info.columns.slice(0, 8).join(', ')}${info.columns.length > 8 ? '...' : ''}`);
  }
}

inspectTables().catch(console.error);
