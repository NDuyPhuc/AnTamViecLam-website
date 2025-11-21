
import React, { useState, useEffect } from 'react';
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

  // Cleanup effect: Ensure global elements are removed if the component unmounts
  useEffect(() => {
    return () => {
      // Optional: If the library leaves any global artifacts, we can try to clean them here.
      // Since we are now mounting to a specific div ID, React removing that div should be sufficient
      // for most libraries.
    };
  }, []);

  const startKYC = () => {
    setError('');
    setStatus('loading');

    // Access the global function from the loaded script
    const aie_aic = (window as any).aie_aic;

    if (typeof aie_aic !== 'function') {
       setError('Hệ thống eKYC chưa sẵn sàng (thư viện chưa tải xong). Vui lòng kiểm tra kết nối mạng hoặc tải lại trang.');
       setStatus('idle');
       return;
    }

    try {
        const containerId = "#aic-component-container";
        
        // Config based on user requirement
        const config = {
            type: "kyc", 
            kyc: {
                collect: "manual", 
                type: "image", 
                video: { 
                    frame_rate: 30, 
                    duration: 60, 
                    file_name: "aic_kyc_video" 
                },
                get: ["faceStraight", "faceRight", "faceLeft"], 
                
                width: "100%", // Width relative to the container
                position: "top", 
                send_button: true, 
                switch_button: true,
                
                kyc_data: {
                    face: 4, 
                    gender: false, 
                    liveness: true, 
                    look_left: 20, 
                    look_right: 20, 
                    board_info: "frame" 
                }
            },
            brand: "An Tâm Việc Làm", 
            width: "100%", 
            video: "all", 
            
            // Callback function
            function: async function(res: any, location: any) {
                console.log("Kết quả KYC:", res);
                
                if (res && (Object.keys(res).length > 0)) {
                     setStatus('processing');
                     
                     try {
                         if (currentUser) {
                             // Save data to Firestore
                             await verifyUser(currentUser.uid, res);
                             
                             setStatus('success');
                             
                             // Wait a moment for the user to see the success message, then close
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
                    setError('Không nhận được dữ liệu xác minh hoặc người dùng đã hủy.');
                    setStatus('idle');
                }
            }
        };

        // IMPORTANT: Attach to the specific div inside this component, NOT "body".
        // This ensures that when React unmounts this modal, the camera UI is removed.
        aie_aic(containerId, config);

    } catch (e: any) {
        console.error("eKYC Init Error:", e);
        setError(`Không thể khởi động camera: ${e.message}`);
        setStatus('idle');
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 animate-fade-in"
        onClick={onClose}
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
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
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
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <p className="text-gray-600 mb-8 text-lg">
                        Vui lòng chuẩn bị quay các góc mặt (Thẳng, Trái, Phải) để xác thực tài khoản.
                    </p>
                    <button
                        onClick={startKYC}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] shadow-md text-lg"
                    >
                        Bắt đầu Camera
                    </button>
                </div>
            )}

            {/* Container for the 1AIE Camera Library */}
            <div 
                id="aic-component-container" 
                className={`w-full h-full min-h-[400px] bg-black rounded-xl overflow-hidden shadow-inner ${status === 'loading' || status === 'idle' || status === 'success' ? 'hidden' : 'block'}`}
            ></div>

            {status === 'loading' && (
                <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-600 font-semibold">Đang khởi động máy ảnh...</p>
                </div>
            )}

            {status === 'processing' && (
                 <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-green-600 font-bold text-lg">Đang xử lý dữ liệu...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-2xl font-bold text-green-600">Xác minh thành công!</p>
                    <p className="text-gray-500 mt-2">Đang quay lại hồ sơ...</p>
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
