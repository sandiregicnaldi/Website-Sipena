import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function createAdmin() {
    try {
        console.log("Checking if admin exists...");
        
        // Cek dulu apakah email sudah ada
        const existing = await db.query.users.findFirst({
            where: eq(users.email, "admin@perpusnas.go.id")
        });

        if (existing) {
            console.log("Admin account already exists!");
            
            // Ubah rolenya jadi admin secara manual kalau ternyata statusnya bukan admin
            await db.update(users)
               .set({ role: "admin", status: "active" })
               .where(eq(users.id, existing.id));
               
            console.log("Updated existing account role to 'admin' and status to 'active'.");
            process.exit(0);
        }

        console.log("Creating new admin account...");
        
        const port = process.env.PORT || 5001;
        const response = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": "http://localhost:5174"
            },
            body: JSON.stringify({
                email: "admin@perpusnas.go.id",
                password: "adminpassword123",
                name: "Administrator Utama",
                role: "admin",
                status: "active"
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Admin user created successfully:", data.user?.email);
            
            // Paksakan rolenya jadi admin dan active
            if (data.user?.id) {
                await db.update(users)
                   .set({ role: "admin", status: "active" })
                   .where(eq(users.id, data.user.id));
                console.log("Database updated: role = admin, status = active.");
            }
        } else {
            const err = await response.text();
            console.error("Failed to create user. Is the server running? Response:", err);
            console.log("Pastikan server backend berjalan (npm run dev) di terminal lain.");
        }
    } catch (e) {
        console.error("Error creating admin:", e);
    }
    process.exit(0);
}

createAdmin();
