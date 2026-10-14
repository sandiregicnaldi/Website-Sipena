import { Request, Response } from "express";
import { db } from "../db";
import { appSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";
import { getStageDeadlines, saveStageDeadlines, DEFAULT_STAGE_DEADLINES } from "../services/autoAssignService";


export class SettingsController {

    // GET /api/settings/categories
    static async getCategories(req: Request, res: Response) {
        try {
            const [row] = await db
                .select()
                .from(appSettings)
                .where(eq(appSettings.key, "categories"))
                .limit(1);

            if (row) {
                const stored = row.value as any;

                // ── Auto-migrasi: tambahkan field score jika belum ada di data lama ──
                let needsMigration = false;
                const migrated = { ...stored };
                for (const catKey of Object.keys(migrated)) {
                    const cat = migrated[catKey];
                    if (Array.isArray(cat.stages)) {
                        const patchedStages = cat.stages.map((s: any) => {
                            if (s.score === undefined) {
                                needsMigration = true;
                                return { ...s, score: 0 };
                            }
                            return s;
                        });
                        if (needsMigration) {
                            migrated[catKey] = { ...cat, stages: patchedStages };
                        }
                    }
                }

                if (needsMigration) {
                    console.log("[settings] Auto-migrating categories: adding missing score fields");
                    await db
                        .insert(appSettings)
                        .values({ key: "categories", value: migrated as any, updatedAt: new Date() })
                        .onConflictDoUpdate({
                            target: appSettings.key,
                            set: { value: migrated as any, updatedAt: new Date() },
                        });
                    return res.json(migrated);
                }

                return res.json(stored);
            }

            // Belum ada di DB → seed dari hardcode dan simpan
            await db.insert(appSettings).values({
                key: "categories",
                value: CATEGORIES as any,
            });

            return res.json(CATEGORIES);
        } catch (e: any) {
            console.error("SettingsController.getCategories error:", e);
            res.status(500).json({ error: e.message });
        }
    }


    // PUT /api/settings/categories  (admin only)
    static async saveCategories(req: Request, res: Response) {
        try {
            const categories = req.body;
            if (!categories || typeof categories !== "object") {
                return res.status(400).json({ error: "Invalid categories data" });
            }

            await db
                .insert(appSettings)
                .values({ key: "categories", value: categories as any, updatedAt: new Date() })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value: categories as any, updatedAt: new Date() },
                });

            console.log(`[settings] categories updated by user: ${req.user?.email}`);

            // Trigger sinkronisasi otomatis seluruh proyek yang masih aktif ke aturan master data baru
            setImmediate(async () => {
                try {
                    const { ProjectService } = await import("../services/projectService.js");
                    await ProjectService.syncActiveProjectsToMaster(categories);
                } catch (syncErr) {
                    console.error("[settings] Gagal sinkronisasi proyek aktif ke master baru:", syncErr);
                }
            });

            return res.json({ success: true });
        } catch (e: any) {
            console.error("SettingsController.saveCategories error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    // GET /api/settings/stage-deadlines  (semua user terauth)
    static async getStageDeadlines(req: Request, res: Response) {
        try {
            const data = await getStageDeadlines();
            return res.json(data);
        } catch (e: any) {
            console.error("SettingsController.getStageDeadlines error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    // PUT /api/settings/stage-deadlines  (admin only)
    static async saveStageDeadlines(req: Request, res: Response) {
        try {
            const data = req.body;
            if (!data || typeof data !== "object") {
                return res.status(400).json({ error: "Data tidak valid" });
            }
            // Pastikan semua nilai adalah angka positif
            const cleaned: Record<string, number> = {};
            for (const [key, val] of Object.entries(data)) {
                const n = Number(val);
                if (!isNaN(n) && n > 0) {
                    cleaned[key] = n;
                }
            }
            await saveStageDeadlines(cleaned);
            console.log(`[settings] stage_deadlines updated by: ${req.user?.email}`);
            return res.json({ success: true });
        } catch (e: any) {
            console.error("SettingsController.saveStageDeadlines error:", e);
            res.status(500).json({ error: e.message });
        }
    }
}

