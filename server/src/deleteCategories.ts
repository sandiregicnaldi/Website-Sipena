import { db } from "./db";
import { appSettings } from "./db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Deleting categories from app_settings...");
    const result = await db.delete(appSettings).where(eq(appSettings.key, "categories"));
    console.log("Categories deleted. Seeding will run on next load.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
