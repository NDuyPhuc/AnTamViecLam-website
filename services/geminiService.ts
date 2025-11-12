// Fix: Import 'GoogleGenAI' instead of the deprecated 'GoogleGenerativeAI'.
import { GoogleGenAI, Chat } from "@google/genai";
import { PROJECT_CONTEXT } from "../constants";

// This will hold the promise for the chat instance.
let chatInstancePromise: Promise<Chat> | null = null;
let ai: GoogleGenAI | null = null;

/**
 * Gets the singleton instance of the GoogleGenAI client.
 * It initializes it if it hasn't been initialized yet.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    // Fix: Initialize with the recommended { apiKey: ... } object structure.
    // The API key MUST be obtained exclusively from the environment variable.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
            const aiClient = getAiClient();
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
        if (errorMessage.includes("API key not valid")) {
             throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại.');
        }
        throw new Error('Không thể nhận phản hồi từ AI. Vui lòng thử lại.');
    }
};
