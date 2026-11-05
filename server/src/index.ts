import express from "express";
import path from "path";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import * as schema from "./db/schema";
import { sql } from "drizzle-orm";
import router from "./routes";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import { authMiddleware } from "./middlewares/auth";
import { startPolling } from "./services/telegramService";
import { startAutoArchiveJob } from "./services/projectService";
import {
    loginRateLimiter,
    AuthSecurityController,
    getClientIp,
    getFailedAttempts,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    verifyCaptchaSolution,
} from "./middlewares/authSecurity";
import { SecurityLogger } from "./services/securityLogger";

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

// ── Anti-Brute Force, Rate Limiting & CAPTCHA Endpoints ────────────────────
app.get("/api/auth/security-status", AuthSecurityController.getStatus);
app.get("/api/auth/captcha-new", AuthSecurityController.getNewCaptcha);
app.post("/api/auth/verify-captcha", express.json(), AuthSecurityController.verifyCaptcha);

// Rate Limiting (5x / 15m), Response Uniformity & CAPTCHA Enforcement on sign-in
app.post(
    "/api/auth/sign-in/email",
    express.json(),
    loginRateLimiter,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const ip = getClientIp(req);
        const email = (req.body?.email || "").trim().toLowerCase();
        const failures = getFailedAttempts(ip, email);

        // Selalu wajibkan verifikasi CAPTCHA pada setiap percobaan login
        const { captchaToken, captchaAnswer } = req.body || {};
        if (!captchaToken || !captchaAnswer || !verifyCaptchaSolution(captchaToken, captchaAnswer)) {
            SecurityLogger.logFailedLogin({
                email,
                ip,
                userAgent: req.headers["user-agent"] as string,
                reason: "Jawaban angka CAPTCHA tidak tepat atau belum diisi",
                consecutiveFailures: failures,
            });
            return res.status(400).json({
                error: "Jawaban angka CAPTCHA tidak tepat atau belum diisi. Silakan hitung kembali.",
                message: "Jawaban angka CAPTCHA tidak tepat atau belum diisi. Silakan hitung kembali.",
                isCaptchaError: true,
                requiresCaptcha: true,
                consecutiveFailures: failures,
            });
        }

        // Intercept response Better Auth untuk Response Uniformity (mencegah User Enumeration)
        const originalEnd = res.end.bind(res);
        const originalWriteHead = res.writeHead.bind(res);
        let chunks: Buffer[] = [];
        let interceptedStatus = 200;
        let interceptedHeaders: Record<string, any> = {};

        res.writeHead = function (status: any, headers?: any) {
            interceptedStatus = typeof status === "number" ? status : 200;
            if (headers) Object.assign(interceptedHeaders, headers);
            return res;
        };

        res.write = function (chunk: any) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
        };

        res.end = function (chunk?: any) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

            if (interceptedStatus >= 400 && interceptedStatus < 500) {
                const rawBody = Buffer.concat(chunks).toString("utf-8");
                let parsed: any = {};
                try {
                    parsed = JSON.parse(rawBody);
                } catch {
                    parsed = {};
                }

                const errMsg = String(parsed.message || parsed.error || "").toLowerCase();
                let newBody: any;

                if (errMsg.includes("verify") || errMsg.includes("verification") || parsed.code === "EMAIL_NOT_VERIFIED") {
                    newBody = {
                        error: "Email Anda belum diverifikasi. Silakan periksa kotak masuk email Anda untuk melakukan verifikasi akun sebelum login.",
                        message: "Email Anda belum diverifikasi. Silakan periksa kotak masuk email Anda untuk melakukan verifikasi akun sebelum login.",
                        code: "EMAIL_NOT_VERIFIED",
                        requiresVerification: true,
                    };
                } else {
                    const currentFailures = recordFailedAttempt(ip, email);
                    SecurityLogger.logFailedLogin({
                        email,
                        ip,
                        userAgent: req.headers["user-agent"] as string,
                        reason: "Email atau kata sandi tidak sesuai",
                        consecutiveFailures: currentFailures,
                    });

                    newBody = {
                        error: "Email atau kata sandi tidak sesuai.",
                        message: "Email atau kata sandi tidak sesuai.",
                        requiresCaptcha: currentFailures >= 3,
                        consecutiveFailures: currentFailures,
                    };
                }

                const buf = Buffer.from(JSON.stringify(newBody));
                interceptedHeaders["content-type"] = "application/json";
                interceptedHeaders["content-length"] = buf.length;
                originalWriteHead(interceptedStatus, interceptedHeaders);
                return originalEnd(buf);
            }

            if (interceptedStatus >= 200 && interceptedStatus < 300) {
                recordSuccessfulAttempt(ip, email);
                SecurityLogger.logSuccessfulLogin({
                    email,
                    ip,
                    userAgent: req.headers["user-agent"] as string,
                });
            }

            const combined = Buffer.concat(chunks);
            originalWriteHead(interceptedStatus, interceptedHeaders);
            return originalEnd(combined);
        };

        next();
    }
);

// Endpoint aktivasi / verifikasi email langsung (mendukung dev mode & pengujian lokal)
app.post("/api/auth/verify-email-direct", express.json(), async (req: express.Request, res: express.Response) => {
    try {
        const email = (req.body?.email || "").trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ error: "Email diperlukan untuk verifikasi" });
        }

        const existing = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`).limit(1);
        if (existing.length === 0) {
            return res.status(404).json({ error: "Akun dengan email tersebut tidak ditemukan" });
        }

        await db.update(schema.users).set({ emailVerified: true }).where(sql`lower(${schema.users.email}) = lower(${email})`);

        return res.json({
            success: true,
            status: true,
            message: "Email berhasil diverifikasi! Akun Anda telah aktif dan dapat langsung digunakan untuk masuk.",
            email: existing[0].email,
        });
    } catch (err: any) {
        console.error("Error in verify-email-direct:", err);
        return res.status(500).json({ error: "Gagal memproses verifikasi email", details: err?.message });
    }
});

// Auth Routes — delegated to Better Auth
app.all("/api/auth/*", toNodeHandler(auth));

// Parse JSON for all other routes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from uploads directory (supports both /api/uploads and /uploads)
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

// Global Error Handler (Express)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[GLOBAL_EXPRESS_ERROR]", err);
    res.status(err.status || 500).json({
        error: err.message || "Terjadi kesalahan pada server"
    });
});

// Auto-migration: add status column if missing
async function runMigrations() {
    try {
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by TEXT`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION DEFAULT 0`);
        await db.execute(`ALTER TABLE projects ALTER COLUMN score TYPE DOUBLE PRECISION USING score::double precision`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS author TEXT`);
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`);
        console.log("[migration] projects.status, created_by, author, stages.metadata ensured");
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
        await db.execute(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP`);
        console.log("[migration] stages.approved_at, revised_at, score, proposal_status, submitted_at columns ensured");
    } catch (e) {
        console.warn("[migration] approved_at/revised_at/score/proposal_status/submitted_at skipped:", (e as Error).message);
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
        await db.execute(`ALTER TABLE books ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0`);
        await db.execute(`UPDATE books SET read_count = COALESCE(download_count, 0) * 2 + 15 WHERE read_count IS NULL OR read_count = 0`);
        console.log("[migration] books.read_count column ensured and initialized");
    } catch (e) {
        console.warn("[migration] books.read_count skipped:", (e as Error).message);
    }
    try {
        await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS unique_user_book_rating ON book_ratings (book_id, user_id)`);
        console.log("[migration] book_ratings unique index ensured");
    } catch (e) {
        console.warn("[migration] books.read_count skipped:", (e as Error).message);
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
    try {
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_token TEXT`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_claim_open BOOLEAN DEFAULT FALSE`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS claim_opens_at TEXT`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS time TEXT`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_url TEXT`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::jsonb`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 0`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_url TEXT`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_name_pos_y INTEGER DEFAULT 96`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_font_size INTEGER DEFAULT 24`);
        await db.execute(`ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_font_family TEXT DEFAULT 'helvetica'`);
        await db.execute(`
            CREATE TABLE IF NOT EXISTS event_participants (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                institution TEXT,
                token_used TEXT NOT NULL,
                certificate_number TEXT,
                status TEXT DEFAULT 'Hadir',
                claimed_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS unique_user_event_cert ON event_participants (event_id, user_id)`);
        console.log("[migration] events & event_participants columns and table ensured");
    } catch (e) {
        console.warn("[migration] events & event_participants skipped:", (e as Error).message);
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

        // Sync submitted_at from review notifications (memastikan poin dihitung berdasarkan waktu pengajuan review PJ)
        try {
            await db.execute(sql`
                WITH notif_stages AS (
                    SELECT 
                        n.project_id,
                        n.created_at as notif_time,
                        TRIM(LOWER(substring(n.message from 'Tahap ["'']([^"'']+)["'']'))) as stage_label
                    FROM notifications n
                    WHERE n.type = 'review' OR n.message ILIKE '%menunggu review%'
                ),
                latest_notifs AS (
                    SELECT DISTINCT ON (project_id, stage_label)
                        project_id,
                        stage_label,
                        notif_time
                    FROM notif_stages
                    WHERE stage_label IS NOT NULL
                    ORDER BY project_id, stage_label, notif_time DESC
                )
                UPDATE stages s
                SET submitted_at = ln.notif_time
                FROM latest_notifs ln
                WHERE ln.project_id = s.project_id 
                  AND TRIM(LOWER(s.label)) = ln.stage_label
                  AND (
                      s.submitted_at IS NULL 
                      OR (s.submitted_at >= '2026-11-01' AND ln.notif_time < '2026-11-01')
                      OR s.submitted_at > (ln.notif_time + interval '5 minutes')
                  )
            `);
            console.log("[migration] Synced stages.submitted_at from review notifications");
        } catch (e) {
            console.warn("[migration] submitted_at sync from notifications skipped:", (e as Error).message);
        }

        // Fallback untuk tahapan selesai yang submitted_at nya masih NULL
        try {
            await db.execute(sql`
                UPDATE stages s
                SET submitted_at = COALESCE(s.approved_at, p.created_at, NOW())
                FROM projects p
                WHERE s.project_id = p.id
                  AND s.submitted_at IS NULL
                  AND s.status IN ('done', 'archived')
            `);
            console.log("[migration] Fallback completed stages.submitted_at ensured");
        } catch (e) {
            console.warn("[migration] fallback submitted_at skipped:", (e as Error).message);
        }

        // Auto-link existing manuscripts and books by title or project, and upgrade author role
        try {
            await db.execute(sql`
                UPDATE manuscripts 
                SET project_id = 'PRJ-2026-ZV9F', status = 'published', updated_at = NOW() 
                WHERE id = 'ebb69f8e-f1f5-411e-9932-60ca58e8dcea' AND project_id IS NULL
            `);

            await db.execute(sql`
                UPDATE books 
                SET project_id = 'PRJ-2026-ZV9F', 
                    author_id = 'tkVJdyexUEz4bXFlO9MxcKkyaiXpPRpQ', 
                    updated_at = NOW() 
                WHERE id = '8bc40df3-7ca1-4be2-a6a1-4b65e3c5b830' AND project_id IS NULL
            `);

            await db.execute(sql`
                UPDATE "user"
                SET role = 'penulis', updated_at = NOW()
                WHERE id IN (
                    SELECT author_id FROM manuscripts WHERE status = 'published' AND author_id IS NOT NULL
                )
                AND role IN ('pengunjung', 'user', 'calon_penulis')
            `);
            console.log("[migration] Synced manuscripts, books, and upgraded published authors to role 'penulis'");
        } catch (e) {
            console.warn("[migration] manuscripts/books sync skipped:", (e as Error).message);
        }

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

        // Mulai pembersihan sesi yang kedaluwarsa secara berkala (setiap 30 menit)
        const cleanupExpiredSessions = async () => {
            try {
                await db.delete(schema.sessions).where(sql`${schema.sessions.expiresAt} < NOW()`);
            } catch (err) {
                console.warn("[session-cleanup] Gagal membersihkan sesi kedaluwarsa:", err);
            }
        };
        cleanupExpiredSessions();
        setInterval(cleanupExpiredSessions, 30 * 60 * 1000);
    });
});
// Trigger tsx watch reload for avatar upload and author profile routes
