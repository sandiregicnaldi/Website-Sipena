import { Request, Response } from "express";
import { db } from "../db";
import { users, accounts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";
import { writeAuditLog } from "../services/logService";

export class ProfileController {
    /**
     * GET /api/profile
     * Returns the current user's profile data.
     */
    static async getProfile(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const [user] = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    image: users.image,
                    avatarInitials: users.avatarInitials,
                    skills: users.skills,
                })
                .from(users)
                .where(eq(users.id, req.user.id))
                .limit(1);

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Also check if user has a phone field (may not in schema yet, fallback gracefully)
            const phoneRow = await db.execute(
                `SELECT phone FROM "user" WHERE id = '${req.user.id}' LIMIT 1`
            ).catch(() => ({ rows: [] }));
            const phone = (phoneRow.rows?.[0] as any)?.phone ?? null;

            res.json({ ...user, phone });
        } catch (e: any) {
            console.error("ProfileController.getProfile error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * PATCH /api/profile
     * Updates the current user's profile (name, phone, avatarInitials).
     */
    static async updateProfile(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const schema = z.object({
                name: z.string().min(1).max(100).optional(),
                phone: z.string().max(20).optional().nullable(),
                avatarInitials: z.string().max(2).optional().nullable(),
            });

            const data = schema.parse(req.body);

            const updateObj: Record<string, any> = {};
            if (data.name !== undefined) updateObj.name = data.name;
            if (data.avatarInitials !== undefined) updateObj.avatarInitials = data.avatarInitials;

            // Auto-generate avatarInitials from name if not provided
            if (data.name && data.avatarInitials === undefined) {
                const parts = data.name.trim().split(" ").filter(Boolean);
                updateObj.avatarInitials = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : parts[0]?.slice(0, 2).toUpperCase() || "";
            }

            if (Object.keys(updateObj).length > 0) {
                updateObj.updatedAt = new Date();
                const [updated] = await db
                    .update(users)
                    .set(updateObj)
                    .where(eq(users.id, req.user.id))
                    .returning({
                        id: users.id,
                        name: users.name,
                        email: users.email,
                        role: users.role,
                        status: users.status,
                        avatarInitials: users.avatarInitials,
                    });

                if (!updated) {
                    return res.status(404).json({ error: "User not found" });
                }
            }

            // Update phone via raw SQL (handles optional column)
            if (data.phone !== undefined) {
                const phoneVal = data.phone === null ? "NULL" : `'${data.phone.replace(/'/g, "''")}'`;
                await db.execute(
                    `UPDATE "user" SET phone = ${phoneVal} WHERE id = '${req.user.id}'`
                ).catch(() => { });
            }

            res.json({ message: "Profil berhasil diperbarui" });
            writeAuditLog({
                userId: req.user.id,
                action: 'update_profile',
                target: req.user.name || req.user.email,
                targetId: req.user.id,
                meta: data,
                ipAddress: req.ip,
            });
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: "Invalid input", details: e.errors });
            }
            console.error("ProfileController.updateProfile error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * PATCH /api/profile/skills
     * Updates the current user's skills array.
     */
    static async updateSkills(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const schema = z.object({
                skills: z.array(z.string()).max(20, "Maksimal 20 keahlian"),
            });

            const { skills } = schema.parse(req.body);

             await db
                .update(users)
                .set({ skills, updatedAt: new Date() })
                .where(eq(users.id, req.user.id));

            res.json({ message: "Keahlian berhasil diperbarui", skills });
            writeAuditLog({
                userId: req.user.id,
                action: 'update_profile',
                target: req.user.name || req.user.email,
                targetId: req.user.id,
                meta: { skills },
                ipAddress: req.ip,
            });
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: "Invalid input", details: e.errors });
            }
            console.error("ProfileController.updateSkills error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    /**
     * POST /api/profile/change-password
     * Changes the current user's password using Better Auth's built-in API.
     */
    static async changePassword(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const schema = z.object({
                currentPassword: z.string().min(1),
                newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
            });

            const { currentPassword, newPassword } = schema.parse(req.body);

            // Check if user has a credential-based account (not OAuth only)
            const [account] = await db
                .select({ id: accounts.id })
                .from(accounts)
                .where(
                    and(
                        eq(accounts.userId, req.user.id),
                        eq(accounts.providerId, "credential"),
                    )
                )
                .limit(1);

            if (!account) {
                return res.status(400).json({
                    error: "Ganti password tidak tersedia untuk akun yang login via Google/OAuth. Gunakan pengaturan akun Google Anda.",
                });
            }

            // Delegate to Better Auth's built-in changePassword
            await auth.api.changePassword({
                body: { currentPassword, newPassword, revokeOtherSessions: false },
                headers: fromNodeHeaders(req.headers),
            });

            res.json({ message: "Password berhasil diubah" });
            writeAuditLog({
                userId: req.user.id,
                action: 'change_password',
                target: req.user.name || req.user.email,
                targetId: req.user.id,
                ipAddress: req.ip,
            });
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: e.errors[0]?.message || "Input tidak valid" });
            }
            // Better Auth throws errors with a body property
            const errMsg = e.body?.message || e.message || "Gagal mengubah password";
            if (errMsg.toLowerCase().includes("password") || errMsg.toLowerCase().includes("incorrect")) {
                return res.status(400).json({ error: "Password lama tidak sesuai" });
            }
            console.error("ProfileController.changePassword error:", e);
            res.status(500).json({ error: errMsg });
        }
    }
}
