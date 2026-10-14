const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stages' ORDER BY ordinal_position")
  .then(r => { r.rows.forEach(x => console.log(x.column_name)); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
