import { db } from "./db";
import { users } from "./db/schema";

async function main() {
    const allUsers = await db.select().from(users);
    console.log("Users in DB:");
    for (const u of allUsers) {
        console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
