// Fix: Import 'GoogleGenAI' instead of the deprecated 'GoogleGenerativeAI'.
import { GoogleGenAI, Chat } from "@google/genai";
import { PROJECT_CONTEXT } from "../constants";

// This will hold the promise for the chat instance.
let chatInstancePromise: Promise<Chat> | null = null;
let ai: GoogleGenAI | null = null;

/**
 * Retrieves the API Key from various potential sources.
 * Priority:
 * 1. Vite Environment Variable (import.meta.env.VITE_API_KEY) - Standard for Vite/Vercel
 * 2. Process Environment Variable (process.env.API_KEY) - Fallback / Local / Google AI Studio
 * 3. Serverless Function (/api/config) - Secure runtime injection on Vercel
 */
const getApiKey = async (): Promise<string> => {
    // 1. Try Vite Environment Variable
    try {
        // @ts-ignore: Suppress TS error for import.meta in some environments
        if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
             // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (error) {
        // Ignore errors if import.meta is not defined
    }

    // 2. Try Standard Process Environment Variable
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (error) {
        // Ignore errors if process is not defined
    }

    // 3. Try Fetching from Backend API (Vercel Function)
    // This uses the api/config.js file you already have
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const data = await response.json();
            if (data.apiKey) {
                return data.apiKey;
            }
        }
    } catch (error) {
        console.warn("Could not fetch API key from /api/config endpoint.");
    }

    throw new Error("Không tìm thấy API Key. Vui lòng cấu hình biến môi trường VITE_API_KEY trong Vercel Project Settings.");
};

/**
 * Gets the singleton instance of the GoogleGenAI client.
 * It initializes it if it hasn't been initialized yet.
 */
const getAiClient = async (): Promise<GoogleGenAI> => {
    if (ai) {
        return ai;
    }
    
    const apiKey = await getApiKey();
    ai = new GoogleGenAI({ apiKey });
    return ai;
};

/**
 * Gets the singleton instance of the Chat client.
 */
const getChatClient = async (): Promise<Chat> => {
    if (chatInstancePromise) {
        return chatInstancePromise;
    }
    
    chatInstancePromise = new Promise(async (resolve, reject) => {
        try {
            const aiClient = await getAiClient();
            const chat = aiClient.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: PROJECT_CONTEXT,
                }
            });
            resolve(chat);
        } catch (error) {
            chatInstancePromise = null;
            reject(error);
        }
    });
    
    return chatInstancePromise;
};

/**
 * Sends a message to the chatbot.
 */
export const sendMessageToBot = async (message: string, context: any): Promise<string> => {
    try {
        const chat = await getChatClient();
        
        // Constructing a detailed prompt with context
        const contextPrompt = `
            DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG (dưới dạng JSON, chỉ dùng để tham khảo):
            - Một vài công việc đang có: ${JSON.stringify(context.jobs.slice(0, 3), null, 2)}
            - Thông tin bảo hiểm mẫu: ${JSON.stringify(context.insuranceInfo, null, 2)}
            
            Câu hỏi của người dùng: "${message}"
            
            HÃY TRẢ LỜI CÂU HỎI DỰA TRÊN VAI TRÒ VÀ BỐI CẢNH CỦA BẠN.
        `;

        const response = await chat.sendMessage({ message: contextPrompt });
        // Fix: Use the '.text' accessor to get the response string.
        return response.text;
    } catch (error) {
        console.error('Error sending message to bot:', error);
        // Reset the chat instance if there's an error, in case it's a connection issue
        chatInstancePromise = null;
        // Check if error is an instance of Error to safely access message property
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("403")) {
             throw new Error('API key không hợp lệ hoặc bị thiếu. Vui lòng kiểm tra cấu hình VITE_API_KEY trên Vercel.');
        }
        throw new Error('Không thể nhận phản hồi từ AI. Vui lòng thử lại.');
    }
};