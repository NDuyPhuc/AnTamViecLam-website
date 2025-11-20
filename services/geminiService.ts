
import { ChatMessage, MessageAuthor, Job, UserData } from "../types";
import { GoogleGenAI } from "@google/genai";

// --- CẤU HÌNH CLIENT SIDE (PREVIEW / LOCAL) ---
// Sử dụng Key do người dùng cung cấp (Key cũ, hy vọng hỗ trợ Web)
const CLIENT_SIDE_API_KEY = "AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c"; 
// ----------------------------------------------

/**
 * Gửi tin nhắn đến chatbot.
 * Chiến thuật "Hybrid":
 * 1. Thử gọi Backend (/api/chat) với Key Server.
 * 2. Nếu thất bại hoặc timeout (do đang ở Preview) -> Fallback sang Client SDK.
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

    // Lọc bỏ tin nhắn chào hỏi ban đầu của Bot nếu nó là tin nhắn đầu tiên
    // để đảm bảo history gửi đi bắt đầu bằng User (nếu có thể) hoặc tuân thủ flow hội thoại
    const historyToSend = history.filter((msg, index) => {
        // Giữ lại tất cả, trừ khi là tin nhắn đầu tiên VÀ là của Bot (lời chào mặc định)
        // Tuy nhiên, Gemini khá linh hoạt, nên ta cứ gửi format chuẩn.
        return true; 
    });

    const formattedHistory = historyToSend.map(msg => ({
        role: msg.author === MessageAuthor.User ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Hàm helper: Chạy fetch nhưng sẽ throw lỗi nếu quá thời gian timeout
    const fetchWithTimeout = (url: string, options: any, duration: number) => {
        return Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error(`Request timed out after ${duration}ms`)), duration)
            )
        ]);
    };

    try {
        // --- CHIẾN THUẬT 1: Gọi Backend Vercel (Ưu tiên) ---
        console.log("👉 [Step 1] Thử gọi Backend (/api/chat)...");
        
        // Timeout 5s: Thời gian chờ tối đa theo yêu cầu
        const response = await fetchWithTimeout('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: formattedHistory,
                systemInstruction: systemInstruction
            })
        }, 5000);
        
        // Kiểm tra nếu response trả về JSON hợp lệ
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.text) {
                console.log("✅ [Backend Vercel] Thành công!");
                console.groupEnd();
                return data.text;
            }
        }
        
        throw new Error("Backend response invalid or 404");

    } catch (backendError) {
        // --- CHIẾN THUẬT 2: Gọi Client SDK (Fallback cho Preview hoặc khi Server lỗi) ---
        console.warn(`⚠️ [Backend Error] ${backendError instanceof Error ? backendError.message : "Failed"}. Chuyển sang phương án dự phòng.`);
        console.log("👉 [Step 2] Gọi trực tiếp (Client SDK)...");

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
            
            // Check lỗi quota hoặc permission
            if (clientError.message?.includes("403") || clientError.toString().includes("PERMISSION_DENIED")) {
                 return "🤖 Lỗi quyền truy cập (API Key bị chặn). Vui lòng kiểm tra cấu hình Key trên Google Cloud Console (bỏ giới hạn Android App nếu đang chạy Web).";
            }
            return "🤖 Hệ thống đang bảo trì hoặc mất kết nối mạng. Vui lòng thử lại sau ít phút.";
        }
    }
};

// --- TÍNH NĂNG MỚI: PHÂN TÍCH GỢI Ý VIỆC LÀM ---

export interface JobRecommendation {
    jobId: string;
    matchScore: number; // 0-100
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

    // Chuẩn bị dữ liệu tinh gọn để gửi AI (tiết kiệm token & tăng tốc độ)
    const simplifiedJobs = nearbyJobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description.substring(0, 500), // Giới hạn độ dài để xử lý nhanh hơn
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
        
        DANH SÁCH CÔNG VIỆC (Đã lọc theo bán kính): ${JSON.stringify(simplifiedJobs)}

        YÊU CẦU PHÂN TÍCH:
        Đánh giá từng công việc dựa trên:
        1. Khoảng cách (càng gần càng tốt).
        2. Kỹ năng & Kinh nghiệm phù hợp.
        3. Mức lương & Loại hình (Thời vụ/Bán thời gian...).
        4. Phân tích Rủi ro & Môi trường (dựa trên mô tả và tên công việc).
        5. Độ tuổi/Giới tính (suy luận logic từ mô tả nếu có yêu cầu ngầm, ví dụ bốc vác nặng cần sức khỏe tốt).

        OUTPUT JSON FORMAT (BẮT BUỘC):
        Trả về mảng JSON thuần túy, không markdown:
        [
            {
                "jobId": "id_của_job",
                "matchScore": 85, // Số nguyên 0-100
                "reason": "Lý do chính tại sao phù hợp (ngắn gọn)",
                "pros": ["Điểm mạnh 1", "Điểm mạnh 2"],
                "cons": ["Rủi ro hoặc điểm yếu"],
                "environmentAnalysis": "Nhận xét về môi trường/tính chất (vd: Ngoài trời, ồn ào, văn phòng...)"
            }
        ]
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: CLIENT_SIDE_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json", // Ép kiểu JSON để xử lý siêu nhanh
                temperature: 0.3, // Giảm sáng tạo để tăng độ chính xác phân tích
            }
        });

        const jsonText = response.text;
        if (!jsonText) return [];

        const recommendations = JSON.parse(jsonText) as JobRecommendation[];
        
        // Sắp xếp theo điểm số cao nhất
        return recommendations.sort((a, b) => b.matchScore - a.matchScore);

    } catch (error) {
        console.error("Error analyzing jobs:", error);
        return [];
    }
};
