const fs = require('fs');
const readline = require('readline');

// SQL parser helper
function parseSqlValues(valuesStr) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  let quoteChar = '';
  let inRow = false;
  let isEscaped = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (isEscaped) {
      currentVal += char;
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (!inRow) {
      if (char === '(') {
        inRow = true;
        currentRow = [];
        currentVal = '';
        inQuotes = false;
      }
      continue;
    }
    if (inQuotes) {
      if (char === quoteChar) {
        if (valuesStr[i + 1] === quoteChar) {
          currentVal += quoteChar;
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ',') {
        currentRow.push(currentVal.trim().toUpperCase() === 'NULL' ? null : currentVal.trim());
        currentVal = '';
      } else if (char === ')') {
        currentRow.push(currentVal.trim().toUpperCase() === 'NULL' ? null : currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
        inRow = false;
      } else {
        currentVal += char;
      }
    }
  }
  return rows;
}

async function analyzeMembersData() {
  const fileStream = fs.createReadStream('migration/epublishing_LIVE_2026.sql', { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let totalMembers = 0;
  let withEmail = 0;
  let withoutEmail = 0;
  let withPassword = 0;
  let withoutPassword = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  const emails = new Map();
  const sampleRows = [];

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `members`') || line.startsWith('INSERT INTO members')) {
      const valIdx = line.indexOf('VALUES');
      if (valIdx !== -1) {
        const rows = parseSqlValues(line.slice(valIdx + 6));
        for (const r of rows) {
          totalMembers++;
          const id = r[0];
          const nik = r[1];
          const name = r[2];
          const emailRaw = r[3];
          const password = r[4];
          const phone = r[5];
          const isActive = r[7]; // bit(1) -> ' ' (0) or '\x01' or '1'
          const createDate = r[31];

          if (sampleRows.length < 5) {
            sampleRows.push({ id, name, email: emailRaw, password: password?.substring(0, 10) + '...', isActive, createDate });
          }

          if (emailRaw && emailRaw.trim()) {
            withEmail++;
            const emailLower = emailRaw.trim().toLowerCase();
            emails.set(emailLower, (emails.get(emailLower) || 0) + 1);
          } else {
            withoutEmail++;
          }

          if (password && password.trim()) withPassword++;
          else withoutPassword++;

          if (isActive === "1" || isActive === "b'1'" || isActive === "\x01" || isActive === "true") {
            activeCount++;
          } else {
            inactiveCount++;
          }
        }
      }
    }
  }

  const duplicates = [];
  for (const [em, count] of emails.entries()) {
    if (count > 1) duplicates.push({ email: em, count });
  }

  console.log('=== ANALISIS DATA MEMBERS (9.765 ANGGOTA) ===');
  console.log('Total baris members:', totalMembers);
  console.log('Punya Email:', withEmail);
  console.log('Tanpa Email (NULL / Kosong):', withoutEmail);
  console.log('Punya Password Hash:', withPassword);
  console.log('Tanpa Password Hash:', withoutPassword);
  console.log('Email Unik:', emails.size);
  console.log('Email Duplikat:', duplicates.length, 'contoh duplikat:', duplicates.slice(0, 5));
  console.log('\nSample baris:');
  console.table(sampleRows);
}

analyzeMembersData().catch(console.error);
