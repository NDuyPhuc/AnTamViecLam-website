
import { ChatMessage, MessageAuthor, Job, UserData } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH API URL ---
// Sử dụng đường dẫn tuyệt đối để Mobile App gọi được Server Vercel
const CHAT_API_URL = "https://an-tam-viec-lam-website.vercel.app/api/chat";
const ANALYZE_API_URL = "https://an-tam-viec-lam-website.vercel.app/api/analyze";

// --- CẤU HÌNH CLIENT SIDE (FALLBACK) ---
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Note: In Vite, process.env.API_KEY might be empty. We check import.meta.env for fallback.
const CLIENT_SIDE_API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || ""; 
// ----------------------------------------------

/**
 * Hàm helper để làm sạch chuỗi JSON từ AI (xóa markdown ```json nếu có)
 */
const cleanJsonString = (jsonStr: string): string => {
    if (!jsonStr) return "";
    return jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
};

/**
 * Gửi tin nhắn đến chatbot.
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    console.group("🤖 [GeminiService] Start Chat");

    const systemInstruction = `
        ${context.projectContext}

        DƯỚI ĐÂY LÀ DỮ LIỆU HIỆN TẠI CỦA NỀN TẢNG:
        - Công việc mẫu: ${JSON.stringify(context.jobs.slice(0, 3))}
        - Bảo hiểm: ${JSON.stringify(context.insuranceInfo)}
        
        HÃY TRẢ LỜI NGẮN GỌN, THÂN THIỆN.
    `;

    // Lọc bỏ tin nhắn chào hỏi ban đầu của Bot
    const historyToSend = history.filter((msg, index) => {
        return true; 
    });

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
        // --- CHIẾN THUẬT 1: Gọi Backend Vercel ---
        console.log(`👉 [Step 1] Thử gọi Server Chat: ${CHAT_API_URL}`);
        
        const response = await fetchWithTimeout(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 15000); 
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.text) {
                console.log("✅ [Backend Vercel] Thành công!");
                console.groupEnd();
                return data.text;
            }
        }
        
        let errorMsg = `Backend Status: ${response.status}`;
        try {
            const errorData = await response.json();
            if(errorData.error) errorMsg += ` - ${errorData.error}`;
        } catch(e) {}
        throw new Error(errorMsg);

    } catch (backendError) {
        // --- CHIẾN THUẬT 2: Fallback Client SDK ---
        console.warn(`⚠️ [Backend Failed] ${backendError instanceof Error ? backendError.message : "Unknown error"}. Chuyển sang Client SDK.`);
        console.log("👉 [Step 2] Gọi trực tiếp từ Client...");

        if (!CLIENT_SIDE_API_KEY) {
            console.error("❌ [Client SDK] Thiếu API_KEY trong biến môi trường.");
            console.groupEnd();
            return "🤖 Hệ thống đang bảo trì kết nối (Missing Configuration). Vui lòng thử lại sau.";
        }

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
            
            if (clientError.message?.includes("403") || clientError.toString().includes("PERMISSION_DENIED")) {
                 return "🤖 Lỗi quyền truy cập API Key. Vui lòng kiểm tra cấu hình Key trên Google Cloud Console (bỏ giới hạn Android App nếu đang chạy Web/Vercel).";
            }
            return "🤖 Tôi đang gặp chút khó khăn khi kết nối. Vui lòng thử lại sau ít phút.";
        }
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

    const prompt = `
        Bạn là chuyên gia tư vấn nghề nghiệp AI. Hãy phân tích mức độ phù hợp của các công việc sau cho người dùng này.
        
        NGƯỜI DÙNG: ${JSON.stringify(userSummary)}
        
        DANH SÁCH CÔNG VIỆC: ${JSON.stringify(simplifiedJobs)}

        YÊU CẦU PHÂN TÍCH:
        Đánh giá từng công việc dựa trên khoảng cách, kỹ năng, mức lương và rủi ro.

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

    // --- CHIẾN THUẬT HYBRID CHO ANALYZE ---
    try {
         // --- CÁCH 1: Gọi Server API (Ưu tiên) ---
         console.log(`👉 [Step 1] Thử gọi Server Analyze: ${ANALYZE_API_URL}`);
         
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
             // Server đã trả về JSON object, không cần parse lại
             return (data as JobRecommendation[]).sort((a, b) => b.matchScore - a.matchScore);
         }
         
         throw new Error(`Analyze Server Failed: ${response.status}`);

    } catch (serverError) {
        // --- CÁCH 2: Fallback Client SDK ---
        console.warn(`⚠️ [Backend Analyze Failed] ${serverError instanceof Error ? serverError.message : "Unknown error"}. Chuyển sang Client SDK.`);
        
        if (!CLIENT_SIDE_API_KEY) {
            console.error("❌ [Client SDK] Thiếu API_KEY. Không thể phân tích.");
            console.groupEnd();
            return [];
        }

        try {
            console.log("👉 [Step 2] Gọi trực tiếp từ Client...");
            const ai = new GoogleGenAI({ apiKey: CLIENT_SIDE_API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json", 
                    temperature: 0.3,
                }
            });

            const jsonText = cleanJsonString(response.text || "");
            if (!jsonText) {
                console.warn("⚠️ Client SDK trả về text rỗng");
                return [];
            }

            const recommendations = JSON.parse(jsonText) as JobRecommendation[];
            console.log("✅ [Client SDK] Thành công!", recommendations.length, "items");
            console.groupEnd();
            return recommendations.sort((a, b) => b.matchScore - a.matchScore);

        } catch (clientError) {
            console.error("❌ Error analyzing jobs (Client SDK):", clientError);
            console.groupEnd();
            return [];
        }
    }
};
