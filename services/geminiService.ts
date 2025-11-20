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
        const systemInstruction = `
            ${context.projectContext}

            DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG (dùng để tham khảo trả lời):
            - Một vài công việc đang có: ${JSON.stringify(context.jobs.slice(0, 3))}
            - Thông tin bảo hiểm mẫu: ${JSON.stringify(context.insuranceInfo)}
            
            HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN VÀ ĐI VÀO TRỌNG TÂM.
        `;

        // 2. Chuyển đổi lịch sử chat sang định dạng JSON mà API Backend mong đợi
        const formattedHistory = history.map(msg => ({
            role: msg.author === MessageAuthor.User ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // 3. Gọi API Route (Backend Proxy)
        // URL tương đối '/api/chat' sẽ tự động trỏ về domain hiện tại (Vercel)
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

        // Kiểm tra nếu phản hồi không phải JSON (ví dụ 404 page HTML hoặc 500 text)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response from server:", text);
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!response.ok) {
             // Ném lỗi chi tiết nhận được từ backend (VD: API Key missing, Google Error)
             throw new Error(data.error || `Lỗi server: ${response.status}`);
        }

        return data.text;

    } catch (error: any) {
        console.error('Lỗi khi gọi API Chat:', error);
        
        // Trả về thông báo lỗi thân thiện cho người dùng
        return "🤖 Hệ thống đang gặp sự cố kết nối. Vui lòng thử lại sau ít phút.";
    }
};