
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import ArrowLeftIcon from '../icons/ArrowLeftIcon';

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" xmlns="http://www.w.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.317-11.284-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 34.423 44 29.836 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);


const AuthPage: React.FC<{ onBackToLanding: () => void }> = ({ onBackToLanding }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Worker);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, login, loginWithGoogle } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu không khớp.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, role);
      }
      // On successful login/signup, the App component will automatically re-render
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Không tìm thấy tài khoản với email này.');
          break;
        case 'auth/wrong-password':
          setError('Sai mật khẩu. Vui lòng thử lại.');
          break;
        case 'auth/email-already-in-use':
          setError('Email này đã được sử dụng.');
          break;
        case 'auth/weak-password':
          setError('Mật khẩu phải có ít nhất 6 ký tự.');
          break;
        case 'auth/popup-closed-by-user':
          setError('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
          break;
        default:
          setError('Đã xảy ra lỗi. Vui lòng thử lại.');
          break;
      }
    } finally {
        setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
      setError('');
      setGoogleLoading(true);
      try {
          await loginWithGoogle();
      } catch (err: any) {
         switch (err.code) {
            case 'auth/popup-closed-by-user':
              setError('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
              break;
            default:
              setError('Đăng nhập với Google thất bại. Vui lòng thử lại.');
              break;
         }
         // Set loading to false only in case of error, as success will trigger a page reload
         setGoogleLoading(false);
      } 
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 animate-fade-in relative">
       <button 
          onClick={onBackToLanding} 
          className="absolute top-6 left-6 flex items-center text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2 text-gray-500 group-hover:text-indigo-600" />
          Quay lại trang chủ
        </button>
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl border border-gray-100 p-8 space-y-6">
        <div className="flex flex-col items-center">
          <img 
            src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" 
            alt="An Tâm Việc Làm Logo" 
            className="h-24 w-24 rounded-full object-cover mb-2 shadow-md" 
          />
          <h1 className="mt-3 text-3xl font-bold text-gray-800 text-center">Chào mừng đến<br/>An Tâm Việc Làm</h1>
          <p className="text-gray-600 mt-2">{isLogin ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới'}</p>
        </div>
        
        <div className="space-y-4">
            <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full flex justify-center items-center bg-white text-gray-700 font-semibold py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:bg-gray-200 transition-colors"
            >
                {googleLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang chuyển hướng...
                    </>
                ) : (
                    <>
                        <GoogleIcon /> Đăng nhập với Google
                    </>
                )}
            </button>
        </div>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">HOẶC</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          {!isLogin && (
            <>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Bạn là:</span>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="role" value={UserRole.Worker} checked={role === UserRole.Worker} onChange={() => setRole(UserRole.Worker)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"/>
                    <span className="text-gray-700">Người lao động</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="role" value={UserRole.Employer} checked={role === UserRole.Employer} onChange={() => setRole(UserRole.Employer)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"/>
                    <span className="text-gray-700">Nhà tuyển dụng</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <p className="text-center text-sm">
          {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
