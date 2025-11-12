import { GoogleGenAI, Chat } from "@google/genai";
import { Job } from '../types';
import { formatPay } from '../utils/formatters';

// The API key must be obtained exclusively from the environment variable `process.env.API_KEY`.
// This is automatically handled by the deployment environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chat: Chat | null = null;

const getChat = (): Chat => {
    if(!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'Bạn là một trợ lý ảo am hiểu về luật lao động, bảo hiểm xã hội và các cơ hội việc làm tự do tại Việt Nam. Hãy trả lời các câu hỏi của người dùng một cách thân thiện, rõ ràng và hữu ích. Cung cấp thông tin chính xác và hướng dẫn họ các thủ tục cần thiết nếu được hỏi. Hãy luôn trả lời bằng tiếng Việt.',
            },
        });
    }
    return chat;
}

interface AppContext {
    jobs: Job[];
    insuranceInfo: any;
    projectContext: string;
}

const formatAppContext = (context: AppContext): string => {
    const { jobs, insuranceInfo, projectContext } = context;

    // Format job listings
    const openJobs = jobs.filter(job => job.status === 'OPEN');
    const jobsContext = openJobs.length > 0
        ? openJobs.map(job => 
            `- ${job.title} tại ${job.addressString} (Trạng thái: Đang tuyển, Lương: ${formatPay(job.payRate, job.payType)})`
          ).join('\n')
        : "Hiện tại không có công việc nào đang mở.";

    // Format insurance info (simple example)
    const insuranceContext = `
- Tên chương trình: Tích Lũy Tự Động cho BHXH.
- Mô tả: Tự động trích 2% thu nhập từ công việc để đóng vào quỹ BHXH.
- Số tiền đã tích lũy tháng này: ${new Intl.NumberFormat('vi-VN').format(insuranceInfo.autoDeductAccumulatedThisMonth)} VNĐ.
    `.trim();

    return `
### BỐI CẢNH TỪ ỨNG DỤNG "AN TÂM VIỆC LÀM" ###

**1. GIỚI THIỆU DỰ ÁN:**
${projectContext}

**2. THÔNG TIN BẢO HIỂM:**
${insuranceContext}

**3. DANH SÁCH CÁC CÔNG VIỆC ĐANG MỞ:**
${jobsContext}

----------------------------------------------------
DỰA VÀO BỐI CẢNH TRÊN, HÃY TRẢ LỜI CÂU HỎI SAU CỦA NGƯỜI DÙNG:
    `.trim();
}


export const sendMessageToBot = async (message: string, context: AppContext): Promise<string> => {
    try {
        const chatInstance = getChat();
        
        // Construct the full prompt with context
        const formattedContext = formatAppContext(context);
        const fullPrompt = `${formattedContext}\n\n"${message}"`;

        const response = await chatInstance.sendMessage({ message: fullPrompt });
        return response.text;
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
        throw error;
    }
};