
import { ChatMessage, MessageAuthor, Job, UserData } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH API URL ---
// QUAN TRỌNG: Phải dùng đường dẫn tuyệt đối (https://...) để Mobile App (Capacitor)
// có thể gọi được Server Vercel thay vì gọi vào localhost của điện thoại.
const API_URL = "https://an-tam-viec-lam-website.vercel.app/api/chat";

// --- CẤU HÌNH CLIENT SIDE (FALLBACK) ---
// Key này chỉ dùng khi Server Vercel bị lỗi hoặc quá tải.
// Nên thay bằng import.meta.env.VITE_GEMINI_API_KEY nếu có thể.
const CLIENT_SIDE_API_KEY = "AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c"; 
// ----------------------------------------------

/**
 * Gửi tin nhắn đến chatbot.
 * Chiến thuật "Hybrid":
 * 1. Thử gọi Backend Vercel (API_URL) với Key Server (An toàn, mạnh mẽ).
 * 2. Nếu thất bại -> Fallback sang Client SDK (Dùng key client, tiện lợi nhưng lộ key).
 */
export const sendMessageToBot = async (
    message: string, 
    history: ChatMessage[], 
    context: any
): Promise<string> => {
    console.group("🤖 [GeminiService] Start");

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
        console.log(`👉 [Step 1] Thử gọi Server: ${API_URL}`);
        
        const response = await fetchWithTimeout(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 8000); // Tăng timeout lên 8s cho mạng di động
        
        // Kiểm tra response JSON
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.text) {
                console.log("✅ [Backend Vercel] Thành công!");
                console.groupEnd();
                return data.text;
            }
        }
        
        throw new Error(`Backend Error: ${response.status} ${response.statusText}`);

    } catch (backendError) {
        // --- CHIẾN THUẬT 2: Fallback Client SDK ---
        console.warn(`⚠️ [Backend Failed] ${backendError instanceof Error ? backendError.message : "Unknown error"}. Chuyển sang Client SDK.`);
        console.log("👉 [Step 2] Gọi trực tiếp từ Client...");

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
                 return "🤖 Lỗi quyền truy cập (API Key bị chặn). Vui lòng kiểm tra cấu hình Key.";
            }
            return "🤖 Hệ thống đang bảo trì hoặc mất kết nối mạng. Vui lòng thử lại sau ít phút.";
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

        OUTPUT JSON FORMAT (BẮT BUỘC):
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
        const ai = new GoogleGenAI({ apiKey: CLIENT_SIDE_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json", 
                temperature: 0.3,
            }
        });

        const jsonText = response.text;
        if (!jsonText) return [];

        const recommendations = JSON.parse(jsonText) as JobRecommendation[];
        return recommendations.sort((a, b) => b.matchScore - a.matchScore);

    } catch (error) {
        console.error("Error analyzing jobs:", error);
        return [];
    }
};
