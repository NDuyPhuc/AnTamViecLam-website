import React, { useEffect, useState } from 'react';
import type { Job } from '../types';
import { formatPay } from '../utils/formatters';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { useAuth } from '../contexts/AuthContext';
import { applyForJob, checkIfApplied } from '../services/applicationService';

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

  const handleApply = async () => {
    if (!currentUser || !currentUserData) {
        setApplyError("Bạn cần đăng nhập để ứng tuyển.");
        return;
    }
    setIsApplying(true);
    setApplyError('');
    try {
        await applyForJob(job, currentUserData);
        setHasApplied(true);
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
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="p-6">
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
                 <div>
                    <h4 className="font-semibold text-gray-700">Thông tin liên hệ</h4>
                    <p className="text-gray-600">
                        Để ứng tuyển, vui lòng liên hệ nhà tuyển dụng qua thông tin trên hồ sơ của họ hoặc ứng tuyển trực tiếp qua nền tảng.
                    </p>
                </div>
                {applyError && <p className="text-red-500 text-xs mt-2">{applyError}</p>}
            </div>

         </div>
         <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
             {currentUserData?.userType === 'WORKER' && !isEmployerViewingOwnJob && (
                <button 
                    onClick={handleApply}
                    disabled={isApplying || hasApplied}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isApplying && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {hasApplied ? 'Đã ứng tuyển' : (isApplying ? 'Đang gửi...' : 'Ứng tuyển ngay')}
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