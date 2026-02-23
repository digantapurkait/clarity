import axios from 'axios';

/**
 * Sends a 6-digit OTP via SMS using Textlocal.
 */
export async function sendSmsOtp(phone: string, code: string): Promise<boolean> {
    try {
        const apiKey = process.env.TEXTLOCAL_API_KEY;
        const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL';

        // Textlocal API expects number without '+' often, but we'll sanitize
        const sanitizedPhone = phone.replace('+', '');

        const message = encodeURIComponent(`Your MindMantra code is ${code}. Valid for 5 minutes.`);

        const url = `https://api.textlocal.in/send/?apiKey=${apiKey}&numbers=${sanitizedPhone}&sender=${sender}&message=${message}`;

        const response = await axios.get(url);

        if (response.data.status === 'success') {
            return true;
        } else {
            console.error('[TEXTLOCAL_ERROR]', response.data);
            return false;
        }
    } catch (err: any) {
        console.error('[TEXTLOCAL_EXCEPTION]', err.message);
        return false;
    }
}
