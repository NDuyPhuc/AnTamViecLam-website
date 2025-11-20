import { GoogleGenAI } from "@google/genai";
import { ChatMessage, MessageAuthor } from "../types";

// Sử dụng API Key trực tiếp.
// Lưu ý: Nếu key này bị giới hạn Android/iOS, nó sẽ không hoạt động trên Web.
const API_KEY = process.env.API_KEY || 'AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c';

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Sends a message to the chatbot using Google GenAI SDK directly.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    try {
        // 1. Xây dựng System Instruction từ context
        const systemInstruction = `
            ${context.projectContext}

            DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG (dùng để tham khảo trả lời):
            - Một vài công việc đang có: ${JSON.stringify(context.jobs.slice(0, 3))}
            - Thông tin bảo hiểm mẫu: ${JSON.stringify(context.insuranceInfo)}
            
            HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN VÀ ĐI VÀO TRỌNG TÂM.
        `;

        // 2. Chuyển đổi lịch sử chat sang định dạng của Gemini
        const contents = history.map(msg => ({
            role: msg.author === MessageAuthor.User ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Thêm tin nhắn mới nhất của người dùng
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // 3. Gọi model gemini-2.5-flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        const text = response.text;

        if (!text) {
            throw new Error("Không nhận được phản hồi từ AI.");
        }

        return text;

    } catch (error: any) {
        console.error('Lỗi khi gọi Gemini:', error);
        
        // Chuyển đổi error object hoặc message thành chuỗi để kiểm tra
        const errMsg = JSON.stringify(error.message || error || "");

        // Xử lý các mã lỗi phổ biến
        if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("exhausted")) {
            return "⏳ Chatbot đang quá tải (Rate Limit). Vui lòng đợi khoảng 1 phút và thử lại!";
        }

        // Lỗi 403: Thường do API Key bị giới hạn sai (ví dụ: chỉ cho Android nhưng dùng trên Web)
        if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("BLOCKED")) {
            return "⚠️ Lỗi cấu hình API Key (403): Key này đang bị giới hạn chỉ cho ứng dụng Android/iOS. Vui lòng vào Google Cloud Console và tạo Key mới (chọn 'No restriction' hoặc 'Browser key').";
        }

        if (errMsg.includes("404") || errMsg.includes("not found")) {
            return "⚠️ Lỗi Model (404): Model 'gemini-2.5-flash' chưa khả dụng với tài khoản này hoặc đang bảo trì.";
        }
        
        if (errMsg.includes("API key")) {
             return "⚠️ Lỗi API Key: Vui lòng kiểm tra lại mã khóa.";
        }

        return `🤖 Hệ thống đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.`;
    }
};