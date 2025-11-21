
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

    // Check if library is available using type assertion
    const aie_aic = (window as any).aie_aic;

    if (typeof aie_aic !== 'function') {
       setError('Hệ thống eKYC chưa sẵn sàng (thư viện chưa tải xong). Vui lòng kiểm tra kết nối mạng hoặc thử lại sau vài giây.');
       setStatus('idle');
       return;
    }

    try {
        // Configuration provided by user
        const config = {
            type: "kyc", 
            option: {
                kyc: {
                    collect: "manual", 
                    type: "image", 
                    video: { 
                        frame_rate: 30, 
                        duration: 60, 
                        file_name: "aie_kyc_video" 
                    },
                    multi_face: false, 
                    data: {
                        face: 4, 
                        irisL: false, 
                        irisR: false 
                    },
                    get: ["faceStraight", "faceRight", "faceLeft"], 
                    width: "80%", 
                    position: "top", 
                    position_button: true, 
                    blur: 0, 
                    send_button: true, 
                    switch_button: true 
                },
                gender: false, 
                brightness: false, 
                liveness: true, 
                liveness_action: "random(2)", 
                liveness_timeout: 9, 
                deep_scan: false, 
                deep_scan_button: true, 
                look_left: 20, 
                look_right: 20, 
                face_down: 20, 
                face_up: 20, 
                face_left: 20, 
                face_right: 20, 
                lips_open: 1, 
                board_info: "frame" 
            }, 
            brand: "default", 
            width: "100%", 
            video: "all", 
            mirror: false, 
            resolution: "qhd", 
            mode: true, 
            border: false, 
            control: true, 
            torch: true, 
            zoom: {
                start: 1, 
                step: 0.5 
            }, 
            // Handle exit explicitly to close modal in React
            exit: function() {
                setStatus('idle');
                onClose();
            }, 
            location: true, 
            align: "top", 
            opacity: 1, 
            opacity_bg: "#222", 
            zindex: 1999999999, // High z-index to stay on top
            lang: {
                show: true, 
                set: "en" 
            } 
        };

        // Use "body" as target element
        aie_aic("body", config, async function(res: any, location: any) {
            console.log("eKYC Result:", res);
            
            // If we get a valid response array/object with face data
            if (res && (Array.isArray(res) ? res.length > 0 : Object.keys(res).length > 0)) {
                 setStatus('processing');
                 
                 // Save the KYC data (images, metrics) to Firebase
                 try {
                     if (currentUser) {
                         // Pass the 'res' object to verifyUser to save it in Firestore
                         await verifyUser(currentUser.uid, res);
                         setStatus('success');
                         setTimeout(() => {
                             onSuccess();
                         }, 1500);
                     }
                 } catch (err) {
                     console.error(err);
                     setError('Lỗi khi lưu dữ liệu xác minh.');
                     setStatus('idle');
                 }
            }
        });

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
                Chúng tôi sử dụng công nghệ AI eKYC để xác thực khuôn mặt của bạn. Dữ liệu xác thực sẽ được lưu trữ an toàn để đảm bảo tin cậy.
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
                    Bắt đầu xác minh
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
                    <p className="text-sm text-green-600 font-medium">Đang xử lý và lưu dữ liệu...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="flex flex-col items-center justify-center py-2 animate-fade-in-up">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-lg font-bold text-green-600">Thành công!</p>
                </div>
            )}
            
            <div className="mt-6 text-xs text-gray-400">
                Được cung cấp bởi 1AIE Smart AI
            </div>
        </div>
      </div>
    </div>
  );
};

export default KYCModal;