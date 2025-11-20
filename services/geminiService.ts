
import { ChatMessage, MessageAuthor } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH CLIENT SIDE (PREVIEW / LOCAL) ---
// Đây là Key CŨ (Dùng cho môi trường Preview/Dev)
const CLIENT_SIDE_API_KEY = "AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c"; 
// ----------------------------------------------

/**
 * Gửi tin nhắn đến chatbot.
 * Chiến thuật "Hybrid":
 * 1. Thử gọi Backend (/api/chat).
 * 2. Nếu thất bại hoặc timeout quá 1.5s -> Fallback ngay sang Client SDK.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    console.group("🤖 [GeminiService] Start");

    const systemInstruction = `
        ${context.projectContext}

        DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG:
        - Công việc mẫu: ${JSON.stringify(context.jobs.slice(0, 3))}
        - Bảo hiểm: ${JSON.stringify(context.insuranceInfo)}
        
        HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN.
    `;

    const formattedHistory = history.map(msg => ({
        role: msg.author === MessageAuthor.User ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Hàm helper để ép timeout
    const fetchWithTimeout = (url: string, options: any, duration: number) => {
        return Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), duration)
            )
        ]);
    };

    try {
        // --- CHIẾN THUẬT 1: Gọi Backend Vercel ---
        console.log("👉 [Step 1] Thử gọi Backend (/api/chat)...");
        
        // Ép timeout cứng 1.5 giây
        const response = await fetchWithTimeout('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 1500);
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.text) {
                console.log("✅ [Backend Vercel] Thành công!");
                console.groupEnd();
                return data.text;
            }
        }
        throw new Error("Backend response invalid or 404");

    } catch (backendError) {
        // --- CHIẾN THUẬT 2: Gọi Client SDK (Fallback cho Preview) ---
        console.warn(`⚠️ [Backend Error] ${backendError instanceof Error ? backendError.message : "Failed"}`);
        console.log("👉 [Step 2] Chuyển sang gọi trực tiếp (Client SDK) bằng Key dự phòng...");

        try {
            const ai = new GoogleGenAI({ apiKey: CLIENT_SIDE_API_KEY });
            
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...formattedHistory,
                    { role: 'user', parts: [{ text: message }] }
                ],
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            console.log("✅ [Client SDK] Thành công!");
            console.groupEnd();
            return result.text || "Xin lỗi, tôi không thể trả lời lúc này.";
            
        } catch (clientError: any) {
            console.error("❌ [Critical] Cả 2 cách đều thất bại:", clientError);
            console.groupEnd();
            return "🤖 Hệ thống đang bảo trì hoặc mất kết nối mạng. Vui lòng thử lại sau.";
        }
    }
};
