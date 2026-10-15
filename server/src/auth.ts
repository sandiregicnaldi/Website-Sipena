import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendPasswordResetEmail } from "./lib/resend";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }) => {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            const resetLink = `${frontendUrl}/reset-password?token=${token}`;
            await sendPasswordResetEmail(user.email, resetLink);
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    trustedOrigins: (() => {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const origins = [
            frontendUrl,
            "http://192.168.40.37",
            "https://192.168.40.37",
            "http://192.168.40.37.nip.io",
            "https://192.168.40.37.nip.io",
            "https://press.perpusnas.go.id",
            "http://press.perpusnas.go.id",
            "https://manajemen-penerbitan.perpusnas.go.id",
            "http://manajemen-penerbitan.perpusnas.go.id",
            "https://sipena.perpusnas.go.id",
            "https://admin.sipena.perpusnas.go.id",
            "https://manajemen.sipena.perpusnas.go.id",
        ];
        // Tambahkan semua port localhost yang mungkin dipakai Vite saat dev
        for (let port = 5173; port <= 5180; port++) {
            origins.push(`http://localhost:${port}`);
        }
        // Tambahkan varian nip.io jika FRONTEND_URL berbasis IP
        const ipMatch = frontendUrl.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
            const ip = ipMatch[1];
            origins.push(`http://${ip}.nip.io`);
            origins.push(`https://${ip}.nip.io`);
            origins.push(`http://${ip}`);
        }
        return origins;
    })(),
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "pengunjung",
                input: true,
            },
            status: {
                type: "string",
                defaultValue: "active",
                input: true,
            },
            isReviewer: {
                type: "boolean",
                defaultValue: false,
                input: true,
            },
            avatarInitials: {
                type: "string",
                required: false,
                input: false,
            },
            skills: {
                type: "string[]",
                required: false,
                input: false,
            },
            tempatLahir: { type: "string", required: false, input: true },
            tanggalLahir: { type: "string", required: false, input: true },
            pekerjaan: { type: "string", required: false, input: true },
            instansi: { type: "string", required: false, input: true },
            alamatLengkap: { type: "string", required: false, input: true },
            provinsi: { type: "string", required: false, input: true },
            kota: { type: "string", required: false, input: true },
            kecamatan: { type: "string", required: false, input: true },
            kelurahan: { type: "string", required: false, input: true },
            website: { type: "string", required: false, input: true },
            bio: { type: "string", required: false, input: true },
            profesi: { type: "string", required: false, input: true },
            domisili: { type: "string", required: false, input: true },
            karyaEksternal: { type: "string", required: false, input: true },
        },
    },
    advanced: {
        useSecureCookies: false, // Set to true in production if using HTTPS
        crossSubDomainCookies: {
            enabled: true
        },
        defaultCookieAttributes: {
            sameSite: 'lax' as const,
            secure: false, // Set to true in production with HTTPS
        },
    },
    onAPIError: {
        throw: false,
        onError: (error: any, ctx: any) => {
            // Log error tetapi jangan redirect — biarkan frontend yang menangani
            console.error("[BetterAuth API Error]:", error?.message || error);
        },
    },
});

