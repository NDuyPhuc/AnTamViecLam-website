
import React, { useState, useMemo, useEffect } from 'react';
import { Job, UserData } from '../types';
import { analyzeJobMatches, JobRecommendation } from '../services/geminiService';
import { calculateDistance, parseLocationString } from '../utils/formatters';
import { db } from '../services/firebase'; 
import SparklesIcon from './icons/SparklesIcon';
import MapPinIcon from './icons/MapPinIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import XIcon from './icons/XIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface AdvancedJobRecommendationsProps {
    userLocation: { lat: number; lng: number } | null;
    allJobs: Job[];
    currentUserData: UserData;
    onViewOnMap: (job: Job) => void;
    onJobSelect: (job: Job) => void;
}

const AdvancedJobRecommendations: React.FC<AdvancedJobRecommendationsProps> = ({
    userLocation,
    allJobs,
    currentUserData,
    onViewOnMap,
    onJobSelect
}) => {
    const [radius, setRadius] = useState(5); // Default 5km
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    
    // State for AI Detail Modal
    const [selectedAiJob, setSelectedAiJob] = useState<{ rec: JobRecommendation, job: Job } | null>(null);

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const userDoc = await db.collection('users').doc(currentUserData.uid).get();
                const data = userDoc.data();
                if (data && data.lastRecommendations) {
                    const history = data.lastRecommendations;
                    if (history.results && Array.isArray(history.results) && history.results.length > 0) {
                        setRecommendations(history.results);
                        setRadius(history.radius || 5);
                        setHasAnalyzed(true);
                    }
                }
            } catch (error) {
                console.error("Failed to load recommendation history", error);
            }
        };
        loadHistory();
    }, [currentUserData.uid]);

    // Filter jobs locally first based on radius
    const nearbyJobs = useMemo(() => {
        if (!userLocation) return [];
        return allJobs.filter(job => {
            const coords = parseLocationString(job.location);
            if (!coords) return false;
            const dist = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
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
            const jobsToAnalyze = nearbyJobs.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 20);
            
            const results = await analyzeJobMatches(currentUserData, jobsToAnalyze);
            setRecommendations(results);
            setHasAnalyzed(true);

            await db.collection('users').doc(currentUserData.uid).update({
                lastRecommendations: {
                    timestamp: new Date().toISOString(),
                    radius: radius,
                    results: results
                }
            });

        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const openAiModal = (rec: JobRecommendation) => {
        const job = nearbyJobs.find(j => j.id === rec.jobId);
        if (job) {
            setSelectedAiJob({ rec, job });
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
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-800 line-clamp-1" title={job.title}>{job.title}</h4>
                                                <p className="text-sm text-gray-600 truncate">{job.employerName}</p>
                                            </div>
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 ${getScoreColor(rec.matchScore)} shadow-sm flex-shrink-0 ml-2`}>
                                                <span className="text-sm font-bold">{rec.matchScore}%</span>
                                            </div>
                                        </div>

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

                                        <div className="space-y-4 flex-grow">
                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                    <SparklesIcon className="w-3 h-3" />
                                                    AI đánh giá
                                                </p>
                                                <p className="text-sm text-indigo-900 leading-relaxed line-clamp-3">{rec.reason}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                                <div>
                                                    <p className="font-semibold text-green-700 text-xs mb-1">Ưu điểm chính</p>
                                                    <ul className="text-xs text-gray-600 space-y-0.5">
                                                        {rec.pros.slice(0, 2).map((p, i) => <li key={i} className="truncate">• {p}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                     <p className="font-semibold text-red-700 text-xs mb-1">Lưu ý</p>
                                                    <ul className="text-xs text-gray-600 space-y-0.5">
                                                        {rec.cons.slice(0, 1).map((c, i) => <li key={i} className="truncate">• {c}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => openAiModal(rec)}
                                                className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                                Chi tiết AI
                                            </button>
                                            <button
                                                onClick={() => onViewOnMap(job)}
                                                className="w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <MapPinIcon className="w-4 h-4" />
                                                Xem vị trí
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {selectedAiJob && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
                    onClick={() => setSelectedAiJob(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-fade-in-up max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <SparklesIcon className="w-6 h-6 text-yellow-300" />
                                    <span className="font-bold text-indigo-100 uppercase tracking-wider text-xs">Phân tích chuyên sâu</span>
                                </div>
                                <h2 className="text-2xl font-bold">{selectedAiJob.job.title}</h2>
                                <p className="text-indigo-100 text-sm mt-1">{selectedAiJob.job.employerName}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedAiJob(null)}
                                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                             <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className={`w-16 h-16 rounded-full border-4 ${getScoreColor(selectedAiJob.rec.matchScore)} flex items-center justify-center bg-white text-xl font-bold shadow-sm`}>
                                    {selectedAiJob.rec.matchScore}%
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">Mức độ phù hợp</h3>
                                    <p className="text-sm text-gray-600">Dựa trên hồ sơ kỹ năng, vị trí và mong muốn của bạn.</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="flex items-center font-bold text-gray-800 mb-2">
                                    <LightBulbIcon className="w-5 h-5 text-indigo-500 mr-2" />
                                    Tại sao công việc này phù hợp?
                                </h4>
                                <p className="text-gray-700 leading-relaxed bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm">
                                    {selectedAiJob.rec.reason}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="flex items-center font-bold text-gray-800 mb-3">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                                        Ưu điểm
                                    </h4>
                                    <ul className="space-y-2">
                                        {selectedAiJob.rec.pros.map((p, i) => (
                                            <li key={i} className="flex items-start text-sm text-gray-700">
                                                <span className="mr-2 text-green-500">•</span>
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="flex items-center font-bold text-gray-800 mb-3">
                                        <ShieldExclamationIcon className="w-5 h-5 text-red-500 mr-2" />
                                        Cần cân nhắc
                                    </h4>
                                    <ul className="space-y-2">
                                        {selectedAiJob.rec.cons.map((c, i) => (
                                            <li key={i} className="flex items-start text-sm text-gray-700">
                                                <span className="mr-2 text-red-500">•</span>
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {selectedAiJob.rec.environmentAnalysis && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2">Phân tích môi trường & Rủi ro</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700">
                                        {selectedAiJob.rec.environmentAnalysis}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => {
                                    onJobSelect(selectedAiJob.job);
                                }}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2"
                            >
                                <InformationCircleIcon className="w-5 h-5" />
                                Xem tin tuyển dụng & Ứng tuyển
                            </button>
                            <button 
                                onClick={() => {
                                    onViewOnMap(selectedAiJob.job);
                                    setSelectedAiJob(null);
                                }}
                                className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <MapPinIcon className="w-5 h-5" />
                                Xem vị trí trên bản đồ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedJobRecommendations;
