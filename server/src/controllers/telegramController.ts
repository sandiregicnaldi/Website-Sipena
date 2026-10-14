
import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendTelegramMessage } from '../services/telegramService';
import crypto from 'crypto';

export const TelegramController = {

    /**
     * GET /api/telegram/link-token
     * Generate token unik untuk user yang sedang login,
     * agar bisa di-link ke akun Telegram mereka.
     */
    async getLinkToken(req: Request, res: Response) {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Generate token acak 8 karakter
        const token = crypto.randomBytes(4).toString('hex').toUpperCase();

        await db.update(users)
            .set({ telegramLinkToken: token })
            .where(eq(users.id, userId));

        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'dasbor_penerbitan_bot';
        res.json({
            token,
            instruction: `Kirim pesan berikut ke bot Telegram kami:\n/start ${token}`,
            botLink: `https://t.me/${botUsername}?start=${token}`,
        });
    },

    /**
     * DELETE /api/telegram/unlink
     * Putuskan koneksi Telegram user
     */
    async unlink(req: Request, res: Response) {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await db.update(users)
            .set({ telegramChatId: null, telegramLinkToken: null })
            .where(eq(users.id, userId));

        res.json({ success: true });
    },

    /**
     * GET /api/telegram/status
     * Cek apakah user sudah link Telegram
     */
    async getStatus(req: Request, res: Response) {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { telegramChatId: true },
        });

        res.json({ linked: !!user?.telegramChatId });
    },

    /**
     * POST /api/telegram/webhook
     * Dipanggil oleh Telegram saat ada pesan masuk ke bot.
     * Format pesan yang diproses: /start TOKEN
     */
    async webhook(req: Request, res: Response) {
        const body = req.body;
        const message = body?.message;

        if (!message?.text) return res.sendStatus(200);

        const chatId = String(message.chat.id);
        const text = message.text.trim();
        const senderName = message.from?.first_name || 'Pengguna';

        // Handle /start TOKEN
        if (text.startsWith('/start ')) {
            const token = text.replace('/start ', '').trim().toUpperCase();

            const user = await db.query.users.findFirst({
                where: eq(users.telegramLinkToken, token),
                columns: { id: true, name: true, telegramLinkToken: true },
            });

            if (!user) {
                await sendTelegramMessage(chatId,
                    `❌ Kode <b>${token}</b> tidak valid atau sudah kadaluarsa.\n\nSilakan buat kode baru dari halaman profil Dasbor Penerbitan.`
                );
                return res.sendStatus(200);
            }

            // Simpan chat_id, hapus link token
            await db.update(users)
                .set({ telegramChatId: chatId, telegramLinkToken: null })
                .where(eq(users.id, user.id));

            await sendTelegramMessage(chatId,
                `✅ Berhasil!\n\nHalo <b>${user.name}</b>, akun Telegram Anda sudah terhubung ke Dasbor Penerbitan.\n\nAnda akan menerima notifikasi di sini ketika ada penugasan atau update proyek.`
            );
            return res.sendStatus(200);
        }

        // Handle /start tanpa token (menu welcome)
        if (text === '/start') {
            await sendTelegramMessage(chatId,
                `👋 Halo <b>${senderName}</b>!\n\nBot ini digunakan untuk notifikasi <b>Dasbor Penerbitan</b>.\n\nUntuk menghubungkan akun Anda, buka halaman <b>Profil</b> di aplikasi Dasbor Penerbitan dan klik <b>Hubungkan Telegram</b>.`
            );
            return res.sendStatus(200);
        }

        res.sendStatus(200);
    },
};
