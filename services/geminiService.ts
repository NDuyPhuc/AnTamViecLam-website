
import { ChatMessage, MessageAuthor, Job, UserData } from "../types";
import i18n from '../i18n';

// --- CẤU HÌNH API URL ---
// SỬA ĐỔI: Dùng đường dẫn tương đối.
// - Khi chạy Local (nếu có cấu hình proxy) hoặc Deploy trên Vercel, nó sẽ tự gọi đúng backend của môi trường đó.
// - Giúp tránh lỗi: Chạy local nhưng lại gọi API của Production (nơi key cũ bị lỗi).
const CHAT_API_URL = "/api/chat";
const ANALYZE_API_URL = "/api/analyze";

/**
 * Gửi tin nhắn đến chatbot.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    console.group("🤖 [GeminiService] Start Chat");

    const currentLang = i18n.language;
    const systemInstruction = `
        ${context.projectContext}

        DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG:
        - Công việc mẫu: ${JSON.stringify(context.jobs.slice(0, 3))}
        - Bảo hiểm: ${JSON.stringify(context.insuranceInfo)}
        
        QUAN TRỌNG: Hãy trả lời bằng ngôn ngữ: "${currentLang}" (nếu là 'vi' thì tiếng Việt, 'en' là tiếng Anh, 'zh' là tiếng Trung).
        HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN.
    `;

    const historyToSend = history.filter((msg, index) => true);

    const formattedHistory = historyToSend.map(msg => ({
        role: msg.author === MessageAuthor.User ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Hàm helper: Timeout request
    const fetchWithTimeout = (url: string, options: any, duration: number) => {
        return Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error(`Request timed out after ${duration}ms`)), duration)
            )
        ]);
    };

    try {
        console.log(`👉 [Step 1] Calling API: ${CHAT_API_URL}`);
        
        const response = await fetchWithTimeout(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 20000); // 20s timeout
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.text) {
                console.log("✅ [Backend Vercel] Thành công!");
                console.groupEnd();
                return data.text;
            }
        }
        
        let errorDetails = `Status: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error) errorDetails = errorData.error;
            console.error("Backend Error Data:", errorData);
        } catch(e) {}

        // Hiển thị lỗi rõ ràng cho người dùng nếu thiếu Key
        if (errorDetails.includes("Missing API Key")) {
            return "⚠️ Lỗi Server: Chưa cấu hình API Key trên Vercel. Vui lòng vào Settings -> Environment Variables để thêm VITE_GEMINI_API_KEY.";
        }
        if (errorDetails.includes("suspended") || errorDetails.includes("API Key not valid")) {
            return "⚠️ Dịch vụ AI đang bảo trì (Lỗi Key/Billing). Vui lòng thử lại sau.";
        }

        throw new Error(errorDetails);

    } catch (backendError: any) {
        console.error("❌ [Backend Failed]", backendError);
        console.groupEnd();
        if (backendError.message?.includes("Missing API Key")) {
             return "⚠️ Lỗi: Server thiếu API Key. Vui lòng kiểm tra cấu hình Vercel.";
        }
        if (backendError.message?.includes("suspended")) {
             return "⚠️ Dịch vụ AI tạm ngưng. Vui lòng liên hệ Admin để kiểm tra tài khoản Billing.";
        }
        return `${i18n.t('chat.error_connection')} (${backendError.message})`;
    }
};

// --- TÍNH NĂNG MỚI: PHÂN TÍCH GỢI Ý VIỆC LÀM ---

export interface JobRecommendation {
    jobId: string;
    matchScore: number; 
    reason: string;
    pros: string[];
    cons: string[];
    environmentAnalysis: string;
}

export const analyzeJobMatches = async (
    userProfile: UserData,
    nearbyJobs: Job[]
): Promise<JobRecommendation[]> => {
    if (!nearbyJobs.length) return [];
    
    console.group("🔮 [GeminiService] Start Analyze Jobs");

    const simplifiedJobs = nearbyJobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description.substring(0, 500), 
        pay: `${j.payRate} ${j.payType}`,
        distance: `${j.distance?.toFixed(1)} km`,
        type: j.jobType,
        employer: j.employerName
    }));

    const userSummary = {
        name: userProfile.fullName,
        bio: userProfile.bio,
        skills: userProfile.skills,
        history: userProfile.workHistory?.map(w => `${w.title} tại ${w.company}`),
    };

    const currentLang = i18n.language;
    const prompt = `
        Bạn là chuyên gia tư vấn nghề nghiệp AI. Hãy phân tích mức độ phù hợp của các công việc sau cho người dùng này.
        
        NGƯỜI DÙNG: ${JSON.stringify(userSummary)}
        
        DANH SÁCH CÔNG VIỆC: ${JSON.stringify(simplifiedJobs)}

        YÊU CẦU PHÂN TÍCH:
        Đánh giá từng công việc dựa trên khoảng cách, kỹ năng, mức lương và rủi ro.
        
        QUAN TRỌNG: Hãy trả lời nội dung phân tích (reason, pros, cons, environmentAnalysis) bằng ngôn ngữ: "${currentLang}" (nếu là 'vi' thì tiếng Việt, 'en' là tiếng Anh, 'zh' là tiếng Trung).

        OUTPUT JSON FORMAT (BẮT BUỘC, KHÔNG MARKDOWN):
        [
            {
                "jobId": "id_của_job",
                "matchScore": 85, 
                "reason": "Lý do phù hợp",
                "pros": ["Điểm mạnh 1"],
                "cons": ["Rủi ro"],
                "environmentAnalysis": "Môi trường"
            }
        ]
    `;

    try {
         console.log(`👉 [Step 1] Calling API: ${ANALYZE_API_URL}`);
         
         const response = await fetch(ANALYZE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
         });

         const contentType = response.headers.get("content-type");
         if (response.ok && contentType && contentType.includes("application/json")) {
             const data = await response.json();
             console.log("✅ [Backend Analyze] Thành công!", data.length, "items");
             console.groupEnd();
             return (data as JobRecommendation[]).sort((a, b) => b.matchScore - a.matchScore);
         }
         
         let errorMsg = `Status ${response.status}`;
         try {
             const errData = await response.json();
             if (errData.error) errorMsg = errData.error;
         } catch(e) {}

         throw new Error(errorMsg);

    } catch (serverError: any) {
        console.error("❌ [Backend Analyze Failed]", serverError);
        console.groupEnd();
        
        let alertMsg = "Không thể phân tích dữ liệu lúc này.";
        
        if (serverError.message?.includes("Missing API Key")) {
            alertMsg = "Lỗi Server: Chưa cấu hình API Key trên Vercel.";
        } else if (serverError.message?.includes("suspended")) {
            alertMsg = "Tài khoản Google Cloud API đã bị tạm ngưng (Billing/Quota). Vui lòng kiểm tra Console.";
        }
        
        alert(alertMsg);
        return [];
    }
};
