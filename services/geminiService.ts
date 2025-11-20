import { ChatMessage, MessageAuthor } from "../types";

/**
 * Sends a message to the chatbot via the Vercel Serverless Function (/api/chat).
 * This avoids calling Google GenAI directly from the client, preventing CORS and API Key Restriction errors.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    try {
        // 1. Xây dựng System Instruction từ context (Client side construction)
        // Chúng ta xây dựng chuỗi này ở client vì client đang giữ data context.
        const systemInstruction = `
            ${context.projectContext}

            DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG (dùng để tham khảo trả lời):
            - Một vài công việc đang có: ${JSON.stringify(context.jobs.slice(0, 3))}
            - Thông tin bảo hiểm mẫu: ${JSON.stringify(context.insuranceInfo)}
            
            HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN VÀ ĐI VÀO TRỌNG TÂM.
        `;

        // 2. Chuyển đổi lịch sử chat sang định dạng JSON mà API Backend mong đợi
        // API Gemini dùng role 'user' và 'model'.
        const formattedHistory = history.map(msg => ({
            role: msg.author === MessageAuthor.User ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // 3. Gọi API Route (Backend Proxy)
        // Lưu ý: '/api/chat' sẽ được Vercel xử lý.
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        });

        const data = await response.json();

        if (!response.ok) {
             // Ném lỗi để catch block bên dưới xử lý hiển thị
             throw new Error(data.error || `Server error: ${response.status}`);
        }

        return data.text;

    } catch (error: any) {
        console.error('Lỗi khi gọi API Chat:', error);
        
        // Trả về thông báo lỗi thân thiện cho người dùng thay vì crash app
        return "🤖 Hệ thống đang gặp sự cố kết nối hoặc quá tải. Vui lòng thử lại sau ít phút.";
    }
};