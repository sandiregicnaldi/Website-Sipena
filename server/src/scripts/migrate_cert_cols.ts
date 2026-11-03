import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Migrating events table: adding certificate_template_url and cert_name_pos_y...");
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_url text;`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_name_pos_y integer DEFAULT 96;`);
  console.log("Migration finished successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
