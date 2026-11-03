import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

async function verifyAllExistingUsers() {
    console.log("Checking and verifying all existing users for brute force / double opt-in protection...");
    try {
        const allUsers = await db.select().from(users);
        console.log(`Found ${allUsers.length} total users in database.`);

        let updatedCount = 0;
        for (const u of allUsers) {
            if (!u.emailVerified) {
                await db.update(users)
                    .set({ emailVerified: true, updatedAt: new Date() })
                    .where(eq(users.id, u.id));
                updatedCount++;
                console.log(`Verified user: ${u.email} (${u.role || 'no-role'})`);
            } else {
                console.log(`User already verified: ${u.email}`);
            }
        }

        console.log(`Migration complete! Successfully marked ${updatedCount} users as emailVerified=true.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

verifyAllExistingUsers();
