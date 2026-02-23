/**
 * Web Research Utility for MindMantra
 * Fetches and cleans HTML content from a URL for AI processing.
 */

export async function browseUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        // Basic cleaning
        // 1. Remove script, style, and head tags
        let text = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
            .replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gim, '')
            .replace(/<[^>]+>/g, ' ') // 2. Strip all other HTML tags
            .replace(/\s+/g, ' ')     // 3. Normalize whitespace
            .trim();

        // Truncate to avoid context window issues (approx 6k chars / ~1.5k tokens)
        if (text.length > 6000) {
            text = text.substring(0, 6000) + '... [Content Truncated]';
        }

        return text || 'No readable text content found on this page.';
    } catch (error: any) {
        console.error(`[BROWSER_TOOL_ERROR] ${url}:`, error.message);
        return `Error browsing ${url}: ${error.message}`;
    }
}
