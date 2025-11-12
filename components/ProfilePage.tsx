import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadImage } from '../services/cloudinaryService';
import UserIcon from './icons/UserIcon';
import Spinner from './Spinner';
import { UserRole, Job, Application, WorkExperience } from '../types';
import { subscribeToJobsByEmployer, updateJobStatus } from '../services/jobService';
import { subscribeToApplicationsForEmployer, updateApplicationStatus, subscribeToApplicationsForWorker } from '../services/applicationService';
import XCircleIcon from './icons/XCircleIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
// Fix: Import TrashIcon component.
import TrashIcon from './icons/TrashIcon';

interface ProfilePageProps {
    onViewProfile: (userId: string, application: Application) => void;
}

const EmployerJobCard: React.FC<{ job: Job, onStatusChange: (jobId: string, status: 'OPEN' | 'CLOSED') => void, isUpdating: boolean }> = ({ job, onStatusChange, isUpdating }) => {
    const isClosed = job.status === 'CLOSED';
    return (
        <div className="bg-white p-4 rounded-lg border flex items-center justify-between">
            <div>
                <p className="font-semibold text-gray-800">{job.title}</p>
                <p className="text-sm text-gray-500">{job.addressString}</p>
            </div>
            <button
                onClick={() => onStatusChange(job.id, isClosed ? 'OPEN' : 'CLOSED')}
                disabled={isUpdating}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                    isClosed 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
            >
                {isUpdating ? '...' : (isClosed ? 'Mở lại' : 'Đóng')}
            </button>
        </div>
    );
};

const ApplicantCard: React.FC<{ 
    application: Application,
    onStatusUpdate: (status: 'accepted' | 'rejected') => void;
    onViewProfile: () => void;
    isUpdating: boolean;
}> = ({ application, onStatusUpdate, onViewProfile, isUpdating }) => {
    const statusInfo = {
        pending: { text: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
        accepted: { text: 'Đã chấp nhận', className: 'bg-green-100 text-green-800' },
        rejected: { text: 'Đã từ chối', className: 'bg-red-100 text-red-800' },
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
                     <button onClick={onViewProfile} className="font-semibold text-gray-800 hover:text-indigo-600 text-left">
                        {application.workerName}
                    </button>
                    <p className="text-sm text-gray-600">
                        Đã ứng tuyển vào: <span className="font-medium text-indigo-600">{application.jobTitle}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Ngày: {new Date(application.applicationDate).toLocaleDateString('vi-VN')}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-end">
                 {application.status === 'pending' && (
                  <>
                    <button onClick={() => onStatusUpdate('accepted')} disabled={isUpdating} className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50">
                      {isUpdating ? '...' : 'Chấp nhận'}
                    </button>
                    <button onClick={() => onStatusUpdate('rejected')} disabled={isUpdating} className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50">
                      {isUpdating ? '...' : 'Từ chối'}
                    </button>
                  </>
                )}
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.className}`}>
                    {currentStatus.text}
                </span>
            </div>
        </div>
    );
};

const WorkerApplicationCard: React.FC<{ application: Application }> = ({ application }) => {
    const statusInfo = {
        pending: { text: 'Đang chờ', className: 'bg-yellow-100 text-yellow-800' },
        accepted: { text: 'Đã chấp nhận', className: 'bg-green-100 text-green-800' },
        rejected: { text: 'Đã từ chối', className: 'bg-red-100 text-red-800' },
    };
    const currentStatus = statusInfo[application.status] || statusInfo.pending;

    return (
        <div className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-grow text-left w-full sm:w-auto">
                <p className="font-semibold text-gray-800">{application.jobTitle}</p>
                <p className="text-sm text-gray-500">Nhà tuyển dụng: <span className="font-medium">{application.employerName}</span></p>
                <p className="text-xs text-gray-400 mt-1">
                    Ngày nộp đơn: {new Date(application.applicationDate).toLocaleDateString('vi-VN')}
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


const ProfilePage: React.FC<ProfilePageProps> = ({ onViewProfile }) => {
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

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUserData) {
      // Set basic info
      setFullName(currentUserData.fullName || '');
      setPhoneNumber(currentUserData.phoneNumber || '');
      setAddress(currentUserData.address || '');
      setAvatarPreview(currentUserData.profileImageUrl || null);
      
      // Set worker-specific info
      setBio(currentUserData.bio || '');
      setSkills(currentUserData.skills || []);
      setWorkHistory(currentUserData.workHistory || []);


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
    const closed = myJobs.filter(job => job.status === 'CLOSED');
    return { openJobs: open, closedJobs: closed };
  }, [myJobs]);
  
  const { pendingApplications, acceptedApplications, rejectedApplications } = useMemo(() => {
    if (currentUserData?.userType !== UserRole.Worker) {
      return { pendingApplications: [], acceptedApplications: [], rejectedApplications: [] };
    }
    return {
      pendingApplications: myApplications.filter(app => app.status === 'pending'),
      acceptedApplications: myApplications.filter(app => app.status === 'accepted'),
      rejectedApplications: myApplications.filter(app => app.status === 'rejected'),
    };
  }, [myApplications, currentUserData]);


  const handleJobStatusChange = async (jobId: string, status: 'OPEN' | 'CLOSED') => {
    setUpdatingJobId(jobId);
    try {
        await updateJobStatus(jobId, status);
    } catch (error) {
        console.error("Failed to update job status:", error);
        setError("Lỗi cập nhật trạng thái công việc.");
    } finally {
        setUpdatingJobId(null);
    }
  };
  
  const handleApplicationStatusUpdate = async (application: Application, status: 'accepted' | 'rejected') => {
      const uniqueId = `${application.jobId}-${application.id}`;
      setUpdatingApplicationId(uniqueId);
      try {
          await updateApplicationStatus(application, status);
      } catch (error) {
          console.error("Failed to update application status:", error);
          setError("Lỗi cập nhật trạng thái ứng viên.");
      } finally {
          setUpdatingApplicationId(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
        setError('Vui lòng nhập họ và tên của bạn.');
        return;
    }
    if (!currentUser) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
        let imageUrl = currentUserData?.profileImageUrl || null;
        if (avatarFile) {
            imageUrl = await uploadImage(avatarFile);
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
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
        }

        await updateDoc(userDocRef, dataToUpdate);
        
        await refetchUserData();
        setSuccess('Cập nhật hồ sơ thành công!');
        setAvatarFile(null); 

    } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại.');
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
      setError("Đăng xuất thất bại. Vui lòng thử lại.");
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
    return <Spinner message="Đang tải hồ sơ..."/>;
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Hồ sơ của bạn</h2>
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
                    className="relative w-32 h-32 rounded-full group bg-gray-100 flex items-center justify-center cursor-pointer border-2 border-dashed hover:border-indigo-400 transition-all"
                    aria-label="Thay đổi ảnh đại diện"
                >
                    {avatarPreview || (currentUserData && currentUserData.profileImageUrl) ? (
                        <img 
                            src={avatarPreview || currentUserData.profileImageUrl!} 
                            alt="Xem trước" 
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-full h-full text-gray-400 p-8" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </button>
                 <p className="text-sm text-gray-500">Nhấp vào ảnh để thay đổi</p>
            </div>
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    id="email"
                    value={currentUserData.email || ''}
                    disabled
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-500"
                />
            </div>
             <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và Tên"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Số điện thoại (tùy chọn)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Địa chỉ (tùy chọn)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Worker-specific Fields */}
            {currentUserData.userType === UserRole.Worker && (
                <>
                    <hr/>
                    <div className="space-y-6">
                         {/* Bio */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu bản thân</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Viết một vài dòng về bản thân và kinh nghiệm của bạn..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                        </div>
                        {/* Skills */}
                        <div>
                            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">Kỹ năng</label>
                            <div className="flex gap-2">
                                <input id="skills" type="text" value={currentSkill} onChange={e => setCurrentSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} placeholder="VD: Sửa điện, giữ trẻ..." className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <button type="button" onClick={handleAddSkill} className="bg-indigo-100 text-indigo-700 font-semibold px-4 rounded-lg hover:bg-indigo-200">Thêm</button>
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

                        {/* Work History */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lịch sử làm việc</label>
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
                                {workHistory.length === 0 && !showWorkForm && <p className="text-sm text-gray-500 text-center py-2">Chưa có kinh nghiệm làm việc.</p>}
                                
                                {showWorkForm && (
                                    <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white">
                                        <input type="text" value={newWork.title} onChange={e => setNewWork({...newWork, title: e.target.value})} placeholder="Chức danh công việc" className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <input type="text" value={newWork.company} onChange={e => setNewWork({...newWork, company: e.target.value})} placeholder="Tên công ty/nơi làm việc" className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <input type="text" value={newWork.duration} onChange={e => setNewWork({...newWork, duration: e.target.value})} placeholder="Thời gian (VD: 2020 - 2022)" className="w-full p-2 border border-gray-300 rounded-md"/>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleAddWorkHistory} className="bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-green-700">Lưu</button>
                                            <button type="button" onClick={() => setShowWorkForm(false)} className="bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm hover:bg-gray-300">Hủy</button>
                                        </div>
                                    </div>
                                )}

                                {!showWorkForm && (
                                    <button type="button" onClick={() => setShowWorkForm(true)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 p-2 border-2 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
                                        <PlusCircleIcon className="w-5 h-5"/>
                                        Thêm kinh nghiệm
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
                  className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors flex items-center justify-center"
              >
                   {isLoading && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                   )}
                  {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-300 border border-gray-300"
              >
                  Đăng xuất
              </button>
            </div>
        </form>
      </div>

       {/* Employer Dashboard */}
      {currentUserData.userType === UserRole.Employer && (
        <div className="max-w-4xl w-full mx-auto mt-12 space-y-10">
            {/* Section 1: Open Jobs */}
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Bài đăng đang mở</h3>
                {jobsLoading ? <Spinner /> : openJobs.length > 0 ? (
                    <div className="space-y-3">
                    {openJobs.map(job => (
                        <EmployerJobCard 
                            key={job.id} 
                            job={job} 
                            onStatusChange={handleJobStatusChange}
                            isUpdating={updatingJobId === job.id}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Bạn không có tin tuyển dụng nào đang mở.</p>
                )}
            </div>

            {/* Section 2: Closed Jobs */}
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Bài đăng đã đóng</h3>
                 {jobsLoading ? <Spinner /> : closedJobs.length > 0 ? (
                    <div className="space-y-3">
                    {closedJobs.map(job => (
                        <EmployerJobCard 
                            key={job.id} 
                            job={job} 
                            onStatusChange={handleJobStatusChange}
                            isUpdating={updatingJobId === job.id}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Bạn không có tin tuyển dụng nào đã đóng.</p>
                )}
            </div>

            {/* Section 3: Applicants */}
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Ứng viên đã nộp đơn</h3>
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
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Chưa có ứng viên nào nộp đơn.</p>
                )}
            </div>
        </div>
        )}
        
      {/* Worker Dashboard */}
      {currentUserData.userType === UserRole.Worker && (
        <div className="max-w-2xl w-full mx-auto mt-12 space-y-10">
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Đơn ứng tuyển đang chờ</h3>
                {myAppsLoading ? <Spinner /> : pendingApplications.length > 0 ? (
                    <div className="space-y-3">
                    {pendingApplications.map(app => (
                        <WorkerApplicationCard key={`${app.jobId}-${app.id}`} application={app} />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Bạn không có đơn ứng tuyển nào đang chờ.</p>
                )}
            </div>
             <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Công việc đã được chấp thuận</h3>
                 {myAppsLoading ? <Spinner /> : acceptedApplications.length > 0 ? (
                    <div className="space-y-3">
                    {acceptedApplications.map(app => (
                       <WorkerApplicationCard key={`${app.jobId}-${app.id}`} application={app} />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Chưa có đơn ứng tuyển nào được chấp thuận.</p>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Đơn ứng tuyển bị từ chối</h3>
                 {myAppsLoading ? <Spinner /> : rejectedApplications.length > 0 ? (
                    <div className="space-y-3">
                    {rejectedApplications.map(app => (
                        <WorkerApplicationCard key={`${app.jobId}-${app.id}`} application={app} />
                    ))}
                    </div>
                ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-lg text-center">Bạn không có đơn ứng tuyển nào bị từ chối.</p>
                )}
            </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
