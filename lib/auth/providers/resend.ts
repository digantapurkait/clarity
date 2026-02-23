import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a 6-digit OTP via Email using Resend.
 */
export async function sendEmailOtp(email: string, code: string): Promise<boolean> {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.error('[RESEND_ERROR] RESEND_API_KEY is missing');
            return false;
        }

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: [email],
            subject: 'Your MindMantra Access Code',
            html: `
                <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #6d28d9; text-align: center;">MindMantra</h2>
                    <p style="font-size: 14px; color: #666;">Enter the following code to access your session. This code expires in 5 minutes.</p>
                    <div style="background: #f4f4f5; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #18181b;">${code}</span>
                    </div>
                    <p style="font-size: 10px; color: #999; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_ERROR] Failed to send email:', JSON.stringify(error, null, 2));
            return false;
        }

        console.log(`[RESEND_SUCCESS] Code sent to ${email}`);
        return true;
    } catch (err: any) {
        console.error('[RESEND_EXCEPTION]', err.message);
        return false;
    }
}
