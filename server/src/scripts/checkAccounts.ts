import { db } from "../db";
import { users, accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../auth";

const testList = [
    { email: "admin@perpusnas.go.id", pass: "adminpassword123" },
    { email: "personil@dev.local", pass: "developer123" },
    { email: "editor@penerbitan.com", pass: "password123" },
    { email: "penulis@sipena.id", pass: "penulis123" },
    { email: "pengunjung@sipena.id", pass: "pengunjung123" },
];

async function checkAll() {
    console.log("Checking accounts and validating passwords...");
    for (const item of testList) {
        const u = await db.select().from(users).where(eq(users.email, item.email)).limit(1);
        if (!u.length) {
            console.log(`[NOT_FOUND] ${item.email}`);
            continue;
        }
        const user = u[0];
        const accs = await db.select().from(accounts).where(eq(accounts.userId, user.id));
        const hasCredential = accs.find(a => a.providerId === "credential");
        console.log(`[USER] ${item.email}:`);
        console.log(`   id: ${user.id}, role: ${user.role}, verified: ${user.emailVerified}`);
        console.log(`   hasCredentialAccount: ${!!hasCredential}`);
        if (hasCredential) {
            console.log(`   hasPasswordHash: ${!!hasCredential.password}`);
        }

        // Test sign in via auth.api.signInEmail
        try {
            const res = await auth.api.signInEmail({
                body: { email: item.email, password: item.pass },
            });
            console.log(`   => SIGN IN RESULT: SUCCESS! (User: ${res.user?.name})`);
        } catch (e: any) {
            console.log(`   => SIGN IN RESULT: FAILED: ${e.body?.message || e.message}`);
        }
    }
    process.exit(0);
}

checkAll();
