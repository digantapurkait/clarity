import axios from 'axios';

/**
 * Sends a 6-digit OTP via SMS using Fast2SMS.
 */
export async function sendSmsOtp(phone: string, code: string): Promise<boolean> {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;

        // Fast2SMS expects number without '+' and without country code for local Indian numbers usually,
        // but it supports international if formatted correctly. For MVP we'll assume Indian 10-digit.
        const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);

        // Fast2SMS OTP Route - using headers for better security/compatibility
        const url = `https://www.fast2sms.com/dev/bulkV2?route=otp&variables_values=${code}&numbers=${sanitizedPhone}`;

        console.log(`[FAST2SMS_DEBUG] Triggering SMS for ${sanitizedPhone}`);

        const response = await axios.get(url, {
            headers: {
                'authorization': apiKey
            }
        });

        if (response.data.return === true) {
            console.log(`[FAST2SMS_SUCCESS] Code sent to ${sanitizedPhone}`);
            return true;
        } else {
            console.error('[FAST2SMS_ERROR]', response.data);
            return false;
        }
    } catch (err: any) {
        if (err.response) {
            console.error('[FAST2SMS_ERROR_RESPONSE]', err.response.data);
        } else {
            console.error('[FAST2SMS_EXCEPTION]', err.message);
        }
        return false;
    }
}
