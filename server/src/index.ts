import express from "express";
import path from "path";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import { sql } from "drizzle-orm";
import router from "./routes";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import { authMiddleware } from "./middlewares/auth";
import { startPolling } from "./services/telegramService";
import { startAutoArchiveJob } from "./services/projectService";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - allow frontend origin with credentials
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman)
        if (!origin) return callback(null, true);
        // Allow the configured frontend URL
        if (origin === frontendUrl) return callback(null, true);
        // Allow bare IP (same server, accessed without domain)
        const serverIp = (frontendUrl.match(/(\d+\.\d+\.\d+\.\d+)/) || [])[1];
        if (serverIp && origin === `http://${serverIp}`) return callback(null, true);
        if (serverIp && origin === `https://${serverIp}`) return callback(null, true);
        // Allow nip.io wildcard DNS (e.g. http://192.168.40.37.nip.io)
        if (origin.includes('.nip.io')) return callback(null, true);
        // Allow SiPena Production Domains
        if (origin === "https://press.perpusnas.go.id") return callback(null, true);
        if (origin === "http://press.perpusnas.go.id") return callback(null, true);
        if (origin === "https://manajemen-penerbitan.perpusnas.go.id") return callback(null, true);
        if (origin === "https://sipena.perpusnas.go.id") return callback(null, true);
        if (origin === "https://admin.sipena.perpusnas.go.id") return callback(null, true);
        if (origin === "https://manajemen.sipena.perpusnas.go.id") return callback(null, true);
        // Allow any Vercel preview deployment URL (for trial purposes)
        if (origin.endsWith(".vercel.app")) return callback(null, true);
        // Allow localhost for local development (5173 for manajemen, 5174 for sipena)
        if (origin.startsWith("http://localhost")) return callback(null, true);
        // Allow LAN/intranet IP addresses
        if (origin.startsWith("http://192.168.")) return callback(null, true);
        if (origin.startsWith("http://10.")) return callback(null, true);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
};
app.use(cors(corsOptions));

// Handle CORS preflight (OPTIONS) for ALL routes — must be before toNodeHandler
// because better-auth's toNodeHandler intercepts OPTIONS before Express responds.
app.options("*", cors(corsOptions));

// Auth Routes MUST be before express.json() to avoid body consumption issues
app.all("/api/auth/*", toNodeHandler(auth));

// Parse JSON for all other routes
app.use(express.json());

// Serve static files from uploads directory
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// Auth middleware — extract user from session cookie for API routes
app.use("/api", authMiddleware);

// Request logger (for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${req.user ? `(user: ${req.user.email})` : '(anonymous)'}`);
    next();
});

// Basic health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api", router);

// Auto-migration: add status column if missing
async function runMigrations() {
    try {
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by TEXT`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION DEFAULT 0`);
        await db.execute(`ALTER TABLE projects ALTER COLUMN score TYPE DOUBLE PRECISION USING score::double precision`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        console.log("[migration] projects.status, created_by, score, page_count, and deleted_at columns ensured");
    } catch (e) {
        console.warn("[migration] skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT`);
        await db.execute(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE`);
        console.log("[migration] user.phone and is_reviewer columns ensured");
    } catch (e) {
        console.warn("[migration] phone/is_reviewer column skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`);
        await db.execute(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS telegram_link_token TEXT`);
        console.log("[migration] telegram columns ensured");
    } catch (e) {
        console.warn("[migration] telegram columns skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS revision_reason TEXT`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0`);
        console.log("[migration] stages.revision columns ensured");
    } catch (e) {
        console.warn("[migration] revision columns skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS revised_at TIMESTAMP`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION DEFAULT 0`);
        await db.execute(`ALTER TABLE stages ALTER COLUMN score TYPE DOUBLE PRECISION USING score::double precision`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS proposal_status TEXT`);
        console.log("[migration] stages.approved_at, revised_at, score, proposal_status columns ensured");
    } catch (e) {
        console.warn("[migration] approved_at/revised_at/score/proposal_status skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS co_pj_id TEXT REFERENCES "user"(id) ON DELETE SET NULL`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS co_pj_ids JSONB DEFAULT '[]'::jsonb`);
        console.log("[migration] stages.co_pj_id and co_pj_ids columns ensured");
    } catch (e) {
        console.warn("[migration] co_pj_id/co_pj_ids column skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS reviewer_id TEXT REFERENCES "user"(id) ON DELETE SET NULL`);
        console.log("[migration] stages.reviewer_id column ensured");
    } catch (e) {
        console.warn("[migration] reviewer_id column skipped:", (e as Error).message);
    }
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
                action TEXT NOT NULL,
                target TEXT,
                target_id TEXT,
                meta JSONB,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("[migration] audit_log table ensured");
    } catch (e) {
        console.warn("[migration] audit_log table skipped:", (e as Error).message);
    }
    try {
        await db.execute(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        console.log("[migration] documents.deleted_at column ensured");
    } catch (e) {
        console.warn("[migration] documents.deleted_at column skipped:", (e as Error).message);
    }
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("[migration] app_settings table ensured");
    } catch (e) {
        console.warn("[migration] app_settings table skipped:", (e as Error).message);
    }

    // Migrasi data: Kembalikan terjemahan sebagai type di terbitan dan tambahkan typeStages
    // PENTING: Jangan timpa seluruh data terbitan — hanya tambahkan typeStages/types yang hilang
    // agar skor yang sudah dikonfigurasi admin tidak ter-reset ke 0
    try {
        const updateResult = await db.execute(`UPDATE projects SET category = 'terbitan', type = 'terjemahan' WHERE category = 'terjemahan' AND type = 'reguler'`);
        if (updateResult.rowCount && updateResult.rowCount > 0) {
            console.log(`[migration] Reverted ${updateResult.rowCount} 'terjemahan' projects back to 'terbitan'.`);
        }

        const settingsRes = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'categories'`);
        if (settingsRes.rowCount && settingsRes.rowCount > 0) {
            const categoriesMap = (settingsRes.rows[0] as any).value as Record<string, any>;
            const { CATEGORIES } = await import("./data/categories.js");
            let changed = false;

            // Hapus kategori terjemahan lama jika masih ada
            if (categoriesMap['terjemahan']) {
                delete categoriesMap['terjemahan'];
                changed = true;
            }

            // Tambahkan typeStages ke terbitan jika belum ada — TANPA menimpa stages/scores
            const terbitan = categoriesMap['terbitan'];
            if (terbitan && !terbitan.typeStages) {
                terbitan.typeStages = (CATEGORIES as any)['terbitan'].typeStages;
                changed = true;
                console.log(`[migration] Added missing typeStages to terbitan.`);
            }

            // Patch: pastikan semua kategori baku ada di app_settings (merge, bukan replace)
            for (const catKey of Object.keys(CATEGORIES as any)) {
                if (!categoriesMap[catKey]) {
                    categoriesMap[catKey] = (CATEGORIES as any)[catKey];
                    changed = true;
                    console.log(`[migration] Added missing category: ${catKey}`);
                }
            }

            if (changed) {
                await db.execute(sql`UPDATE app_settings SET value = ${JSON.stringify(categoriesMap)} WHERE key = 'categories'`);
                console.log(`[migration] app_settings patched (typeStages & missing categories added, scores preserved).`);
            }
        }
    } catch (e) {
        console.warn("[migration] terjemahan category reversion skipped:", (e as Error).message);
    }

    // One-time score migration: perbaiki skor semua tahapan yang masih 0 di kategori Terbitan
    // berdasarkan konfigurasi poin yang sudah ditetapkan admin di database saat ini (app_settings)
    // PENTING: JANGAN sentuh stage yang sudah punya riwayat koreksi poin manual dari Admin
    //          (dicatat di audit_logs dengan action='update_project' dan meta.newScore atau meta.score)
    try {
        const settingsRes = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'categories'`);
        if (settingsRes.rowCount && settingsRes.rowCount > 0) {
            const categoriesMap = (settingsRes.rows[0] as any).value as Record<string, any>;
            const terbitanStages = categoriesMap['terbitan']?.stages || [];

            // Ambil semua tahapan Terbitan yang done/archived dengan score=0
            // TAPI KECUALIKAN yang sudah punya riwayat koreksi manual dari Admin
            // (ditandai dengan adanya audit log action='update_project' untuk stage tersebut,
            //  atau approve_stage log dengan meta.score yang sudah di-sync)
            const stagesRes = await db.execute(sql`
                SELECT s.id, s.label, s.score, p.page_count
                FROM stages s
                JOIN projects p ON p.id = s.project_id
                WHERE p.category = 'terbitan'
                  AND (s.status = 'done' OR s.status = 'archived')
                  AND s.score = 0
                  AND s.id::text NOT IN (
                      SELECT DISTINCT target_id FROM audit_log
                      WHERE action = 'update_project'
                        AND target_id = s.id::text
                        AND meta->>'newScore' IS NOT NULL
                  )
                  AND s.id::text NOT IN (
                      SELECT DISTINCT target_id FROM audit_log
                      WHERE action = 'approve_stage'
                        AND target_id = s.id::text
                        AND meta->>'score' = '0'
                  )
            `);

            let fixedCount = 0;
            for (const row of stagesRes.rows as any[]) {
                // Cari pengaturan stage ini dari app_settings
                const cfg = terbitanStages.find((s: any) => s.label === row.label);
                if (!cfg) continue;

                let newScore = 0;
                // Logika: utamakan perPageScore jika pageCount ada.
                // Jika pageCount kosong (0/NULL), jatuh ke 'score' tetap (fallback).
                if (cfg.perPageScore && cfg.perPageScore > 0 && row.page_count > 0) {
                    const multiplier = cfg.pageMultiplier || 1;
                    newScore = Math.round(((row.page_count / multiplier) * cfg.perPageScore) * 100) / 100;
                } else if (cfg.score && cfg.score > 0) {
                    newScore = cfg.score;
                }

                if (newScore > 0) {
                    await db.execute(sql`UPDATE stages SET score = ${newScore} WHERE id = ${row.id}`);
                    fixedCount++;
                }
            }

            if (fixedCount > 0) {
                console.log(`[migration] Fixed ${fixedCount} stage scores for Terbitan using UI settings.`);
            }
        }
    } catch (e) {
        console.warn("[migration] score fix skipped:", (e as Error).message);
    }

    // Auto-seed developer accounts for local testing
    const isLocal = !process.env.NODE_ENV || process.env.NODE_ENV === "development" || (process.env.BETTER_AUTH_URL || "").includes("localhost");
    if (isLocal) {
        try {
            const adminCheck = await db.execute(`SELECT id FROM "user" WHERE email = 'admin@dev.local'`);
            if (adminCheck.rowCount === 0) {
                console.log("[dev-seed] Seeding developer admin account...");
                await auth.api.signUpEmail({
                    body: {
                        email: "admin@dev.local",
                        password: "developer123",
                        name: "Developer Admin",
                    }
                });
                await db.execute(`UPDATE "user" SET role = 'admin', status = 'active', email_verified = true WHERE email = 'admin@dev.local'`);
                console.log("[dev-seed] Admin seeded successfully! (admin@dev.local / developer123)");
            }
        } catch (err) {
            console.warn("[dev-seed] Failed to seed admin user:", (err as Error).message);
        }

        try {
            const personilCheck = await db.execute(`SELECT id FROM "user" WHERE email = 'personil@dev.local'`);
            if (personilCheck.rowCount === 0) {
                console.log("[dev-seed] Seeding developer personil account...");
                await auth.api.signUpEmail({
                    body: {
                        email: "personil@dev.local",
                        password: "developer123",
                        name: "Developer Personil",
                    }
                });
                await db.execute(`UPDATE "user" SET role = 'personil', status = 'active', email_verified = true WHERE email = 'personil@dev.local'`);
                console.log("[dev-seed] Personil seeded successfully! (personil@dev.local / developer123)");
            }
        } catch (err) {
            console.warn("[dev-seed] Failed to seed personil user:", (err as Error).message);
        }
    }

    // Auto-sync existing projects stages with the new Terbitan, Medsos, and Keuangan workflow rules
    try {
        console.log("[migration] Syncing existing stages with new workflow rules...");
        const activeProjects = await db.execute(`SELECT id, category FROM projects WHERE status = 'active'`);
        for (const row of activeProjects.rows) {
            if (row.category === 'terbitan') {
                await db.execute(`
                    UPDATE stages 
                    SET status = 'active' 
                    WHERE project_id = '${row.id}' 
                      AND label IN ('Penyuntingan', 'Pembuatan Surat Penerimaan Terbitan', 'Penginputan Nomor Induk Penerbitan', 'Desain Sampul')
                      AND status = 'draft'
                      AND EXISTS (
                          SELECT 1 FROM stages 
                          WHERE project_id = '${row.id}' 
                            AND label = 'Kelengkapan Naskah' 
                            AND status IN ('done', 'archived')
                      )
                `);
            }
        }
        
        // Auto-sync parallel/flexible projects (promosi, lainnya, bimtek, medsos, deposit): set all 'draft' stages to 'active' for active projects
        await db.execute(`
            UPDATE stages 
            SET status = 'active' 
            WHERE status = 'draft' 
              AND project_id IN (
                  SELECT id FROM projects 
                  WHERE (workflow_type = 'parallel' OR category IN ('promosi', 'lainnya', 'bimtek', 'medsos', 'deposit')) 
                    AND status = 'active'
              )
        `);

        // Ensure description column on stages table
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS description text;`);

        console.log("[migration] Workflow sync completed successfully!");
    } catch (e) {
        console.warn("[migration] workflow sync skipped:", (e as Error).message);
    }
}

runMigrations().then(async () => {
    app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        await startPolling();
        
        // Mulai job auto-archive proyek secara background
        startAutoArchiveJob();
    });
});
