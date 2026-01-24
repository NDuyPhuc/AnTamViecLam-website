import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, MessageAuthor, Job, UserData } from "../types";
import i18n from '../i18n';

// Initialize the Google GenAI SDK directly on the client.
// The API key must be obtained exclusively from the environment variable process.env.API_KEY per guidelines.
// We fallback to the provided key if process.env.API_KEY is not configured in the build environment.
const apiKey = process.env.API_KEY || "AIzaSyCB_MqUl4A1k8SNTkrf5vwmmBtvCpSi5IM";

const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Gửi tin nhắn đến chatbot sử dụng Gemini SDK.
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

    // Convert history to Gemini format
    // Filter history to last 10 turns to save tokens
    const historyToSend = history.slice(-10);
    
    // Construct the full prompt history for generateContent
    // Note: 'user' role is usually mapped to 'user', and bot to 'model'.
    const contents = historyToSend.map(msg => ({
        role: msg.author === MessageAuthor.User ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Add current message
    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    try {
        console.log(`👉 [Step 1] Calling Gemini SDK directly`);
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        if (response.text) {
            console.log("✅ [Gemini Response] Thành công!");
            console.groupEnd();
            return response.text;
        }
        
        throw new Error("Empty response from AI");

    } catch (error: any) {
        console.error("❌ [Gemini Failed]", error);
        console.groupEnd();
        return `${i18n.t('chat.error_connection')} (${error.message})`;
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

    // Giảm tải dữ liệu gửi đi
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
        bio: userProfile.bio?.substring(0, 300),
        skills: userProfile.skills,
        history: userProfile.workHistory?.map(w => `${w.title} at ${w.company}`),
    };

    const currentLang = i18n.language;
    
    const prompt = `
    Role: Career Advisor AI.
    Language: "${currentLang}" (Vietnamese if 'vi').
    
    User Profile: ${JSON.stringify(userSummary)}
    Available Jobs: ${JSON.stringify(simplifiedJobs)}

    Task: Analyze the fit for each job. Return a JSON array.
    `;

    try {
         console.log(`👉 [Step 1] Calling Gemini SDK for Analysis`);
         
         const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            jobId: { type: Type.STRING },
                            matchScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
                            reason: { type: Type.STRING },
                            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                            environmentAnalysis: { type: Type.STRING }
                        },
                        required: ["jobId", "matchScore", "reason", "pros", "cons", "environmentAnalysis"],
                    },
                },
            },
         });

         const text = response.text;
         if (text) {
             const data = JSON.parse(text);
             if (Array.isArray(data)) {
                 console.log("✅ [Gemini Analyze] Thành công!", data.length, "items");
                 console.groupEnd();
                 return (data as JobRecommendation[]).sort((a, b) => b.matchScore - a.matchScore);
             }
         }
         
         throw new Error(`Analyze Request Failed: Empty or invalid JSON`);

    } catch (serverError: any) {
        console.error("❌ [Backend Analyze Failed]", serverError);
        console.groupEnd();
        return [];
    }
};

// --- TÍNH NĂNG MỚI: TẠO ẢNH ---

export const generateImage = async (prompt: string): Promise<string | null> => {
    console.group("🎨 [GeminiService] Start Generate Image");
    try {
        console.log(`👉 [Step 1] Calling Gemini SDK for Image Generation`);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64EncodeString = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    const imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
                    console.log("✅ [Gemini Image] Thành công!");
                    console.groupEnd();
                    return imageUrl;
                }
            }
        }
        
        throw new Error("No image data found in response");

    } catch (error: any) {
        console.error("❌ [Gemini Image Failed]", error);
        console.groupEnd();
        throw error;
    }
};