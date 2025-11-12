import React from 'react';
import XIcon from './icons/XIcon';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface PaymentModalProps {
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose }) => {
  const officialLink = "https://dichvucong.baohiemxahoi.gov.vn/#/index?login=1&url=%2Fthanh-toan-bhxh-dien-tu%2Fngan-hang-lien-ket&queryUrl=";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative animate-fade-in-up"
        style={{ animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Đóng"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Chuyển đến Cổng Dịch vụ công</h2>
          <p className="text-sm text-gray-600 mt-2">
            Bạn sẽ được chuyển hướng đến trang web chính thức của Bảo hiểm Xã hội Việt Nam để thực hiện thanh toán một cách an toàn.
          </p>
          
          <a
            href={officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full inline-flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 shadow-sm"
          >
            Tiếp tục đến trang thanh toán
            <ArrowTopRightOnSquareIcon className="w-5 h-5 ml-2" />
          </a>
          
          <p className="text-xs text-gray-500 mt-4">
            Lưu ý: Bạn sẽ cần đăng nhập vào tài khoản BHXH của mình trên cổng dịch vụ công.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;