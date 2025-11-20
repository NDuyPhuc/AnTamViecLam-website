
import { ChatMessage, MessageAuthor } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH CLIENT SIDE (PREVIEW / LOCAL) ---
// Dùng Key Mới (Hy vọng key này không bị giới hạn Android/IP chặt chẽ như key cũ)
// Nếu key này cũng lỗi, bạn cần vào Google AI Studio tạo một key mới hoàn toàn "Get API Key".
const CLIENT_SIDE_API_KEY = "AIzaSyBxIX5Od28Go9qkG6SdLrZhcLPpLe3bR0E"; 
// ----------------------------------------------

/**
 * Gửi tin nhắn đến chatbot.
 * Chiến thuật "Hybrid":
 * 1. Thử gọi Backend (/api/chat) với Key Mới.
 * 2. Nếu thất bại hoặc timeout (do đang ở Preview) -> Fallback sang Client SDK.
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

    // Hàm helper: Chạy fetch nhưng sẽ throw lỗi nếu quá thời gian timeout
    const fetchWithTimeout = (url: string, options: any, duration: number) => {
        return Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error(`Request timed out after ${duration}ms`)), duration)
            )
        ]);
    };

    try {
        // --- CHIẾN THUẬT 1: Gọi Backend Vercel (Ưu tiên) ---
        console.log("👉 [Step 1] Thử gọi Backend (/api/chat)...");
        
        // Timeout 4.5s: Tăng lên để Vercel Serverless Function có thời gian khởi động (Cold start)
        const response = await fetchWithTimeout('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 4500);
        
        // Kiểm tra nếu response trả về JSON hợp lệ
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
        // --- CHIẾN THUẬT 2: Gọi Client SDK (Fallback cho Preview hoặc khi Server lỗi) ---
        console.warn(`⚠️ [Backend Error] ${backendError instanceof Error ? backendError.message : "Failed"}. Chuyển sang phương án dự phòng.`);
        console.log("👉 [Step 2] Gọi trực tiếp (Client SDK)...");

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
            
            // Check lỗi quota hoặc permission
            if (clientError.message?.includes("403") || clientError.toString().includes("PERMISSION_DENIED")) {
                 return "🤖 Lỗi quyền truy cập (API Key bị chặn). Vui lòng kiểm tra lại cấu hình Key.";
            }
            return "🤖 Hệ thống đang bảo trì hoặc mất kết nối mạng. Vui lòng thử lại sau.";
        }
    }
};
