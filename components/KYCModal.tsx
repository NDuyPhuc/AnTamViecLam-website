
import React, { useState, useEffect, useRef } from 'react';
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
  
  // Ref to keep track of the DOM element we create for the AI library
  const aiContainerRef = useRef<HTMLDivElement | null>(null);

  // Cleanup function to remove the AI container
  const cleanupAI = () => {
    if (aiContainerRef.current && document.body.contains(aiContainerRef.current)) {
        document.body.removeChild(aiContainerRef.current);
        aiContainerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
        cleanupAI();
    };
  }, []);

  const startKYC = async () => {
    setError('');
    setStatus('loading');

    // Short delay to allow React state update to reflect (spinner etc)
    await new Promise(resolve => setTimeout(resolve, 100));

    const aie_aic = (window as any).aie_aic;
    if (typeof aie_aic !== 'function') {
        setError('Hệ thống eKYC chưa sẵn sàng. Vui lòng thử lại sau.');
        setStatus('idle');
        return;
    }

    try {
        // 1. Create a clean, isolated container at the body level
        // This avoids conflicts with React modal styles (transforms, z-index, etc.)
        const containerId = `aic-portal-${Date.now()}`;
        const div = document.createElement('div');
        div.id = containerId;
        div.style.position = 'fixed';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100vw';
        div.style.height = '100vh';
        div.style.zIndex = '9999'; // Ensure it's on top of everything
        div.style.backgroundColor = '#000';
        document.body.appendChild(div);
        
        aiContainerRef.current = div;

        // 2. Configure 1AIE
        const config = {
            type: "kyc", 
            kyc: {
                collect: "manual", 
                type: "image", 
                video: { frame_rate: 30, duration: 60, file_name: "aic_kyc_video" },
                get: ["faceStraight", "faceRight", "faceLeft"], 
                width: "100%", 
                position: "top", 
                send_button: true, 
                switch_button: true,
                kyc_data: {
                    face: 4, gender: false, liveness: true, 
                    look_left: 20, look_right: 20, board_info: "frame" 
                }
            },
            brand: "An Tâm Việc Làm", 
            width: "100%",
            // Removed 'video: "all"' to prevent potential config conflicts
            
            function: async function(res: any, location: any) {
                console.log("Kết quả KYC:", res);
                if (res && (Object.keys(res).length > 0)) {
                     // Hide the AI container immediately so users see the "Processing" UI
                     if (div) div.style.display = 'none';
                     
                     setStatus('processing');
                     try {
                         if (currentUser) {
                             await verifyUser(currentUser.uid, res);
                             setStatus('success');
                             cleanupAI(); // Remove container from DOM
                             setTimeout(() => { onSuccess(); }, 2000);
                         }
                     } catch (err) {
                         console.error(err);
                         setError('Lỗi khi lưu dữ liệu xác minh.');
                         setStatus('idle');
                         cleanupAI();
                     }
                } else {
                    // User cancelled or empty result
                    cleanupAI();
                    setStatus('idle');
                }
            }
        };

        // 3. Initialize Library
        // We pass the ID string *without* the hash '#' because the library adds it internally.
        aie_aic(containerId, config);

    } catch (e: any) {
        console.error("eKYC Init Error:", e);
        setError(`Không thể khởi động camera: ${e.message}`);
        setStatus('idle');
        cleanupAI();
    }
  };

  const handleClose = () => {
      cleanupAI();
      onClose();
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 animate-fade-in"
        onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
                Xác minh danh tính (eKYC)
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow flex flex-col items-center justify-center min-h-[400px] relative bg-gray-50">
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 w-full text-center border border-red-100">
                    {error}
                </div>
            )}

            {status === 'idle' && (
                <div className="text-center max-w-md animate-fade-in-up">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Xác thực khuôn mặt</h3>
                    <p className="text-gray-600 mb-8 text-base">
                        Hệ thống sẽ yêu cầu quyền truy cập camera để xác minh danh tính của bạn. Vui lòng làm theo hướng dẫn trên màn hình.
                    </p>
                    <button
                        onClick={startKYC}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] shadow-md text-lg flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Bắt đầu Camera
                    </button>
                </div>
            )}

            {status === 'loading' && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-600 font-semibold text-lg">Đang khởi động máy ảnh...</p>
                    <p className="text-gray-500 text-sm mt-2">Vui lòng chọn "Cho phép" nếu trình duyệt yêu cầu.</p>
                </div>
            )}

            {status === 'processing' && (
                 <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-green-600 font-bold text-lg">Đang xử lý dữ liệu...</p>
                    <p className="text-gray-500 text-sm mt-2">Vui lòng không tắt trình duyệt.</p>
                </div>
            )}

            {status === 'success' && (
                <div className="absolute inset-0 bg-white z-30 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Xác minh thành công!</h3>
                    <p className="text-gray-500">Hồ sơ của bạn đã được cập nhật.</p>
                </div>
            )}
        </div>
        <div className="p-3 border-t bg-gray-50 text-center text-xs text-gray-400">
             Công nghệ nhận diện khuôn mặt bởi 1AIE Smart AI
        </div>
      </div>
    </div>
  );
};

export default KYCModal;
