const fs = require('fs');
const readline = require('readline');

async function inspectMembers() {
  const fileStream = fs.createReadStream('migration/epublishing_LIVE_2026.sql', { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inMembersCreate = false;
  const createLines = [];
  let insertLine = null;

  for await (const line of rl) {
    if (line.includes('CREATE TABLE `members`')) {
      inMembersCreate = true;
    }
    if (inMembersCreate) {
      createLines.push(line);
      if (line.startsWith(') ENGINE=')) inMembersCreate = false;
    }

    if (line.startsWith('INSERT INTO `members`') || line.startsWith('INSERT INTO members')) {
      insertLine = line;
      break;
    }
  }

  console.log('=== CREATE TABLE members ===');
  console.log(createLines.join('\n'));

  console.log('\n=== SAMPLE RAW INSERT INTO members (First 1500 chars) ===');
  if (insertLine) {
    console.log(insertLine.substring(0, 1500));
  }
}

inspectMembers().catch(console.error);
