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
            // Handle specific HTTP status codes
            if (response.status === 429) {
                throw new Error(data.error || 'Hệ thống đang bận. Vui lòng thử lại sau 30 giây.');
            }
            
            console.error("Backend API Error:", data);
            if (data.error) {
                throw new Error(data.error);
            }
            throw new Error('Lỗi kết nối với máy chủ AI');
        }

        return data.text;

    } catch (error: any) {
        console.error('Error sending message to bot:', error);
        
        // Return user-friendly error message based on the error content
        if (error.message && error.message.includes("Android")) {
             return "Lỗi cấu hình: API Key đang bị chặn. Vui lòng báo Admin tạo Key mới (Unrestricted).";
        }
        if (error.message && (error.message.includes("Quota") || error.message.includes("429") || error.message.includes("quá tải"))) {
            return "⚠️ Chatbot đang quá tải lượt truy cập miễn phí. Vui lòng đợi 30 giây và thử lại câu hỏi ngắn hơn.";
        }

        return `Hệ thống gặp sự cố: ${error.message || 'Vui lòng thử lại sau.'}`;
    }
};