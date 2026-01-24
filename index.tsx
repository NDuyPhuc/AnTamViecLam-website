
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './i18n'; // Import cấu hình i18n

// --- KHẮC PHỤC LỖI MÀN HÌNH TRẮNG SAU KHI DEPLOY ---
// Khi Vercel build bản mới, tên file JS thay đổi. Nếu user đang cache file cũ, 
// trình duyệt sẽ báo lỗi 404 (ChunkLoadError). Đoạn code này bắt lỗi đó và reload trang.
window.addEventListener('error', (e) => {
  const message = e.message?.toLowerCase() || '';
  if (
    message.includes('loading chunk') || 
    message.includes('unexpected token') ||
    message.includes('404')
  ) {
    console.error('Phát hiện lỗi phiên bản cũ, đang tải lại trang...', e);
    // Dùng location.reload(true) để ép buộc trình duyệt bỏ qua cache
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
