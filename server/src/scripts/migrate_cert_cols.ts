import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Migrating events table: adding certificate_template_url, cert_name_pos_y, cert_font_size, cert_font_family...");
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_url text;`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_name_pos_y integer DEFAULT 96;`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_font_size integer DEFAULT 24;`);
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_font_family text DEFAULT 'helvetica';`);
  console.log("Migration finished successfully!");
  process.exit(0);
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
