import { ChatMessage, MessageAuthor } from "../types";

/**
 * Sends a message to the chatbot via the backend API.
 * This keeps the API Key secure on the server side.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    try {
        // 1. Construct the prompt with context
        const contextPrompt = `
            DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG (dưới dạng JSON, chỉ dùng để tham khảo):
            - Một vài công việc đang có: ${JSON.stringify(context.jobs.slice(0, 3), null, 2)}
            - Thông tin bảo hiểm mẫu: ${JSON.stringify(context.insuranceInfo, null, 2)}
            - Bối cảnh dự án: ${context.projectContext}
            
            Câu hỏi của người dùng: "${message}"
            
            HÃY TRẢ LỜI CÂU HỎI DỰA TRÊN VAI TRÒ VÀ BỐI CẢNH CỦA BẠN.
        `;

        // 2. Map client history to Gemini format (role: 'user' | 'model')
        const mappedHistory = history.map(msg => ({
            role: msg.author === MessageAuthor.User ? 'user' : 'model',
            text: msg.text
        }));

        // 3. Call the secure backend endpoint
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: contextPrompt,
                history: mappedHistory
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Backend API Error:", data);
            // Throwing error here so it gets caught by the catch block below
            throw new Error(data.error || `Lỗi kết nối: ${response.status}`);
        }

        return data.text;

    } catch (error: any) {
        console.error('Error sending message to bot:', error);
        
        // Return user-friendly error message based on the error content
        const errMsg = error.message || "";

        if (errMsg.includes("Android") || errMsg.includes("API Key")) {
             return "⚠️ Lỗi cấu hình: API Key chưa hợp lệ hoặc bị chặn. Vui lòng báo Admin kiểm tra.";
        }
        
        if (errMsg.includes("quá tải") || errMsg.includes("429") || errMsg.includes("Quota")) {
            return "⏳ Chatbot đang nhận quá nhiều câu hỏi. Vui lòng đợi khoảng 30 giây và thử lại nhé!";
        }

        return `🤖 Hệ thống đang bảo trì hoặc gặp sự cố: "${errMsg}". Vui lòng thử lại sau.`;
    }
};