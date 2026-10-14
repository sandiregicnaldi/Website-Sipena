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
                from: "onboarding@resend.dev", // You can change this to your domain later if verified on Resend
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
