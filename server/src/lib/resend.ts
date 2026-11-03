export async function sendPasswordResetEmail(email: string, resetUrl: string) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.warn("⚠️  RESEND_API_KEY is not set. Skipped sending reset email. Link:", resetUrl);
        return;
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: email,
                subject: "Reset Password - Sistem Manajemen Penerbitan",
                html: `
                    <h2>Permintaan Reset Password</h2>
                    <p>Seseorang telah meminta tautan reset password untuk akun Anda.</p>
                    <p>Klik tombol di bawah ini untuk mereset password Anda:</p>
                    <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#3525cd;color:#ffffff;text-decoration:none;border-radius:5px;font-weight:bold;">Mereset Password</a>
                    <p style="margin-top:20px;font-size:12px;color:#888;">Jika Anda tidak membuat permintaan ini, ketahui bahwa akun Anda aman dan Anda bisa mengabaikan email ini.</p>
                `
            })
        });

        if (!res.ok) {
            console.error("Resend API error:", await res.text());
        } else {
            console.log("Send password reset email success to", email);
        }
    } catch (e) {
        console.error("Failed to send reset email via Resend:", e);
    }
}

export async function sendVerificationEmail(email: string, verifyUrl: string, name?: string) {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    // Fallback simulation print for development
    console.log("\n================================================================================");
    console.log("📧 [EMAIL VERIFICATION LINK - DOUBLE OPT-IN]");
    console.log(`Kepada: ${name || 'Pengguna'} <${email}>`);
    console.log(`Tautan Verifikasi: ${verifyUrl}`);
    console.log("================================================================================\n");

    if (!resendApiKey) {
        return;
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: email,
                subject: "Verifikasi Alamat Email Anda - SiPena Perpusnas Press",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1e3a8a; margin-bottom: 8px;">Selamat Datang di SiPena!</h2>
                        <p style="color: #475569; font-size: 15px;">Halo <strong>${name || email}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; line-height: 1.5;">
                            Terima kasih telah mendaftar di SiPena (Sistem Penerbitan Nasional Perpusnas Press). Demi keamanan akun Anda, silakan verifikasi alamat email ini sebelum masuk ke sistem.
                        </p>
                        <div style="margin: 28px 0; text-align: center;">
                            <a href="${verifyUrl}" style="display:inline-block; padding: 12px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                                Verifikasi Email Saya
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
                            Atau salin dan tempelkan tautan berikut pada browser Anda:<br>
                            <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                            Jika Anda tidak merasa mendaftar di SiPena, silakan abaikan email ini. Tautan verifikasi ini aman dan akan kedaluwarsa secara otomatis.
                        </p>
                    </div>
                `
            })
        });

        if (!res.ok) {
            console.error("Resend API error sending verification email:", await res.text());
        } else {
            console.log("Send verification email success to", email);
        }
    } catch (e) {
        console.error("Failed to send verification email via Resend:", e);
    }
}
