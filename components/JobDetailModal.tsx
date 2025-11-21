

import React, { useEffect, useState } from 'react';
import type { Job } from '../types';
import { formatPay } from '../utils/formatters';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { useAuth } from '../contexts/AuthContext';
import { applyForJob, checkIfApplied } from '../services/applicationService';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onViewOnMap: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onViewOnMap }) => {
  const { currentUser, currentUserData } = useAuth();
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyError, setApplyError] = useState('');
  
  // Application Form State
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [introduction, setIntroduction] = useState('');

  useEffect(() => {
    if (currentUserData?.phoneNumber) {
        setContactPhone(currentUserData.phoneNumber);
    }
  }, [currentUserData]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Check application status when modal opens
    const checkApplicationStatus = async () => {
        if (currentUser && currentUserData?.userType === 'WORKER') {
            const applied = await checkIfApplied(job.id, currentUser.uid);
            setHasApplied(applied);
        }
    };
    checkApplicationStatus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, job.id, currentUser, currentUserData]);

  const handleStartApply = () => {
      if (!currentUser || !currentUserData) {
        setApplyError("Bạn cần đăng nhập để ứng tuyển.");
        return;
      }
      setShowApplyForm(true);
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserData) return;
    
    if (!contactPhone.trim()) {
        setApplyError("Vui lòng nhập số điện thoại liên hệ.");
        return;
    }

    setIsApplying(true);
    setApplyError('');
    try {
        await applyForJob(job, currentUserData, introduction, contactPhone);
        setHasApplied(true);
        setShowApplyForm(false);
    } catch (error) {
        console.error("Application failed:", error);
        setApplyError("Đã có lỗi xảy ra khi ứng tuyển. Vui lòng thử lại.");
    } finally {
        setIsApplying(false);
    }
  };

  const isEmployerViewingOwnJob = currentUserData?.uid === job.employerId;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden relative animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="p-6 overflow-y-auto flex-grow">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{job.title}</h2>
                    <p className="text-md text-gray-600 mt-1">{job.employerName}</p>
                </div>
                 {job.employerProfileUrl ? (
                    <img src={job.employerProfileUrl} alt={`${job.employerName} logo`} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 ml-4 border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ml-4 border">
                      <BriefcaseIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
            </div>
            
            <div className="mt-6 border-t pt-4 space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold text-gray-700">Địa điểm</h4>
                    <p className="text-gray-600">{job.addressString}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-700">Mức lương</h4>
                    <p className="text-lg font-bold text-green-600">{formatPay(job.payRate, job.payType)}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-700">Loại hình công việc</h4>
                    <span className="text-indigo-600 font-medium bg-indigo-100 px-3 py-1 rounded-full">{job.jobType}</span>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700">Mô tả công việc</h4>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                       {job.description}
                    </p>
                </div>
            </div>

            {/* Application Form Section */}
            {showApplyForm && !hasApplied && (
                <div className="mt-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-fade-in">
                    <h3 className="font-bold text-indigo-800 mb-3 flex items-center">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        Đơn Ứng Tuyển
                    </h3>
                    <form onSubmit={handleConfirmApply} className="space-y-3">
                        <div>
                            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại liên hệ</label>
                            <input 
                                type="tel" 
                                id="contactPhone"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full p-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                                placeholder="Nhập số điện thoại..."
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="introduction" className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn / Giới thiệu ngắn (Tùy chọn)</label>
                            <textarea 
                                id="introduction"
                                value={introduction}
                                onChange={(e) => setIntroduction(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                                placeholder="VD: Tôi có kinh nghiệm làm việc này 2 năm, tôi có xe máy riêng..."
                            ></textarea>
                        </div>
                        {applyError && <p className="text-red-500 text-sm">{applyError}</p>}
                        <div className="flex gap-3 pt-2">
                             <button 
                                type="submit"
                                disabled={isApplying}
                                className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center justify-center"
                            >
                                {isApplying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : null}
                                Gửi hồ sơ
                            </button>
                             <button 
                                type="button"
                                onClick={() => setShowApplyForm(false)}
                                className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
            )}

         </div>

         {!showApplyForm && (
             <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 mt-auto">
                 {currentUserData?.userType === 'WORKER' && !isEmployerViewingOwnJob && (
                    <button 
                        onClick={handleStartApply}
                        disabled={isApplying || hasApplied}
                        className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {hasApplied ? 'Đã ứng tuyển' : 'Ứng tuyển ngay'}
                    </button>
                 )}
                 <button
                    onClick={onViewOnMap}
                    className="w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg hover:bg-indigo-50 border border-indigo-500 transition-colors duration-300"
                  >
                    Xem vị trí trên bản đồ
                  </button>
                 <button 
                    onClick={onClose}
                    className="w-full bg-white text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors duration-300"
                    aria-label="Đóng"
                 >
                    Đóng
                </button>
             </div>
         )}
      </div>
       <style>{`
        @keyframes fade-in-up {
            0% {
                opacity: 0;
                transform: translateY(20px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
    `}</style>
    </div>
  );
};

export default JobDetailModal;