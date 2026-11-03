import fs from "fs";
import path from "path";
import { db } from "../db";
import { auditLogs } from "../db/schema";

const LOGS_DIR = path.resolve(__dirname, "../../logs");
const LOG_FILE = path.join(LOGS_DIR, "auth-security.log");

function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        try {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        } catch (e) {
            console.error("[SecurityLogger] Failed to create logs directory:", e);
        }
    }
}

export class SecurityLogger {
    /**
     * Tulis pesan ke berkas file log (append-only)
     */
    static writeToFile(type: string, message: string) {
        try {
            ensureLogsDir();
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${type}] ${message}\n`;
            fs.appendFileSync(LOG_FILE, logEntry, "utf-8");
        } catch (err) {
            console.error("[SecurityLogger] Error writing to file log:", err);
        }
    }

    /**
     * Catat percobaan login yang gagal (File & Database Audit Log)
     */
    static async logFailedLogin(params: {
        email: string;
        ip: string;
        userAgent?: string;
        reason?: string;
        consecutiveFailures?: number;
    }) {
        const { email, ip, userAgent = "Unknown", reason = "Kredensial tidak sesuai", consecutiveFailures = 1 } = params;

        // 1. Catat ke berkas file log
        this.writeToFile(
            "FAILED_LOGIN",
            `IP: ${ip} | Email: ${email || "None"} | Failures: ${consecutiveFailures} | Reason: ${reason} | UA: ${userAgent}`
        );

        // 2. Simpan ke database audit_log
        try {
            await db.insert(auditLogs).values({
                action: "login_failed",
                target: email || "unknown",
                ipAddress: ip,
                meta: {
                    userAgent,
                    reason,
                    consecutiveFailures,
                    timestamp: new Date().toISOString(),
                },
                createdAt: new Date(),
            });
        } catch (dbErr) {
            console.error("[SecurityLogger] Failed to write failed login to DB audit_log:", dbErr);
        }
    }

    /**
     * Catat login yang berhasil
     */
    static async logSuccessfulLogin(params: {
        userId?: string;
        email: string;
        ip: string;
        userAgent?: string;
    }) {
        const { userId, email, ip, userAgent = "Unknown" } = params;

        this.writeToFile("SUCCESS_LOGIN", `IP: ${ip} | Email: ${email} | UserId: ${userId || "N/A"}`);

        try {
            await db.insert(auditLogs).values({
                userId: userId || null,
                action: "login",
                target: email,
                ipAddress: ip,
                meta: {
                    userAgent,
                    timestamp: new Date().toISOString(),
                },
                createdAt: new Date(),
            });
        } catch (dbErr) {
            console.error("[SecurityLogger] Failed to write success login to DB audit_log:", dbErr);
        }
    }

    /**
     * Catat saat batasan rate limit (5x percobaan / 15 menit) terpicu
     */
    static async logRateLimitExceeded(params: {
        email: string;
        ip: string;
        userAgent?: string;
    }) {
        const { email, ip, userAgent = "Unknown" } = params;

        this.writeToFile(
            "RATE_LIMIT_EXCEEDED",
            `BLOCKED: IP: ${ip} | Email: ${email || "None"} | Window: 15m (max 5 attempts)`
        );

        try {
            await db.insert(auditLogs).values({
                action: "rate_limit_exceeded",
                target: email || "unknown",
                ipAddress: ip,
                meta: {
                    userAgent,
                    limit: 5,
                    window: "15 minutes",
                    timestamp: new Date().toISOString(),
                },
                createdAt: new Date(),
            });
        } catch (dbErr) {
            console.error("[SecurityLogger] Failed to write rate limit event to DB audit_log:", dbErr);
        }
    }
}
