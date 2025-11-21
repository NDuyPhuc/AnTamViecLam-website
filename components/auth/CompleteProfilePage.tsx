import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, serverTimestamp } from '../../services/firebase';
import { uploadFile } from '../../services/cloudinaryService';
import { UserRole } from '../../types';
import UserIcon from '../icons/UserIcon';
import BriefcaseIcon from '../icons/BriefcaseIcon';
import UserCircleIcon from '../icons/UserCircleIcon';

const CompleteProfilePage: React.FC = () => {
  const { currentUser, currentUserData, refetchUserData } = useAuth();
  
  // Detect if this is a brand new user (via Google) who hasn't selected a role yet
  const isNewUser = !currentUserData;

  const [fullName, setFullName] = useState(currentUserData?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUserData?.phoneNumber || '');
  const [address, setAddress] = useState(currentUserData?.address || '');
  
  // Role state for new users
  const [role, setRole] = useState<UserRole>(UserRole.Worker);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // Use current user's photoURL (from Google) as default preview if available
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
      currentUserData?.profileImageUrl || currentUser?.photoURL || null
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
        let imageUrl = avatarPreview; // Default to existing or Google photo
        if (avatarFile) {
            imageUrl = await uploadFile(avatarFile);
        }

        const userDocRef = db.collection('users').doc(currentUser.uid);

        if (isNewUser) {
            // CREATE new user document (Google Sign-in flow)
            await userDocRef.set({
                uid: currentUser.uid,
                email: currentUser.email,
                userType: role, // Use selected role
                createdAt: serverTimestamp(),
                fullName,
                phoneNumber,
                address,
                profileImageUrl: imageUrl,
                fcmTokens: [],
                bio: '',
                skills: [],
                workHistory: [],
                cvUrl: null,
                cvName: null,
            });
        } else {
            // UPDATE existing user document
            await userDocRef.update({
                fullName,
                phoneNumber,
                address,
                profileImageUrl: imageUrl,
            });
        }
        
        // Refetch user data to update the context and unlock the main app
        await refetchUserData();

    } catch (err) {
        console.error(err);
        if (err instanceof Error) {
            setError(err.message); // Display the specific error from the service
        } else {
            setError('Đã có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại.');
        }
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
                {isNewUser ? 'Chào mừng bạn mới!' : 'Hoàn thiện hồ sơ'}
            </h1>
            <p className="text-gray-600 mt-2">
                {isNewUser 
                    ? 'Vui lòng chọn vai trò và cập nhật thông tin để bắt đầu.' 
                    : 'Vui lòng cập nhật thông tin để tiếp tục.'}
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role Selection for New Users */}
            {isNewUser && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Bạn muốn tham gia với tư cách là?</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setRole(UserRole.Worker)}
                            className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                role === UserRole.Worker 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                        >
                            <UserCircleIcon className="w-8 h-8 mb-2"/>
                            <span className="font-bold text-sm">Người Lao Động</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole(UserRole.Employer)}
                            className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                role === UserRole.Employer 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                        >
                            <BriefcaseIcon className="w-8 h-8 mb-2"/>
                            <span className="font-bold text-sm">Nhà Tuyển Dụng</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center space-y-4 pt-2">
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
                    className="relative w-28 h-28 rounded-full group bg-gray-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors"
                    aria-label="Thay đổi ảnh đại diện"
                >
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Xem trước" className="w-full h-full rounded-full object-cover"/>
                    ) : (
                        <UserIcon className="w-12 h-12 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center transition-opacity">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </button>
                <p className="text-xs text-gray-500">Ảnh đại diện</p>
            </div>

            <div className="space-y-4">
                <div>
                     <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Họ và Tên"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                </div>
                <div>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Số điện thoại (tùy chọn)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                </div>
                <div>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Địa chỉ (tùy chọn)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

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
                {isLoading ? 'Đang xử lý...' : (isNewUser ? 'Tạo hồ sơ' : 'Cập nhật')}
            </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;