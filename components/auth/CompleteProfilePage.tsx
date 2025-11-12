import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { uploadImage } from '../../services/cloudinaryService';
import UserIcon from '../icons/UserIcon';

const CompleteProfilePage: React.FC = () => {
  const { currentUser, currentUserData, refetchUserData } = useAuth();
  const [fullName, setFullName] = useState(currentUserData?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUserData?.phoneNumber || '');
  const [address, setAddress] = useState(currentUserData?.address || '');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUserData?.profileImageUrl || null);
  
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
        let imageUrl = currentUserData?.profileImageUrl || null;
        if (avatarFile) {
            imageUrl = await uploadImage(avatarFile);
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
            fullName,
            phoneNumber,
            address,
            profileImageUrl: imageUrl,
        });
        
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
    // No need to set isLoading to false on success, as the app will transition away
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Hoàn thiện hồ sơ</h1>
            <p className="text-gray-600 mt-2">Vui lòng cập nhật thông tin để tiếp tục.</p>
        </div>
        
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
                    className="relative w-32 h-32 rounded-full group bg-gray-100 flex items-center justify-center cursor-pointer border hover:border-indigo-400"
                    aria-label="Thay đổi ảnh đại diện"
                >
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Xem trước" className="w-full h-full rounded-full object-cover"/>
                    ) : (
                        <UserIcon className="w-full h-full text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center transition-opacity">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </button>
            </div>

             <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Họ và Tên"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Số điện thoại (tùy chọn)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
             <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Địa chỉ (tùy chọn)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

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
                {isLoading ? 'Đang lưu...' : 'Lưu và Tiếp tục'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;