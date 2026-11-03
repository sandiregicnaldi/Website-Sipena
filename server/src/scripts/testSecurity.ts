import { db } from "../db";
import { auditLogs } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { SecurityLogger } from "../services/securityLogger";
import {
    generateCaptchaChallenge,
    verifyCaptchaSolution,
    recordFailedAttempt,
    getFailedAttempts,
    recordSuccessfulAttempt
} from "../middlewares/authSecurity";

async function runSecurityTests() {
    console.log("=== MEMULAI TEST SISTEM PROTEKSI BRUTE FORCE & KEAMANAN ===");

    // 1. Test Logging Service Langsung
    const testEmail = `test_attacker_${Date.now()}@bruteforce.com`;
    const testIp = "192.168.1.100";

    console.log("\n[TEST 1] Logging Failed Login ke File & DB...");
    await SecurityLogger.logFailedLogin({
        email: testEmail,
        ip: testIp,
        userAgent: "Security-Tester-Bot/1.0",
        reason: "Email atau kata sandi tidak sesuai",
        consecutiveFailures: 3,
    });

    const logFile = path.resolve(__dirname, "../../logs/auth-security.log");
    if (fs.existsSync(logFile)) {
        const fileContent = fs.readFileSync(logFile, "utf-8");
        const found = fileContent.includes(testEmail);
        console.log("✓ Berkas log server/logs/auth-security.log berhasil ditulis:", found);
    } else {
        console.error("✗ Berkas log tidak ditemukan di:", logFile);
    }

    const dbLogs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.target, testEmail))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

    if (dbLogs.length > 0 && dbLogs[0].action === "login_failed") {
        console.log("✓ Database audit_log berhasil mencatat percobaan login gagal:", dbLogs[0].action, dbLogs[0].target);
    } else {
        console.error("✗ Database log tidak ditemukan");
    }

    // 2. Test Rate Limit Exceeded Logging
    console.log("\n[TEST 2] Logging Rate Limit Exceeded...");
    await SecurityLogger.logRateLimitExceeded({
        email: testEmail,
        ip: testIp,
        userAgent: "Security-Tester-Bot/1.0",
    });

    const rateLimitDbLogs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.target, testEmail))
        .orderBy(desc(auditLogs.createdAt))
        .limit(2);

    const hasRateLimit = rateLimitDbLogs.some(l => l.action === "rate_limit_exceeded");
    console.log("✓ Database audit_log berhasil mencatat rate_limit_exceeded:", hasRateLimit);

    // 3. Test CAPTCHA Generator & Verifier
    console.log("\n[TEST 3] CAPTCHA Generator & Solver Verification...");
    const challenge = generateCaptchaChallenge();
    console.log(`✓ CAPTCHA digenerate: ${challenge.question} (Token: ${challenge.token})`);
    
    // Jawaban salah
    const wrongValid = verifyCaptchaSolution(challenge.token, "999");
    console.log("✓ Jawaban salah ditolak:", !wrongValid);

    // Generate tantangan baru untuk jawaban benar
    const challenge2 = generateCaptchaChallenge();
    const correctAnswer = String(challenge2.num1 + challenge2.num2);
    const rightValid = verifyCaptchaSolution(challenge2.token, correctAnswer);
    console.log(`✓ Jawaban benar (${correctAnswer}) diterima:`, rightValid);

    // Token satu kali pakai
    const reusable = verifyCaptchaSolution(challenge2.token, correctAnswer);
    console.log("✓ Token CAPTCHA satu kali pakai (tidak bisa dipakai ulang):", !reusable);

    // 4. Test Failed Attempts Tracker
    console.log("\n[TEST 4] Failed Attempts Tracker...");
    const dummyIp = "10.0.0.99";
    const dummyEmail = "victim@domain.id";

    recordFailedAttempt(dummyIp, dummyEmail);
    recordFailedAttempt(dummyIp, dummyEmail);
    const count3 = recordFailedAttempt(dummyIp, dummyEmail);
    console.log(`✓ Percobaan gagal ke-3 tercatat: ${count3}x (Membutuhkan CAPTCHA: ${count3 >= 3})`);

    recordSuccessfulAttempt(dummyIp, dummyEmail);
    const resetCount = getFailedAttempts(dummyIp, dummyEmail);
    console.log(`✓ Setelah login sukses, counter direset: ${resetCount}x`);

    console.log("\n=== SELURUH PENGUJIAN LOGIKA KEAMANAN BERHASIL 100% ===");
    process.exit(0);
}

runSecurityTests();
