import { Request, Response } from "express";
import { db } from "../db";
import { users, sessions, accounts, notifications, stages, documents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "../services/logService";
import { hashPassword } from "better-auth/crypto";

export class AdminController {
    static async getUsers(req: Request, res: Response) {
        try {
            const allUsers = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    isReviewer: users.isReviewer,
                    skills: users.skills,
                    createdAt: users.createdAt,
                    tempatLahir: users.tempatLahir,
                    tanggalLahir: users.tanggalLahir,
                    pekerjaan: users.pekerjaan,
                    instansi: users.instansi,
                    alamatLengkap: users.alamatLengkap,
                    provinsi: users.provinsi,
                    kota: users.kota,
                    kecamatan: users.kecamatan,
                    kelurahan: users.kelurahan,
                    bio: users.bio,
                    website: users.website,
                    karyaEksternal: users.karyaEksternal,
                })
                .from(users)
                .orderBy(users.createdAt);

            res.json(allUsers);
        } catch (e: any) {
            console.error("AdminController.getUsers error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const schema = z.object({
                role: z.enum(["admin", "personil", "pegawai", "reviewer", "penulis", "pengunjung", "calon_penulis"]).optional(),
                status: z.enum(["pending", "active", "disabled"]).optional(),
                isReviewer: z.boolean().optional(),
                skills: z.array(z.string()).optional(),
                bio: z.string().optional(),
                website: z.string().optional(),
                karyaEksternal: z.any().optional(),
                instansi: z.string().optional(),
                pekerjaan: z.string().optional(),
                alamatLengkap: z.string().optional(),
                provinsi: z.string().optional(),
                kota: z.string().optional(),
                kecamatan: z.string().optional(),
                kelurahan: z.string().optional(),
            });

            const data = schema.parse(req.body);

            // Build update object — only include fields that were provided
            const updateObj: Record<string, any> = {};
            if (data.role !== undefined) updateObj.role = data.role;
            if (data.status !== undefined) updateObj.status = data.status;
            if (data.isReviewer !== undefined) updateObj.isReviewer = data.isReviewer;
            if (data.skills !== undefined) updateObj.skills = data.skills;
            if (data.bio !== undefined) updateObj.bio = data.bio;
            if (data.website !== undefined) updateObj.website = data.website;
            if (data.karyaEksternal !== undefined) updateObj.karyaEksternal = data.karyaEksternal;
            if (data.instansi !== undefined) updateObj.instansi = data.instansi;
            if (data.pekerjaan !== undefined) updateObj.pekerjaan = data.pekerjaan;
            if (data.alamatLengkap !== undefined) updateObj.alamatLengkap = data.alamatLengkap;
            if (data.provinsi !== undefined) updateObj.provinsi = data.provinsi;
            if (data.kota !== undefined) updateObj.kota = data.kota;
            if (data.kecamatan !== undefined) updateObj.kecamatan = data.kecamatan;
            if (data.kelurahan !== undefined) updateObj.kelurahan = data.kelurahan;

            if (Object.keys(updateObj).length === 0) {
                return res.status(400).json({ error: "No fields to update" });
            }

            updateObj.updatedAt = new Date();

            const [updated] = await db
                .update(users)
                .set(updateObj)
                .where(eq(users.id, String(id)))
                .returning({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    isReviewer: users.isReviewer,
                    skills: users.skills,
                    tempatLahir: users.tempatLahir,
                    tanggalLahir: users.tanggalLahir,
                    pekerjaan: users.pekerjaan,
                    instansi: users.instansi,
                    alamatLengkap: users.alamatLengkap,
                    provinsi: users.provinsi,
                    kota: users.kota,
                    kecamatan: users.kecamatan,
                    kelurahan: users.kelurahan,
                    bio: users.bio,
                    website: users.website,
                    karyaEksternal: users.karyaEksternal,
                });

            if (!updated) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json(updated);
            writeAuditLog({
                userId: req.user?.id,
                action: 'update_user',
                target: updated.name,
                targetId: updated.id,
                meta: data,
                ipAddress: req.ip,
            });
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: "Invalid input", details: e.errors });
            }
            console.error("AdminController.updateUser error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // Prevent self-deletion
            if (req.user?.id === String(id)) {
                return res.status(400).json({ error: "Tidak dapat menghapus akun Anda sendiri" });
            }

            // Check user exists
            const [target] = await db
                .select({ id: users.id, name: users.name })
                .from(users)
                .where(eq(users.id, String(id)))
                .limit(1);

            if (!target) {
                return res.status(404).json({ error: "Pengguna tidak ditemukan" });
            }

            // Nullify user references in stages and documents to prevent foreign key constraint violations
            await db.update(stages).set({ pjId: null }).where(eq(stages.pjId, String(id)));
            await db.update(stages).set({ coPjId: null }).where(eq(stages.coPjId, String(id)));
            await db.update(stages).set({ reviewerId: null }).where(eq(stages.reviewerId, String(id)));
            await db.update(documents).set({ uploadedBy: null }).where(eq(documents.uploadedBy, String(id)));

            // Delete in dependency order: sessions → accounts → notifications → user
            await db.delete(sessions).where(eq(sessions.userId, String(id)));
            await db.delete(accounts).where(eq(accounts.userId, String(id)));
            await db.delete(notifications).where(eq(notifications.userId, String(id)));
            await db.delete(users).where(eq(users.id, String(id)));

            res.json({ message: `Pengguna "${target.name}" berhasil dihapus secara permanen` });
            writeAuditLog({
                userId: req.user?.id,
                action: 'delete_user',
                target: target.name,
                targetId: String(id),
                ipAddress: req.ip,
            });
        } catch (e: any) {
            console.error("AdminController.deleteUser error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async setPassword(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const schema = z.object({
                password: z.string().min(8, "Password minimal 8 karakter"),
            });

            const { password } = schema.parse(req.body);

            const [targetUser] = await db
                .select({ id: users.id, name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, String(id)))
                .limit(1);

            if (!targetUser) {
                return res.status(404).json({ error: "Pengguna tidak ditemukan" });
            }

            // Hash password menggunakan built-in crypto dari Better Auth
            const hashedPassword = await hashPassword(password);

            // Cek apakah sudah ada credential email/password
            const [existingAccount] = await db
                .select({ id: accounts.id })
                .from(accounts)
                .where(and(eq(accounts.userId, String(id)), eq(accounts.providerId, 'credential')))
                .limit(1);

            if (existingAccount) {
                await db
                    .update(accounts)
                    .set({ password: hashedPassword, updatedAt: new Date() })
                    .where(and(eq(accounts.userId, String(id)), eq(accounts.providerId, 'credential')));
            } else {
                await db.insert(accounts).values({
                    id: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    userId: String(id),
                    accountId: targetUser.email,
                    providerId: 'credential',
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            res.json({ message: `Password untuk "${targetUser.name}" berhasil diatur` });
            writeAuditLog({
                userId: req.user?.id,
                action: 'set_password',
                target: targetUser.name,
                targetId: String(id),
                ipAddress: req.ip,
            });
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: e.errors[0]?.message || "Input tidak valid" });
            }
            console.error("AdminController.setPassword error:", e);
            res.status(500).json({ error: e.message });
        }
    }
}
