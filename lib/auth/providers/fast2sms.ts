import axios from 'axios';

/**
 * Sends a 6-digit OTP via SMS using Fast2SMS.
 */
export async function sendSmsOtp(phone: string, code: string): Promise<boolean> {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY?.trim();
        if (!apiKey) {
            console.error('[FAST2SMS_ERROR] API Key is missing in environment');
            return false;
        }

        console.log(`[FAST2SMS_DEBUG] Key Length: ${apiKey.length}. Verifying key validity...`);

        // Fast2SMS expects number without '+'
        const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);

        // Try using the 'variables_values' parameter which is common for bulkV2 OTP route
        // We include authorization in both header AND URL for maximum redundancy during this debug phase
        const url = `https://www.fast2sms.com/dev/bulkV2?route=otp&variables_values=${code}&numbers=${sanitizedPhone}&authorization=${apiKey}`;

        console.log(`[FAST2SMS_DEBUG] Triggering SMS for ${sanitizedPhone}`);

        const response = await axios.get(url, {
            headers: {
                'authorization': apiKey,
                'cache-control': 'no-cache',
                'accept': 'application/json'
            }
        });

        if (response.data.return === true) {
            console.log(`[FAST2SMS_SUCCESS] Code sent successfully to ${sanitizedPhone}`);
            return true;
        } else {
            console.error('[FAST2SMS_ERROR_BODY]', response.data);
            return false;
        }
    } catch (err: any) {
        if (err.response) {
            console.error('[FAST2SMS_HTTP_ERROR]', err.response.status, err.response.data);
        } else {
            console.error('[FAST2SMS_EXCEPTION]', err.message);
        }
        return false;
    }
}
