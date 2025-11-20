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
        // Note: Vercel will automatically route /api/chat to the serverless function
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
            // Log detailed error for developer debugging
            console.error("Backend API Error:", data);
            
            if (response.status === 403 && data.error && data.error.includes("Android")) {
                throw new Error("Lỗi cấu hình Server: API Key bị giới hạn Android. Vui lòng báo admin đổi Key.");
            }
            
            throw new Error(data.error || 'Lỗi kết nối với máy chủ AI');
        }

        return data.text;

    } catch (error: any) {
        console.error('Error sending message to bot:', error);
        // Return user-friendly error message
        if (error.message && error.message.includes("Android")) {
             return "Hệ thống đang bảo trì tính năng chat (Lỗi API Key). Vui lòng quay lại sau.";
        }
        throw new Error('Không thể nhận phản hồi từ AI. Vui lòng thử lại sau.');
    }
};