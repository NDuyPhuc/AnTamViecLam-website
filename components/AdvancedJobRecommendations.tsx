
import React, { useState, useMemo } from 'react';
import { Job, UserData } from '../types';
import { analyzeJobMatches, JobRecommendation } from '../services/geminiService';
import { calculateDistance, parseLocationString } from '../utils/formatters';
import Spinner from './Spinner';
import SparklesIcon from './icons/SparklesIcon';
import MapPinIcon from './icons/MapPinIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';

interface AdvancedJobRecommendationsProps {
    userLocation: { lat: number; lng: number } | null;
    allJobs: Job[];
    currentUserData: UserData;
    onViewOnMap: (job: Job) => void;
}

const AdvancedJobRecommendations: React.FC<AdvancedJobRecommendationsProps> = ({
    userLocation,
    allJobs,
    currentUserData,
    onViewOnMap
}) => {
    const [radius, setRadius] = useState(5); // Default 5km
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // Filter jobs locally first based on radius to save AI tokens & speed up
    const nearbyJobs = useMemo(() => {
        if (!userLocation) return [];
        return allJobs.filter(job => {
            const coords = parseLocationString(job.location);
            if (!coords) return false;
            const dist = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
            // Store distance on job object temporarily for AI context
            job.distance = dist; 
            return dist <= radius && job.status === 'OPEN';
        });
    }, [allJobs, userLocation, radius]);

    const handleAnalyze = async () => {
        if (nearbyJobs.length === 0) {
            setRecommendations([]);
            setHasAnalyzed(true);
            return;
        }

        setIsAnalyzing(true);
        try {
            // Limit to top 20 closest jobs to ensure speed if list is huge
            const jobsToAnalyze = nearbyJobs.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 20);
            
            const results = await analyzeJobMatches(currentUserData, jobsToAnalyze);
            setRecommendations(results);
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
            setHasAnalyzed(true);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-red-600 bg-red-100 border-red-200';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-8 h-8 text-yellow-300" />
                        Gợi ý Việc làm Thông minh
                    </h2>
                    <p className="text-indigo-100 max-w-2xl">
                        Sử dụng AI để phân tích hồ sơ của bạn, so sánh khoảng cách, kỹ năng và mức lương để tìm ra công việc phù hợp nhất trong khu vực.
                    </p>
                </div>
                {/* Abstract decorative shapes */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-purple-400 opacity-20 rounded-full"></div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="w-full sm:w-2/3">
                        <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-2">
                            Khoảng cách tìm kiếm: <span className="text-indigo-600 font-bold">{radius} km</span>
                        </label>
                        <div className="relative">
                            <input
                                type="range"
                                id="radius"
                                min="0.5"
                                max="10"
                                step="0.5"
                                value={radius}
                                onChange={(e) => setRadius(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>500m</span>
                                <span>10km</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto flex-shrink-0">
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !userLocation}
                            className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang phân tích...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    Phân tích ngay
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {!userLocation && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        Vui lòng bật định vị để sử dụng tính năng này.
                    </p>
                )}
                {userLocation && !hasAnalyzed && (
                    <p className="text-gray-500 text-sm mt-2">
                        Tìm thấy <span className="font-bold text-gray-800">{nearbyJobs.length}</span> công việc trong bán kính {radius}km. Nhấn "Phân tích ngay" để AI đánh giá.
                    </p>
                )}
            </div>

            {/* Results */}
            {hasAnalyzed && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-800">Kết quả đề xuất ({recommendations.length})</h3>
                    </div>
                    
                    {recommendations.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <BriefcaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-lg font-medium">Không tìm thấy công việc phù hợp cao trong bán kính này.</p>
                            <p className="text-gray-400 text-sm mt-1">Hãy thử mở rộng khoảng cách tìm kiếm hoặc cập nhật hồ sơ kỹ năng của bạn.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendations.map((rec) => {
                                const job = nearbyJobs.find(j => j.id === rec.jobId);
                                if (!job) return null;

                                return (
                                    <div key={rec.jobId} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all flex flex-col h-full relative overflow-hidden">
                                        {/* Header with Score */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-800 line-clamp-1" title={job.title}>{job.title}</h4>
                                                <p className="text-sm text-gray-600 truncate">{job.employerName}</p>
                                            </div>
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 ${getScoreColor(rec.matchScore)} shadow-sm flex-shrink-0 ml-2`}>
                                                <span className="text-sm font-bold">{rec.matchScore}%</span>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex items-center text-xs text-gray-500 mb-4 space-x-3">
                                            <span className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                                <MapPinIcon className="w-3 h-3 mr-1" />
                                                {job.distance?.toFixed(1)} km
                                            </span>
                                            <span className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                                <BriefcaseIcon className="w-3 h-3 mr-1" />
                                                {job.jobType}
                                            </span>
                                        </div>

                                        {/* AI Analysis Content */}
                                        <div className="space-y-4 flex-grow">
                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-1">💡 AI đánh giá</p>
                                                <p className="text-sm text-indigo-900 leading-relaxed">{rec.reason}</p>
                                            </div>
                                            
                                            {rec.environmentAnalysis && (
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold text-gray-700">Môi trường & Rủi ro:</span> {rec.environmentAnalysis}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                                <div>
                                                    <p className="font-semibold text-green-700 text-xs mb-1 flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Ưu điểm
                                                    </p>
                                                    <ul className="text-xs text-gray-600 space-y-0.5">
                                                        {rec.pros.slice(0, 2).map((p, i) => <li key={i} className="truncate">• {p}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-red-700 text-xs mb-1 flex items-center">
                                                        <ShieldExclamationIcon className="w-3 h-3 mr-1" />
                                                        Cân nhắc
                                                    </p>
                                                    <ul className="text-xs text-gray-600 space-y-0.5">
                                                        {rec.cons.slice(0, 2).map((c, i) => <li key={i} className="truncate">• {c}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => onViewOnMap(job)}
                                            className="mt-5 w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <MapPinIcon className="w-4 h-4" />
                                            Xem vị trí
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvancedJobRecommendations;
