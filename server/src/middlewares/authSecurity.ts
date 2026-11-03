import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { SecurityLogger } from "../services/securityLogger";
import crypto from "crypto";

// ── In-Memory Tracker untuk Percobaan Gagal Beruntun ─────────────────────────
interface FailureRecord {
    count: number;
    lastFailedAt: number;
}

const failuresMap = new Map<string, FailureRecord>();
const FAILURE_TTL_MS = 15 * 60 * 1000; // Reset setelah 15 menit jika tidak ada aktivitas

// ── In-Memory Store untuk CAPTCHA Challenges ─────────────────────────────────
interface CaptchaRecord {
    answer: string;
    expiresAt: number;
}

const captchaStore = new Map<string, CaptchaRecord>();

// Bersihkan data lama secara berkala setiap 5 menit
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of failuresMap.entries()) {
        if (now - record.lastFailedAt > FAILURE_TTL_MS) {
            failuresMap.delete(key);
        }
    }
    for (const [key, record] of captchaStore.entries()) {
        if (now > record.expiresAt) {
            captchaStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

export function getSecurityKey(ip: string, email: string): string {
    const cleanEmail = (email || "").trim().toLowerCase();
    return `${ip}:${cleanEmail}`;
}

export function recordFailedAttempt(ip: string, email: string): number {
    const key = getSecurityKey(ip, email);
    const now = Date.now();
    const record = failuresMap.get(key) || { count: 0, lastFailedAt: now };
    record.count += 1;
    record.lastFailedAt = now;
    failuresMap.set(key, record);
    return record.count;
}

export function recordSuccessfulAttempt(ip: string, email: string): void {
    const key = getSecurityKey(ip, email);
    failuresMap.delete(key);
}

export function getFailedAttempts(ip: string, email: string): number {
    const key = getSecurityKey(ip, email);
    const record = failuresMap.get(key);
    if (!record) return 0;
    if (Date.now() - record.lastFailedAt > FAILURE_TTL_MS) {
        failuresMap.delete(key);
        return 0;
    }
    return record.count;
}

// ── 1. Rate Limiting Middleware (5 Percobaan / 15 Menit) ─────────────────────
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // Maksimal 5 percobaan
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const ip = getClientIp(req);
        const email = req.body?.email || req.query?.email || "";
        return getSecurityKey(ip, email);
    },
    handler: (req: Request, res: Response) => {
        const ip = getClientIp(req);
        const email = req.body?.email || req.query?.email || "";
        const userAgent = req.headers["user-agent"] as string;

        SecurityLogger.logRateLimitExceeded({
            email,
            ip,
            userAgent,
        });

        res.status(429).json({
            status: 429,
            error: "Terlalu banyak percobaan login gagal. Demi keamanan akun Anda, silakan coba lagi dalam 15 menit.",
            code: "TOO_MANY_REQUESTS",
            retryAfter: 900,
        });
    },
});

// ── 2. CAPTCHA Generator & Verifier ─────────────────────────────────────────
export function generateCaptchaChallenge(): { token: string; question: string; num1: number; num2: number } {
    const num1 = Math.floor(Math.random() * 12) + 1;
    const num2 = Math.floor(Math.random() * 12) + 1;
    const answer = String(num1 + num2);
    const token = crypto.randomUUID();

    captchaStore.set(token, {
        answer,
        expiresAt: Date.now() + 5 * 60 * 1000, // berlaku 5 menit
    });

    return {
        token,
        question: `Berapa hasil dari ${num1} + ${num2}?`,
        num1,
        num2,
    };
}

export function verifyCaptchaSolution(token: string, answer: string): boolean {
    if (!token || !answer) return false;
    const record = captchaStore.get(token);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
        captchaStore.delete(token);
        return false;
    }
    const isValid = record.answer.trim() === String(answer).trim();
    if (isValid) {
        // Hapus token setelah digunakan sekali pakai
        captchaStore.delete(token);
    }
    return isValid;
}

// ── 3. Endpoint Handlers ────────────────────────────────────────────────────
export const AuthSecurityController = {
    /**
     * GET /api/auth/security-status?email=...
     * Memberitahu frontend apakah user membutuhkan CAPTCHA (gagal >= 3x)
     */
    getStatus: (req: Request, res: Response) => {
        const ip = getClientIp(req);
        const email = String(req.query.email || "");
        const failures = getFailedAttempts(ip, email);

        res.json({
            consecutiveFailures: failures,
            requiresCaptcha: failures >= 3,
            maxAllowedAttempts: 5,
            remainingBeforeLockout: Math.max(0, 5 - failures),
        });
    },

    /**
     * GET /api/auth/captcha-new
     * Menghasilkan tantangan CAPTCHA baru
     */
    getNewCaptcha: (req: Request, res: Response) => {
        const challenge = generateCaptchaChallenge();
        res.json(challenge);
    },

    /**
     * POST /api/auth/verify-captcha
     * Memverifikasi jawaban CAPTCHA
     */
    verifyCaptcha: (req: Request, res: Response) => {
        const { token, answer } = req.body || {};
        const isValid = verifyCaptchaSolution(token, answer);
        if (isValid) {
            res.json({ success: true, message: "Verifikasi CAPTCHA berhasil" });
        } else {
            res.status(400).json({ success: false, error: "Jawaban verifikasi CAPTCHA salah atau telah kedaluwarsa" });
        }
    },
};
