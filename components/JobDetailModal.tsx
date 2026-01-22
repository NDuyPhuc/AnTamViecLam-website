
import React, { useEffect, useState } from 'react';
import type { Job } from '../types';
import { useTranslation } from 'react-i18next';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { useAuth } from '../contexts/AuthContext';
import { applyForJob, checkIfApplied } from '../services/applicationService';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import MapPinIcon from './icons/MapPinIcon';
import XIcon from './icons/XIcon';
import ClockIcon from './icons/ClockIcon';

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onViewOnMap: () => void;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onViewOnMap }) => {
  const { t } = useTranslation();
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

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    const checkApplicationStatus = async () => {
        if (currentUser && currentUserData?.userType === 'WORKER') {
            const applied = await checkIfApplied(job.id, currentUser.uid);
            setHasApplied(applied);
        }
    };
    checkApplicationStatus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, job.id, currentUser, currentUserData]);

  const handleStartApply = () => {
      if (!currentUser || !currentUserData) {
        setApplyError(t('auth.error_login_required')); 
        return;
      }
      setShowApplyForm(true);
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUserData) return;
    
    if (!contactPhone.trim()) {
        setApplyError(t('auth.error_missing_phone'));
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
        setApplyError(t('common.error'));
    } finally {
        setIsApplying(false);
    }
  };

  const isEmployerViewingOwnJob = currentUserData?.uid === job.employerId;

  // Helper for salary format
  const getPayString = () => {
      if (job.payRate === "Thỏa thuận") return t('job.salary_negotiable');
      const unit = job.payType === 'THEO GIỜ' ? t('job.pay_hour') 
                 : job.payType === 'THEO NGÀY' ? t('job.pay_day')
                 : job.payType === 'THEO THÁNG' ? t('job.pay_month') : '';
      return `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(job.payRate as number)}${unit}`;
  };

  // Helper to translate job type
  const getJobTypeLabel = (type: string | undefined) => {
      if (!type) return '';
      const key = type === 'Thời vụ' ? 'type_seasonal' :
                  type === 'Bán thời gian' ? 'type_parttime' :
                  type === 'Linh hoạt' ? 'type_flexible' :
                  type === 'Toàn thời gian' ? 'type_fulltime' : null;
      return key ? t(`job.${key}`) : type;
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
        role="dialog"
        aria-modal="true"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div 
        className="bg-white w-full md:w-[90%] md:max-w-3xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col relative z-10 animate-slide-up md:animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="md:hidden w-full flex justify-center pt-3 pb-1 bg-white cursor-pointer" onClick={onClose}>
             <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
         </div>

         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white flex-shrink-0">
            <div className="flex gap-4 overflow-hidden">
                {job.employerProfileUrl ? (
                    <img src={job.employerProfileUrl} alt="logo" className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                ) : (
                    <div className="w-14 h-14 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                         <BriefcaseIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate leading-tight">{job.title}</h2>
                    <p className="text-gray-500 text-sm truncate mt-1">{job.employerName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md">
                            {getPayString()}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1"/>
                            {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors flex-shrink-0 ml-2"
            >
                <XIcon className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-grow overflow-y-auto p-6 bg-white">
            
            <div className="flex items-start gap-3 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <MapPinIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-gray-800">{t('job.location')}</p>
                    <p className="text-sm text-gray-600">{job.addressString}</p>
                    <button 
                        onClick={onViewOnMap} 
                        className="text-xs text-indigo-600 font-semibold hover:underline mt-1"
                    >
                        {t('job.view_map')}
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">{t('job.description')}</h3>
                <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {job.description}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
                 <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-100">
                    {getJobTypeLabel(job.jobType)}
                 </span>
            </div>

            {showApplyForm && !hasApplied && (
                <div className="mb-6 bg-indigo-50 p-5 rounded-xl border border-indigo-100 animate-fade-in">
                    <h3 className="font-bold text-indigo-800 mb-4 flex items-center text-lg">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        Thông tin ứng tuyển
                    </h3>
                    <form onSubmit={handleConfirmApply} className="space-y-4">
                        <div>
                            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')} <span className="text-red-500">*</span></label>
                            <input 
                                type="tel" 
                                id="contactPhone"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="introduction" className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn (Tùy chọn)</label>
                            <textarea 
                                id="introduction"
                                value={introduction}
                                onChange={(e) => setIntroduction(e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            ></textarea>
                        </div>
                        {applyError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{applyError}</p>}
                        
                        <div className="flex gap-3 pt-2">
                             <button 
                                type="button"
                                onClick={() => setShowApplyForm(false)}
                                className="px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex-1"
                            >
                                {t('common.cancel')}
                            </button>
                             <button 
                                type="submit"
                                disabled={isApplying}
                                className="flex-[2] bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center justify-center shadow-md"
                            >
                                {isApplying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('common.send')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
         </div>

         {!showApplyForm && (
             <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-shrink-0">
                 {currentUserData?.userType === 'WORKER' && !isEmployerViewingOwnJob && (
                    <button 
                        onClick={handleStartApply}
                        disabled={isApplying || hasApplied}
                        className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center shadow-md active:scale-95 ${
                            hasApplied 
                            ? 'bg-green-100 text-green-700 cursor-default' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        {hasApplied ? (
                            <>
                                <span className="mr-2">✓</span> {t('job.applied')}
                            </>
                        ) : (
                            t('job.apply_now')
                        )}
                    </button>
                 )}
                 
                 {isEmployerViewingOwnJob && (
                     <div className="flex-1 bg-gray-100 text-gray-500 font-medium py-3 px-4 rounded-xl text-center text-sm flex items-center justify-center">
                         {t('job.employer_post')}
                     </div>
                 )}

                 <button 
                    onClick={onClose}
                    className="px-5 bg-white text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors active:scale-95"
                 >
                    {t('common.close')}
                </button>
             </div>
         )}
      </div>
       <style>{`
        @keyframes slide-up {
            0% { transform: translateY(100%); }
            100% { transform: translateY(0); }
        }
        .animate-slide-up {
            animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (min-width: 768px) {
            .animate-slide-up {
                animation: fade-in 0.2s ease-out forwards;
            }
        }
    `}</style>
    </div>
  );
};

export default JobDetailModal;
