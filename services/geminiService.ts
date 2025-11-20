import { GoogleGenAI } from "@google/genai";
import { ChatMessage, MessageAuthor } from "../types";

// Sử dụng API Key trực tiếp để đảm bảo hoạt động ngay lập tức
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
        // Lưu ý: SDK mới hỗ trợ truyền mảng Content cho lịch sử
        const contents = history.map(msg => ({
            role: msg.author === MessageAuthor.User ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Thêm tin nhắn mới nhất của người dùng vào cuối danh sách
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // 3. Gọi model gemini-2.5-flash (Model mới nhất, thay thế cho 1.5)
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
        
        const errMsg = error.message || "";

        if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("resource has been exhausted")) {
            return "⏳ Chatbot đang quá tải (429). Vui lòng đợi khoảng 1 phút và thử lại!";
        }

        if (errMsg.includes("API key")) {
             return "⚠️ Lỗi cấu hình API Key. Vui lòng kiểm tra lại mã khóa.";
        }

        if (errMsg.includes("404") || errMsg.includes("not found")) {
            return "⚠️ Lỗi Model (404). Hệ thống đang cập nhật phiên bản AI mới nhất.";
        }

        return `🤖 Hệ thống đang gặp sự cố: "${errMsg}". Vui lòng thử lại sau.`;
    }
};