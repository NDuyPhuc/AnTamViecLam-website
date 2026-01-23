
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { uploadFile } from '../services/cloudinaryService';
import UserIcon from './icons/UserIcon';
import Spinner from './Spinner';
import { UserRole, Job, Application, WorkExperience } from '../types';
import { subscribeToJobsByEmployer, updateJobStatus, getJobById } from '../services/jobService';
import { subscribeToApplicationsForEmployer, updateApplicationStatus, subscribeToApplicationsForWorker } from '../services/applicationService';
import XCircleIcon from './icons/XCircleIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import TrashIcon from './icons/TrashIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import KycModal from './KycModal';
import { useTranslation } from 'react-i18next';

interface ProfilePageProps {
    onViewProfile: (userId: string, application: Application) => void;
    onJobSelect: (job: Job) => void;
}

const EmployerJobCard: React.FC<{ 
    job: Job, 
    onStatusChange: (jobId: string, status: 'OPEN' | 'CLOSED') => void, 
    isUpdating: boolean,
    onClick: (job: Job) => void
}> = ({ job, onStatusChange, isUpdating, onClick }) => {
    const { t } = useTranslation();
    const isClosed = job.status === 'CLOSED';
    return (
        <div 
            onClick={() => onClick(job)}
            className="bg-white p-4 rounded-lg border flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
        >
            <div>
                <p className="font-semibold text-gray-800">{job.title}</p>
                <p className="text-sm text-gray-500">{job.addressString}</p>
                {isClosed && <p className="text-xs text-red-500 italic mt-1">{t('profile.job_closed_label')}</p>}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(job.id, isClosed ? 'OPEN' : 'CLOSED');
                }}
                disabled={isUpdating}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                    isClosed 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
            >
                {isUpdating ? '...' : (isClosed ? t('profile.btn_reopen') : t('profile.btn_close_job'))}
            </button>
        </div>
    );
};

const ApplicantCard: React.FC<{ 
    application: Application,
    onStatusUpdate: (status: 'accepted' | 'rejected' | 'hired') => void;
    onViewProfile: () => void;
    isUpdating: boolean;
}> = ({ application, onStatusUpdate, onViewProfile, isUpdating }) => {
    const { t } = useTranslation();
    
    const statusInfo = {
        pending: { text: t('profile.status_pending'), className: 'bg-yellow-100 text-yellow-800' },
        accepted: { text: t('profile.status_accepted'), className: 'bg-blue-100 text-blue-800' },
        rejected: { text: t('profile.status_rejected'), className: 'bg-red-100 text-red-800' },
        hired: { text: t('profile.status_hired'), className: 'bg-green-100 text-green-800' },
    };
    
    const currentStatus = statusInfo[application.status] || statusInfo.pending;

    return (
        <div className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 flex-grow w-full sm:w-auto">
                {application.workerProfileImageUrl ? (
                    <img src={application.workerProfileImageUrl} alt={application.workerName} className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
                ) : (
                    <UserIcon className="w-12 h-12 flex-shrink-0" />
                )}
                <div className="flex-grow">
                     <div className="flex items-center gap-2">
                         <button onClick={onViewProfile} className="font-semibold text-gray-800 hover:text-indigo-600 text-left">
                            {application.workerName}
                        </button>
                        {application.cvUrl && (
                            <a 
                                href={application.cvUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs flex items-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DocumentTextIcon className="w-3 h-3 mr-1"/>
                                CV
                            </a>
                        )}
                     </div>
                    <p className="text-sm text-gray-600">
                        {t('profile.applied_job')}: <span className="font-medium text-indigo-600">{application.jobTitle}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {t('profile.date')}: {new Date(application.applicationDate).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex flex-col items-end space-y-2 flex-shrink-0 w-full sm:w-auto">
                 {application.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button onClick={() => onStatusUpdate('accepted')} disabled={isUpdating} className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50">
                      {isUpdating ? '...' : t('profile.btn_accept')}
                    </button>
                    <button onClick={() => onStatusUpdate('rejected')} disabled={isUpdating} className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50">
                      {isUpdating ? '...' : t('profile.btn_reject')}
                    </button>
                  </div>
                )}
                {application.status === 'accepted' && (
                    <button 
                        onClick={() => onStatusUpdate('hired')} 
                        disabled={isUpdating} 
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-colors"
                    >
                        {isUpdating ? '...' : t('profile.btn_hire')}
                    </button>
                )}
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.className}`}>
                    {currentStatus.text}
                </span>
            </div>
        </div>
    );
};

const WorkerApplicationCard: React.FC<{ 
    application: Application,
    onClick: (jobId: string) => void
}> = ({ application, onClick }) => {
    const { t } = useTranslation();
    const statusInfo = {
        pending: { text: t('profile.status_pending'), className: 'bg-yellow-100 text-yellow-800' },
        accepted: { text: t('profile.status_accepted'), className: 'bg-blue-100 text-blue-800' },
        rejected: { text: t('profile.status_rejected'), className: 'bg-red-100 text-red-800' },
        hired: { text: t('profile.status_hired'), className: 'bg-green-100 text-green-800' },
    };
    const currentStatus = statusInfo[application.status] || statusInfo.pending;

    return (
        <div 
            onClick={() => onClick(application.jobId)}
            className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
        >
            <div className="flex-grow text-left w-full sm:w-auto">
                <p className="font-semibold text-gray-800">{application.jobTitle}</p>
                <p className="text-sm text-gray-500">{t('profile.employer_label')}: <span className="font-medium">{application.employerName}</span></p>
                <p className="text-xs text-gray-400 mt-1">
                    {t('profile.applied_date')}: {new Date(application.applicationDate).toLocaleDateString()}
                </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                 <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.className}`}>
                    {currentStatus.text}
                </span>
            </div>
        </div>
    );
};


const ProfilePage: React.FC<ProfilePageProps> = ({ onViewProfile, onJobSelect }) => {
  const { t } = useTranslation();
  const { currentUser, currentUserData, refetchUserData, logout } = useAuth();

  // Basic info state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Worker-specific profile state
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [workHistory, setWorkHistory] = useState<WorkExperience[]>([]);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [newWork, setNewWork] = useState({ title: '', company: '', duration: '' });
  
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [existingCvUrl, setExistingCvUrl] = useState<string | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showKycModal, setShowKycModal] = useState(false);

  // Employer's data state
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  
  // Worker's data state
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  
  const [isFetchingJob, setIsFetchingJob] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUserData) {
      setFullName(currentUserData.fullName || '');
      setPhoneNumber(currentUserData.phoneNumber || '');
      setAddress(currentUserData.address || '');
      setAvatarPreview(currentUserData.profileImageUrl || null);
      
      setBio(currentUserData.bio || '');
      setSkills(currentUserData.skills || []);
      setWorkHistory(currentUserData.workHistory || []);
      setExistingCvUrl(currentUserData.cvUrl || null);
      setExistingCvName(currentUserData.cvName || null);


      if (currentUserData.userType === UserRole.Employer) {
        setJobsLoading(true);
        setAppsLoading(true);
        const unsubscribeJobs = subscribeToJobsByEmployer(currentUserData.uid, (jobs) => {
          setMyJobs(jobs);
          setJobsLoading(false);
        });
        const unsubscribeApps = subscribeToApplicationsForEmployer(currentUserData.uid, (apps) => {
            setApplications(apps);
            setAppsLoading(false);
        });

        return () => {
          unsubscribeJobs();
          unsubscribeApps();
        };
      }

      if (currentUserData.userType === UserRole.Worker) {
        setMyAppsLoading(true);
        const unsubscribeWorkerApps = subscribeToApplicationsForWorker(currentUserData.uid, (apps) => {
          setMyApplications(apps);
          setMyAppsLoading(false);
        });
        return () => unsubscribeWorkerApps();
      }
    }
  }, [currentUserData]);

  const { openJobs, closedJobs } = useMemo(() => {
    const open = myJobs.filter(job => job.status === 'OPEN');
    // Admin closed jobs will also appear here if status is 'CLOSED'
    const closed = myJobs.filter(job => job.status === 'CLOSED');
    return { openJobs: open, closedJobs: closed };
  }, [myJobs]);
  
  const { pendingApplications, acceptedApplications, rejectedApplications, hiredApplications } = useMemo(() => {
    if (currentUserData?.userType !== UserRole.Worker) {
      return { pendingApplications: [], acceptedApplications: [], rejectedApplications: [], hiredApplications: [] };
    }
    return {
      pendingApplications: myApplications.filter(app => app.status === 'pending'),
      acceptedApplications: myApplications.filter(app => app.status === 'accepted'),
      rejectedApplications: myApplications.filter(app => app.status === 'rejected'),
      hiredApplications: myApplications.filter(app => app.status === 'hired'),
    };
  }, [myApplications, currentUserData]);


  const handleJobStatusChange = async (jobId: string, status: 'OPEN' | 'CLOSED') => {
    setUpdatingJobId(jobId);
    try {
        await updateJobStatus(jobId, status);
    } catch (error) {
        console.error("Failed to update job status:", error);
        setError(t('common.error'));
    } finally {
        setUpdatingJobId(null);
    }
  };
  
  const handleApplicationStatusUpdate = async (application: Application, status: 'accepted' | 'rejected' | 'hired') => {
      const uniqueId = `${application.jobId}-${application.id}`;
      setUpdatingApplicationId(uniqueId);
      try {
          await updateApplicationStatus(application, status);
      } catch (error) {
          console.error("Failed to update application status:", error);
          setError(t('common.error'));
      } finally {
          setUpdatingApplicationId(null);
      }
  };
  
  const handleViewJobDetail = async (jobId: string) => {
      setIsFetchingJob(true);
      try {
          const localJob = myJobs.find(j => j.id === jobId);
          if (localJob) {
              onJobSelect(localJob);
          } else {
              const job = await getJobById(jobId);
              if (job) {
                  onJobSelect(job);
              } else {
                  alert(t('job.error_not_found'));
              }
          }
      } catch (err) {
          console.error("Error fetching job details", err);
      } finally {
          setIsFetchingJob(false);
      }
  };


  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const filename = file.name.toLowerCase();
          const fileType = file.type || '';
          
          const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          const validExtensions = ['.pdf', '.doc', '.docx'];

          const isValid = validTypes.some(t => fileType.includes(t)) || 
                          validExtensions.some(ext => filename.endsWith(ext));

          if (!isValid) {
              setError(t('auth.error_invalid_cv_type'));
              return;
          }
          
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
              setError(t('auth.error_file_too_large'));
              return;
          }
          setCvFile(file);
          setError('');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
        setError(t('common.error'));
        return;
    }
    if (!currentUser) {
        setError(t('common.error'));
        return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
        let imageUrl = currentUserData?.profileImageUrl || null;
        if (avatarFile) {
            const rawUrl = await uploadFile(avatarFile);
            imageUrl = rawUrl.trim();
        }
        
        let newCvUrl = existingCvUrl;
        let newCvName = existingCvName;
        
        if (cvFile) {
            const rawUrl = await uploadFile(cvFile); 
            newCvUrl = rawUrl.trim();
            newCvName = cvFile.name;
        }

        const userDocRef = db.collection('users').doc(currentUser.uid);
        const dataToUpdate: any = {
            fullName,
            phoneNumber,
            address,
            profileImageUrl: imageUrl,
        };

        if(currentUserData?.userType === UserRole.Worker) {
            dataToUpdate.bio = bio;
            dataToUpdate.skills = skills;
            dataToUpdate.workHistory = workHistory;
            dataToUpdate.cvUrl = newCvUrl;
            dataToUpdate.cvName = newCvName;
        }

        await userDocRef.update(dataToUpdate);
        
        setExistingCvUrl(newCvUrl);
        setExistingCvName(newCvName);
        setAvatarPreview(imageUrl);
        
        await refetchUserData();
        setSuccess(t('common.success'));
        setAvatarFile(null); 
        setCvFile(null);

    } catch (err) {
        console.error(err);
        setError(t('common.error'));
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
      setError(t('common.error'));
    }
  };

  // --- Skill handlers ---
  const handleAddSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };
  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  // --- Work History handlers ---
  const handleAddWorkHistory = () => {
      if (newWork.title.trim() && newWork.company.trim() && newWork.duration.trim()) {
          const newEntry: WorkExperience = { ...newWork, id: Date.now().toString() };
          setWorkHistory([...workHistory, newEntry]);
          setNewWork({ title: '', company: '', duration: '' });
          setShowWorkForm(false);
      }
  };
  const handleRemoveWorkHistory = (id: string) => {
      setWorkHistory(workHistory.filter(work => work.id !== id));
  };


  if (!currentUserData) {
    return <Spinner message={t('common.loading')}/>;
  }

  // --- KYC Status Helper ---
  const renderKycStatus = () => {
      const status = currentUserData.kycStatus || 'none';
      
      if (status === 'verified') {
          return (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-xl border border-green-200 shadow-sm">
                  <ShieldCheckIcon className="w-5 h-5" />
                  <div>
                      <span className="font-bold text-sm block">{t('profile.kyc_verified')}</span>
                      <span className="text-xs text-green-600">{t('profile.kyc_trusted')}</span>
                  </div>
              </div>
          );
      }
      if (status === 'pending') {
          return (
              <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200 shadow-sm cursor-not-allowed opacity-80">
                  <Spinner />
                  <div>
                      <span className="font-bold text-sm block">{t('profile.kyc_pending')}</span>
                      <span className="text-xs">{t('profile.kyc_pending_desc')}</span>
                  </div>
              </div>
          );
      }
      if (status === 'rejected') {
          return (
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-3 rounded-xl border border-red-200 shadow-sm">
                      <XCircleIcon className="w-6 h-6 flex-shrink-0" />
                      <div>
                          <span className="font-bold text-sm block">{t('profile.kyc_rejected')}</span>
                          {currentUserData.kycRejectReason && (
                              <p className="text-xs mt-1">{t('profile.kyc_reason')} <span className="font-semibold">{currentUserData.kycRejectReason}</span></p>
                          )}
                      </div>
                  </div>
                  <button 
                    onClick={() => setShowKycModal(true)} 
                    className="text-sm text-white bg-red-600 hover:bg-red-700 py-2 rounded-lg font-medium shadow-sm transition-colors"
                  >
                      {t('profile.kyc_resubmit')}
                  </button>
              </div>
          );
      }
      // status === 'none'
      return (
          <button 
            onClick={() => setShowKycModal(true)}
            className="group flex items-center gap-3 text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl border border-gray-300 shadow-sm transition-all hover:border-indigo-400"
          >
              <div className="p-2 bg-gray-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                  <ShieldExclamationIcon className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
              </div>
              <div className="text-left">
                  <span className="font-bold text-sm block text-gray-800">{t('profile.kyc_none')}</span>
                  <span className="text-xs text-gray-500">{t('profile.kyc_none_desc')}</span>
              </div>
          </button>
      );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
              <h2 className="text-3xl font-bold text-gray-800">{t('profile.title')}</h2>
              <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân và trạng thái tài khoản</p>
          </div>
          {renderKycStatus()}
      </div>

      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-gray-200 mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg"
                />
                <button 
                    type="button" 
                    onClick={handleAvatarClick}
                    className="relative w-32 h-32 rounded-full group bg-gray-100 flex items-center justify-center cursor-pointer border-2 border-dashed hover:border-indigo-400 transition-all shadow-inner"
                    aria-label="Change avatar"
                >
                    {avatarPreview || (currentUserData && currentUserData.profileImageUrl) ? (
                        <img 
                            src={avatarPreview || currentUserData.profileImageUrl!} 
                            alt="Avatar" 
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-full h-full text-gray-400 p-8" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
                         <PlusCircleIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </button>
                 <p className="text-sm text-gray-500">{t('profile.avatar_hint')}</p>
            </div>
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
                <input
                    type="email"
                    id="email"
                    value={currentUserData.email || ''}
                    disabled
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-500"
                />
            </div>
             <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.full_name')} <span className="text-red-500">*</span>
                </label>
                <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('profile.fullname_placeholder')}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1 italic">{t('profile.fullname_hint')}</p>
            </div>
            <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
                <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t('profile.phone')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.address')}</label>
                <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('profile.address')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {currentUserData.userType === UserRole.Worker && (
                <>
                    <hr/>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.bio')}</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder={t('profile.bio')} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                        </div>
                        
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.cv')}</label>
                             <input
                                type="file"
                                ref={cvInputRef}
                                onChange={handleCvFileChange}
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => cvInputRef.current?.click()}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-200 flex items-center"
                                >
                                    <DocumentTextIcon className="w-5 h-5 mr-2"/>
                                    {cvFile ? t('profile.change_cv') : t('profile.upload_cv')}
                                </button>
                                {cvFile && <span className="text-sm text-green-600">{cvFile.name}</span>}
                                {existingCvUrl && !cvFile && (
                                    <a href={existingCvUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center">
                                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                                        {existingCvName || t('profile.view_cv')}
                                    </a>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">{t('profile.skills')}</label>
                            <div className="flex gap-2">
                                <input id="skills" type="text" value={currentSkill} onChange={e => setCurrentSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <button type="button" onClick={handleAddSkill} className="bg-indigo-100 text-indigo-700 font-semibold px-4 rounded-lg hover:bg-indigo-200">{t('profile.add_skill')}</button>
                            </div>
                             <div className="mt-3 flex flex-wrap gap-2">
                                {skills.map(skill => (
                                    <span key={skill} className="flex items-center bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                                        {skill}
                                        <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-2 text-gray-500 hover:text-gray-800"><XCircleIcon className="w-4 h-4"/></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.work_history')}</label>
                            <div className="space-y-3">
                                {workHistory.map(work => (
                                    <div key={work.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">{work.title}</p>
                                            <p className="text-sm text-gray-600">{work.company}</p>
                                            <p className="text-xs text-gray-500">{work.duration}</p>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveWorkHistory(work.id)} className="text-gray-400 hover:text-red-500 p-1"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                
                                {showWorkForm && (
                                    <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white">
                                        <input type="text" value={newWork.title} onChange={e => setNewWork({...newWork, title: e.target.value})} placeholder={t('profile.position')} className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <input type="text" value={newWork.company} onChange={e => setNewWork({...newWork, company: e.target.value})} placeholder={t('profile.company')} className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <input type="text" value={newWork.duration} onChange={e => setNewWork({...newWork, duration: e.target.value})} placeholder={t('profile.duration')} className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleAddWorkHistory} className="bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-green-700">{t('common.save')}</button>
                                            <button type="button" onClick={() => setShowWorkForm(false)} className="bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm hover:bg-gray-300">{t('common.cancel')}</button>
                                        </div>
                                    </div>
                                )}

                                {!showWorkForm && (
                                    <button type="button" onClick={() => setShowWorkForm(true)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 p-2 border-2 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
                                        <PlusCircleIcon className="w-5 h-5"/>
                                        {t('profile.add_work')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
            {success && <p className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg border border-green-200">{success}</p>}

            <div className="pt-2 space-y-4">
              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors flex items-center justify-center shadow-md"
              >
                   {isLoading && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                   )}
                  {isLoading ? t('common.saving') : t('common.save')}
              </button>
              <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-300 border border-gray-300"
              >
                  {t('common.logout')}
              </button>
            </div>
        </form>
      </div>

       {/* Employer Dashboard */}
      {currentUserData.userType === UserRole.Employer && (
        <div className="max-w-4xl w-full mx-auto mt-12 space-y-10">
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.employer_open_jobs')}</h3>
                {jobsLoading ? <Spinner /> : openJobs.length > 0 ? (
                    <div className="space-y-3">
                    {openJobs.map(job => (
                        <EmployerJobCard 
                            key={job.id} 
                            job={job} 
                            onStatusChange={handleJobStatusChange}
                            isUpdating={updatingJobId === job.id}
                            onClick={(j) => onJobSelect(j)}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">{t('common.search')}</p>
                )}
            </div>

            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.employer_closed_jobs')}</h3>
                 {jobsLoading ? <Spinner /> : closedJobs.length > 0 ? (
                    <div className="space-y-3">
                    {closedJobs.map(job => (
                        <EmployerJobCard 
                            key={job.id} 
                            job={job} 
                            onStatusChange={handleJobStatusChange}
                            isUpdating={updatingJobId === job.id}
                            onClick={(j) => onJobSelect(j)}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>

            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.employer_applicants')}</h3>
                 {appsLoading ? <Spinner /> : applications.length > 0 ? (
                    <div className="space-y-3">
                    {applications.map(app => (
                        <ApplicantCard 
                            key={`${app.jobId}-${app.id}`}
                            application={app} 
                            onStatusUpdate={(status) => handleApplicationStatusUpdate(app, status)}
                            onViewProfile={() => onViewProfile(app.workerId, app)}
                            isUpdating={updatingApplicationId === `${app.jobId}-${app.id}`}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>
        </div>
        )}
        
      {/* Worker Dashboard */}
      {currentUserData.userType === UserRole.Worker && (
        <div className="max-w-2xl w-full mx-auto mt-12 space-y-10">
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.worker_hired')}</h3>
                {myAppsLoading ? <Spinner /> : hiredApplications.length > 0 ? (
                    <div className="space-y-3">
                        {hiredApplications.map(app => (
                            <WorkerApplicationCard 
                                key={`${app.jobId}-${app.id}`} 
                                application={app} 
                                onClick={handleViewJobDetail}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.worker_pending')}</h3>
                {myAppsLoading ? <Spinner /> : pendingApplications.length > 0 ? (
                    <div className="space-y-3">
                    {pendingApplications.map(app => (
                        <WorkerApplicationCard 
                            key={`${app.jobId}-${app.id}`} 
                            application={app} 
                            onClick={handleViewJobDetail}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>
             <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.worker_accepted')}</h3>
                 {myAppsLoading ? <Spinner /> : acceptedApplications.length > 0 ? (
                    <div className="space-y-3">
                    {acceptedApplications.map(app => (
                       <WorkerApplicationCard 
                            key={`${app.jobId}-${app.id}`} 
                            application={app} 
                            onClick={handleViewJobDetail}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('profile.worker_rejected')}</h3>
                 {myAppsLoading ? <Spinner /> : rejectedApplications.length > 0 ? (
                    <div className="space-y-3">
                    {rejectedApplications.map(app => (
                        <WorkerApplicationCard 
                            key={`${app.jobId}-${app.id}`} 
                            application={app} 
                            onClick={handleViewJobDetail}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">...</p>
                )}
            </div>
        </div>
      )}

      {isFetchingJob && <Spinner fullScreen message={t('common.loading')}/>}
      
      {showKycModal && (
          <KycModal 
            onClose={() => setShowKycModal(false)}
            onSuccess={() => {
                setShowKycModal(false);
                alert(t('profile.kyc_success_alert'));
            }}
          />
      )}
    </div>
  );
};

export default ProfilePage;
