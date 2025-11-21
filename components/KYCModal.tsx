
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

  // Cleanup function to remove the AI container safely
  const cleanupAI = () => {
    if (aiContainerRef.current && document.body.contains(aiContainerRef.current)) {
        try {
            document.body.removeChild(aiContainerRef.current);
        } catch (e) {
            console.warn("Failed to remove AI container:", e);
        }
        aiContainerRef.current = null;
    }
  };

  // Ensure cleanup happens on unmount
  useEffect(() => {
    return () => {
        cleanupAI();
    };
  }, []);

  const loadJQuery = (): Promise<void> => {
      return new Promise((resolve, reject) => {
          if ((window as any).jQuery || (window as any).$) {
              resolve();
              return;
          }
          const script = document.createElement('script');
          script.src = "https://code.jquery.com/jquery-3.6.0.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Không thể tải jQuery."));
          document.body.appendChild(script);
      });
  };

  const loadScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
          if ((window as any).aie_aic) {
              resolve();
              return;
          }
          
          // Kiểm tra xem script đã tồn tại trong DOM chưa
          const existingScript = document.querySelector('script[src*="api.1aie.com"]');
          if (existingScript) {
              resolve(); 
              return;
          }

          const script = document.createElement('script');
          // Sử dụng key chính xác từ file xác thực
          script.src = "https://api.1aie.com/?key=5e28838e59319365a1e71bd72958139e&active=aic";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Không thể tải thư viện eKYC."));
          document.body.appendChild(script);
      });
  };

  const startKYC = async () => {
    setError('');
    setStatus('loading');

    try {
        // 1. Tải jQuery trước (Bắt buộc cho 1AIE)
        await loadJQuery();

        // 2. Tải thư viện 1AIE
        await loadScript();

        // Allow UI to update and library to parse
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if the library is loaded
        const aie_aic = (window as any).aie_aic;
        if (typeof aie_aic !== 'function') {
            throw new Error('Thư viện eKYC chưa sẵn sàng. Vui lòng thử lại.');
        }

        // 3. Create a clean, isolated container directly on document.body
        // Using a unique ID prevents conflicts with previous instances
        const containerId = `aic-portal-${Date.now()}`;
        const div = document.createElement('div');
        div.id = containerId;
        
        // Force styles to ensure visibility and overlay correctly
        Object.assign(div.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '99999', // Highest priority
            backgroundColor: '#000',
            display: 'block'
        });
        
        document.body.appendChild(div);
        aiContainerRef.current = div;

        // 4. Minimal Configuration for Stability
        const config = {
            type: "kyc", 
            kyc: {
                collect: "manual", 
                type: "image", 
                // Simplified video config
                video: { frame_rate: 30, duration: 30, file_name: "aic_kyc_video" },
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
            
            // Callback function
            function: async function(res: any, location: any) {
                console.log("eKYC Result:", res);
                
                // Hide container immediately to show processing UI
                if (div) div.style.display = 'none';
                
                if (res && Object.keys(res).length > 0) {
                     setStatus('processing');
                     try {
                         if (currentUser) {
                             await verifyUser(currentUser.uid, res);
                             setStatus('success');
                             cleanupAI(); 
                             setTimeout(() => { onSuccess(); }, 2000);
                         } else {
                             throw new Error("User session invalid");
                         }
                     } catch (err) {
                         console.error("Verification save failed:", err);
                         setError('Lỗi khi lưu kết quả xác minh. Vui lòng thử lại.');
                         setStatus('idle');
                         cleanupAI();
                     }
                } else {
                    // User closed or cancelled
                    console.log("eKYC cancelled or empty result");
                    cleanupAI();
                    setStatus('idle');
                }
            }
        };

        // 5. Initialize Library
        console.log("Initializing 1AIE on container:", containerId);
        aie_aic(containerId, config);

    } catch (e: any) {
        console.error("eKYC Start Error:", e);
        setError(`Lỗi: ${e.message || 'Không thể khởi động camera'}`);
        setStatus('idle');
        cleanupAI();
    }
  };

  const handleClose = () => {
      if (status === 'processing') return; // Prevent closing while saving
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
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 w-full text-center border border-red-100 animate-fade-in">
                    {error}
                </div>
            )}

            {status === 'idle' && (
                <div className="text-center max-w-md animate-fade-in-up">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Xác thực khuôn mặt AI</h3>
                    <p className="text-gray-600 mb-8 text-base">
                        Hệ thống sẽ sử dụng camera để xác minh danh tính của bạn. Quá trình này diễn ra nhanh chóng và bảo mật.
                    </p>
                    <button
                        onClick={startKYC}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] shadow-md text-lg flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Bắt đầu Xác minh
                    </button>
                </div>
            )}

            {status === 'loading' && (
                <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h4 className="text-xl font-bold text-indigo-600">Đang tải & khởi động...</h4>
                    <p className="text-gray-500 mt-2 max-w-xs">Vui lòng chọn <strong>"Cho phép" (Allow)</strong> nếu trình duyệt yêu cầu quyền truy cập camera.</p>
                </div>
            )}

            {status === 'processing' && (
                 <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h4 className="text-xl font-bold text-green-600">Đang xử lý dữ liệu...</h4>
                    <p className="text-gray-500 mt-2">Hệ thống đang phân tích hình ảnh. Vui lòng không tắt trình duyệt.</p>
                </div>
            )}

            {status === 'success' && (
                <div className="absolute inset-0 bg-white z-30 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Xác minh thành công!</h3>
                    <p className="text-gray-500">Hồ sơ của bạn đã được chứng thực.</p>
                </div>
            )}
        </div>
        <div className="p-3 border-t bg-gray-50 text-center text-xs text-gray-400">
             Powered by 1AIE Smart AI Technology
        </div>
      </div>
    </div>
  );
};

export default KYCModal;
