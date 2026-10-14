
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL  = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── HTTP helper (pakai https native — kompatibel semua versi Node.js) ────────

function telegramPost(method: string, body: object): Promise<any> {
    return new Promise((resolve) => {
        if (!BOT_TOKEN) return resolve({ ok: false, description: 'No token' });
        const payload = JSON.stringify(body);
        const req = https.request(
            `${BASE_URL}/${method}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
            (res) => {
                let raw = '';
                res.on('data', (c: string) => raw += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(raw)); } catch { resolve({ ok: false }); }
                });
            }
        );
        req.on('error', () => resolve({ ok: false }));
        req.write(payload);
        req.end();
    });
}

function telegramGet(method: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve) => {
        if (!BOT_TOKEN) return resolve({ ok: false, description: 'No token' });
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
        ).toString();
        const url = `${BASE_URL}/${method}${qs ? '?' + qs : ''}`;
        https.get(url, (res) => {
            let raw = '';
            res.on('data', (c: string) => raw += c);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); } catch { resolve({ ok: false }); }
            });
        }).on('error', () => resolve({ ok: false }));
    });
}

// ─── Kirim pesan ─────────────────────────────────────────────────────────────

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
    if (!BOT_TOKEN) {
        console.warn('[Telegram] BOT_TOKEN tidak di-set, skip notifikasi.');
        return;
    }
    try {
        const data = await telegramPost('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
        if (!data.ok) console.error('[Telegram] sendMessage gagal:', data.description);
    } catch (err) {
        console.error('[Telegram] sendMessage error:', err);
    }
}

export async function notifyUser(userId: string, text: string): Promise<void> {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { telegramChatId: true },
        });
        if (!user?.telegramChatId) return;
        await sendTelegramMessage(user.telegramChatId, text);
    } catch (err) {
        console.error('[Telegram] notifyUser error:', err);
    }
}

export async function notifyAllAdmins(text: string): Promise<void> {
    try {
        const admins = await db.query.users.findMany({
            where: eq(users.role, 'admin'),
            columns: { telegramChatId: true },
        });
        for (const admin of admins) {
            if (admin.telegramChatId) await sendTelegramMessage(admin.telegramChatId, text);
        }
    } catch (err) {
        console.error('[Telegram] notifyAllAdmins error:', err);
    }
}

// ─── Polling ─────────────────────────────────────────────────────────────────

let pollingOffset = 0;
let pollingActive = false;

async function handleUpdate(update: any): Promise<void> {
    const message = update?.message;
    if (!message?.text) return;

    const chatId = String(message.chat.id);
    const text   = (message.text as string).trim();
    const sender = message.from?.first_name || 'Pengguna';

    if (text.startsWith('/start ')) {
        const token = text.replace('/start ', '').trim().toUpperCase();
        const user  = await db.query.users.findFirst({
            where: eq(users.telegramLinkToken, token),
            columns: { id: true, name: true },
        });
        if (!user) {
            await sendTelegramMessage(chatId,
                `❌ Kode <b>${token}</b> tidak valid atau sudah kadaluarsa.\n\nSilakan buat kode baru dari halaman profil Dasbor Penerbitan.`
            );
            return;
        }
        await db.update(users)
            .set({ telegramChatId: chatId, telegramLinkToken: null })
            .where(eq(users.id, user.id));
        await sendTelegramMessage(chatId,
            `✅ Berhasil!\n\nHalo <b>${user.name}</b>, akun Telegram Anda sudah terhubung ke <b>Dasbor Penerbitan</b>.\n\nAnda akan menerima notifikasi di sini ketika ada penugasan atau update proyek. 🎉`
        );
        return;
    }

    if (text === '/start') {
        await sendTelegramMessage(chatId,
            `👋 Halo <b>${sender}</b>!\n\nBot ini digunakan untuk notifikasi <b>Dasbor Penerbitan</b>.\n\nUntuk menghubungkan akun Anda, buka halaman <b>Pengaturan → Telegram</b> di aplikasi dan klik <b>Hubungkan Telegram</b>.`
        );
    }
}

async function pollOnce(): Promise<void> {
    const data = await telegramGet('getUpdates', {
        offset: pollingOffset,
        timeout: 25,
        allowed_updates: 'message',
    });
    if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
            pollingOffset = update.update_id + 1;
            handleUpdate(update).catch(e =>
                console.error('[Telegram] handleUpdate error:', e)
            );
        }
    }
}

export async function startPolling(): Promise<void> {
    if (!BOT_TOKEN) {
        console.warn('[Telegram] BOT_TOKEN tidak di-set, polling tidak dijalankan.');
        return;
    }
    if (pollingActive) return;
    pollingActive = true;

    // Hapus webhook jika ada (ignore error)
    try { await telegramPost('deleteWebhook', {}); } catch { /* ignore */ }
    console.log('[Telegram] Polling dimulai...');

    const loop = async () => {
        if (!pollingActive) return;
        try {
            await pollOnce();
        } catch (err: any) {
            console.error('[Telegram] Polling error:', err?.message || err);
            // Back-off 5 detik jika ada error
            await new Promise(r => setTimeout(r, 5000));
        }
        // Lanjutkan loop
        setTimeout(loop, 100);
    };

    loop();
}

export function stopPolling(): void {
    pollingActive = false;
}

// Alias untuk kompatibilitas
export async function registerWebhook(_serverUrl: string): Promise<void> {
    await startPolling();
}
