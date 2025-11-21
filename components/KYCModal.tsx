
import React, { useState } from 'react';
import XIcon from './icons/XIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import { verifyUser } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

interface KYCModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const KYCModal: React.FC<KYCModalProps> = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success'>('idle');
  const [error, setError] = useState('');

  const startKYC = () => {
    setError('');
    setStatus('loading');

    // Access the global function from the loaded script
    const aie_aic = (window as any).aie_aic;

    if (typeof aie_aic !== 'function') {
       setError('Hệ thống eKYC chưa sẵn sàng (thư viện chưa tải xong). Vui lòng kiểm tra kết nối mạng hoặc thử lại sau vài giây.');
       setStatus('idle');
       return;
    }

    try {
        // Detailed configuration as per user request
        const config = {
            type: "kyc", 
            kyc: {
                collect: "manual", // Manual collection
                type: "image", 
                video: { 
                    frame_rate: 30, 
                    duration: 60, 
                    file_name: "aic_kyc_video" 
                },
                // Required angles
                get: ["faceStraight", "faceRight", "faceLeft"], 
                
                width: "80%", 
                position: "top", 
                send_button: true, // Show send button
                switch_button: true,
                
                // AI/UX Configuration
                kyc_data: {
                    face: 4, // Auto crop
                    gender: false, 
                    liveness: true, // Liveness check
                    look_left: 20, 
                    look_right: 20, 
                    board_info: "frame" 
                }
            },
            brand: "An Tâm Việc Làm", // Customized brand name
            width: "100%", 
            video: "all", 
            
            // Callback function to handle results
            function: async function(res: any, location: any) {
                console.log("Kết quả KYC:", res);
                
                // res object structure example: 
                // { faceStraight: "base64...", faceLeft: "base64...", faceRight: "base64..." }
                
                if (res && (Object.keys(res).length > 0)) {
                     setStatus('processing');
                     
                     try {
                         if (currentUser) {
                             // Send the result payload to the backend/firebase via userService
                             await verifyUser(currentUser.uid, res);
                             
                             setStatus('success');
                             setTimeout(() => {
                                 onSuccess();
                             }, 2000);
                         }
                     } catch (err) {
                         console.error(err);
                         setError('Lỗi khi lưu dữ liệu xác minh vào hệ thống.');
                         setStatus('idle');
                     }
                } else {
                    // Handle cancellation or empty result
                    setError('Không nhận được dữ liệu xác minh hoặc người dùng đã hủy.');
                    setStatus('idle');
                }
            }
        };

        // Initialize the camera on the document body
        aie_aic("body", config);

    } catch (e: any) {
        console.error("eKYC Init Error:", e);
        setError(`Không thể khởi động camera: ${e.message}`);
        setStatus('idle');
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
            <XIcon className="w-6 h-6" />
        </button>

        <div className="p-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác minh danh tính</h2>
            <p className="text-gray-600 mb-8">
                Vui lòng thực hiện quay các góc mặt (Thẳng, Trái, Phải) theo hướng dẫn để xác thực tài khoản.
            </p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
                    {error}
                </div>
            )}

            {status === 'idle' && (
                <button
                    onClick={startKYC}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] shadow-md"
                >
                    Bắt đầu Camera
                </button>
            )}

            {status === 'loading' && (
                <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm text-indigo-600 font-medium">Đang khởi động máy ảnh...</p>
                </div>
            )}

            {status === 'processing' && (
                 <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm text-green-600 font-medium">Đang lưu dữ liệu xác thực...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="flex flex-col items-center justify-center py-2 animate-fade-in-up">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-lg font-bold text-green-600">Xác minh thành công!</p>
                </div>
            )}
            
            <div className="mt-6 text-xs text-gray-400">
                Powered by 1AIE Smart AI
            </div>
        </div>
      </div>
    </div>
  );
};

export default KYCModal;
