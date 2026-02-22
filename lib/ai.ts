import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * AI Interface for MindMantra
 * Centered on Reflection, Pacing, and Emotional Depth.
 */

export async function chat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
    // Standardizing on models discovered to have active quota
    const models = [
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro-latest",
    ];

    let lastError: any = null;

    for (const modelName of models) {
        try {
            console.log(`[AI] Attempting ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt
            });

            const chatSession = model.startChat({
                history: messages.slice(0, -1).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }],
                })),
            });

            const lastMessage = messages[messages.length - 1]?.content || "";
            const result = await chatSession.sendMessage(lastMessage);
            const text = result.response.text().trim();

            if (!text) throw new Error("Empty response from model");
            return text;
        } catch (e: any) {
            console.warn(`[AI] ${modelName} failed:`, e.message);
            lastError = e;

            // Smart Retry: If 429, wait 1s before trying the next model
            if (e.message?.includes('429')) {
                console.log(`[AI] Rate limit hit. Waiting 1s before fallback...`);
                await new Promise(r => setTimeout(r, 1000));
            }
            continue;
        }
    }

    // OpenAI Fallback
    try {
        console.log(`[AI] Gemini exhausted. Falling back to OpenAI (gpt-4o-mini)...`);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.content
                }))
            ],
            temperature: 0.7,
        });

        const text = response.choices[0]?.message?.content?.trim() || "";
        if (!text) throw new Error("Empty response from OpenAI");
        return text;
    } catch (oe: any) {
        console.error(`[AI] OpenAI fallback failed:`, oe.message);
        throw new Error(`All AI models failed. Gemini error: ${lastError?.message}. OpenAI error: ${oe.message}`);
    }
}

export async function chatStream(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[]
) {
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-flash-latest",
    ];

    let lastError: any = null;

    for (const modelName of models) {
        try {
            console.log(`[AI] Attempting ${modelName} stream...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt
            });

            const chatSession = model.startChat({
                history: messages.slice(0, -1).map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }],
                })),
            });

            const lastMessage = messages[messages.length - 1]?.content || "";
            const result = await chatSession.sendMessageStream(lastMessage);

            return result.stream;
        } catch (e: any) {
            console.warn(`[AI] ${modelName} stream failed:`, e.message);
            lastError = e;

            // Smart Retry: If 429, wait 1s before trying the next model
            if (e.message?.includes('429')) {
                console.log(`[AI] Rate limit hit. Waiting 1s before fallback...`);
                await new Promise(r => setTimeout(r, 1000));
            }
            continue;
        }
    }

    // OpenAI Streaming Fallback
    try {
        console.log(`[AI] Gemini stream exhausted. Falling back to OpenAI (gpt-4o-mini)...`);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.content
                }))
            ],
            stream: true,
        });

        // Adapting OpenAI stream to match Gemini chunk structure expected by route.ts
        const adaptedStream = (async function* () {
            for await (const chunk of response) {
                const text = chunk.choices[0]?.delta?.content || "";
                if (text) {
                    yield { text: () => text };
                }
            }
        })();

        return adaptedStream;
    } catch (oe: any) {
        console.error(`[AI] OpenAI streaming fallback failed:`, oe.message);
        throw new Error(`All streaming models failed. Gemini: ${lastError?.message}. OpenAI: ${oe.message}`);
    }
}

export async function extractJson<T>(prompt: string): Promise<T> {
    const models = ["gemini-flash-latest", "gemini-1.5-flash"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1,
                }
            });

            const text = result.response.text();
            return JSON.parse(text) as T;
        } catch (e: any) {
            console.warn(`[AI JSON] ${modelName} failed:`, e.message);
            continue;
        }
    }

    // OpenAI JSON Fallback
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });
        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text) as T;
    } catch (e) {
        return {} as T;
    }
}
