
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_INSURANCE_DATA } from '../constants';
import PaymentModal from './PaymentModal';
import SparklesIcon from './icons/SparklesIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';
import CarIcon from './icons/CarIcon';
import MotorcycleIcon from './icons/MotorcycleIcon';
import HeartIcon from './icons/HeartIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import CubeTransparentIcon from './icons/CubeTransparentIcon';
import TrophyIcon from './icons/TrophyIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import BuildingStorefrontIcon from './icons/BuildingStorefrontIcon';
import HomeIcon from './icons/HomeIcon';
import UsersIcon from './icons/UsersIcon';
import UserIcon from './icons/UserIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Application } from '../types';
import { connectWallet, formatAddress, WalletState, getWalletBalance } from '../services/blockchainService';
import { subscribeToApplicationsForEmployer, subscribeToApplicationsForWorker } from '../services/applicationService';
import Spinner from './Spinner';
import EmployeeManagementModal from './EmployeeManagementModal';

// Local icon definition to avoid creating a new file
const WalletIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
    </svg>
);

const additionalInsuranceProducts = [
  { 
    title: 'BH xe máy bắt buộc', 
    description: 'Bảo vệ trách nhiệm dân sự của bạn khi tham gia giao thông.', 
    link: 'https://motor-civil.globalcare.vn/293f4359&skip-password=1?token=2306244fxozgmotc', 
    icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH ô tô bắt buộc', 
    description: 'Yên tâm vững lái với bảo hiểm trách nhiệm dân sự cho ô tô.', 
    link: 'https://oto-civil.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH vật chất ô tô', 
    description: 'Bảo vệ toàn diện cho xế yêu trước mọi rủi ro va chạm, hư hỏng.', 
    link: 'https://phydam.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH sức khỏe', 
    description: 'Chăm sóc sức khỏe toàn diện cho bạn và gia đình.', 
    link: 'https://globalcare.vn/products-hub?code=health&token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH an ninh mạng', 
    description: 'Bảo vệ bạn khỏi các rủi ro và tấn công trên không gian mạng.', 
    link: 'https://globalcare.vn/bao-hiem-an-ninh-mang?token=2306244fxozgmotc', 
    icon: <ShieldExclamationIcon className="w-7 h-7 text-blue-600" /> 
  },
  { 
    title: 'BH toàn diện hộ kinh doanh', 
    description: 'An tâm kinh doanh với giải pháp bảo vệ tài sản và hoạt động.', 
    link: 'https://globalcare.vn/bao-hiem-toan-dien-ho-kinh-doanh-ca-the?token=2306244fxozgmotc', 
    icon: <BuildingStorefrontIcon className="w-7 h-7 text-yellow-600" /> 
  },
  { 
    title: 'BH cứu hộ xe máy 24/7', 
    description: 'Hỗ trợ kịp thời mọi lúc, mọi nơi khi xe bạn gặp sự cố.', 
    link: 'https://globalcare.vn/dich-vu-cuu-ho-xe-may?token=2306244fxozgmotc', 
    icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH bệnh hiểm nghèo', 
    description: 'Nguồn tài chính vững chắc giúp bạn vượt qua bệnh tật.', 
    link: 'https://critical-disease.globalcare.vn/b45306c2?token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH VIB care', 
    description: 'Gói chăm sóc sức khỏe cao cấp với nhiều quyền lợi vượt trội.', 
    link: 'https://vbi-care.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH nhà tư nhân', 
    description: 'Bảo vệ tổ ấm của bạn trước những rủi ro cháy, nổ, thiên tai.', 
    link: 'https://private-home.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
  },
  { 
    title: 'BH tai nạn Tomato', 
    description: 'Gói bảo hiểm tai nạn cá nhân linh hoạt, chi phí thấp.', 
    link: 'https://tomato.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
    icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
  },
  { 
    title: 'BH Home Care', 
    description: 'Bảo vệ toàn diện cho ngôi nhà và tài sản bên trong.', 
    link: 'https://private-home.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
    icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
  },
  { 
    title: 'BH tai nạn cá nhân', 
    description: 'An tâm trước mọi rủi ro không lường trước trong cuộc sống.', 
    link: 'https://personal-accident.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
  }
];


const InsuranceDashboard: React.FC = () => {
  const { currentUserData } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletState>({ address: null, balance: null, chainId: null, isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [latestHash, setLatestHash] = useState<string | null>(MOCK_INSURANCE_DATA.latestTxHash);

  // Employee Management State
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Application | null>(null);
  
  // Filter toggle for Employer
  const [employeeViewMode, setEmployeeViewMode] = useState<'active' | 'terminated'>('active');

  // Filter valid hired employees based on view mode
  const displayedEmployees = useMemo(() => {
      if (currentUserData?.userType === UserRole.Employer) {
          if (employeeViewMode === 'active') {
              return applications.filter(app => app.status === 'hired');
          } else {
              return applications.filter(app => app.status === 'terminated');
          }
      }
      // For workers, show both hired and terminated (as history)
      return applications.filter(app => app.status === 'hired' || app.status === 'terminated');
  }, [applications, currentUserData, employeeViewMode]);

  useEffect(() => {
    if (currentUserData) {
        setIsLoadingEmployees(true);
        let unsubscribe;
        if (currentUserData.userType === UserRole.Employer) {
            unsubscribe = subscribeToApplicationsForEmployer(currentUserData.uid, (apps) => {
                setApplications(apps);
                setIsLoadingEmployees(false);
            });
        } else {
             unsubscribe = subscribeToApplicationsForWorker(currentUserData.uid, (apps) => {
                setApplications(apps);
                setIsLoadingEmployees(false);
            });
        }
        return () => {
            if(unsubscribe) unsubscribe();
        }
    }
  }, [currentUserData]);

  const handleConnectWallet = async () => {
      setIsConnecting(true);
      try {
          const walletData = await connectWallet();
          setWallet(walletData);
      } catch (error: any) {
          alert(error.message || "Lỗi kết nối ví");
      } finally {
          setIsConnecting(false);
      }
  };

  const handleTransactionSuccess = async (hash: string) => {
      setLatestHash(hash);
      setIsPaymentModalOpen(false);
      alert(`Giao dịch thành công! Hash: ${hash}`);
      
      // Tự động cập nhật số dư mới sau giao dịch
      if (wallet.address) {
          try {
            const newBalance = await getWalletBalance(wallet.address);
            setWallet(prev => ({ ...prev, balance: newBalance }));
          } catch (e) {
              console.error("Failed to update balance");
          }
      }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  // --- GIAO DIỆN NGƯỜI LAO ĐỘNG (WORKER) ---
  const renderWorkerView = () => (
    <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                 <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CubeTransparentIcon className="w-7 h-7 text-indigo-600" />
                    Sổ Hưu Trí Blockchain
                </h3>
                <p className="text-gray-500 text-sm mt-1">An tâm tích lũy cho tương lai.</p>
             </div>
            {!wallet.isConnected ? (
                <button 
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
                >
                    <WalletIcon className="w-4 h-4"/>
                    {isConnecting ? 'Đang kết nối...' : 'Kết nối Ví'}
                </button>
            ) : (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono font-bold">{formatAddress(wallet.address!)}</span>
                </div>
            )}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Blockchain Pension Book */}
             <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                            <ShieldCheckIcon className="w-5 h-5 text-green-300" />
                            <span className="font-bold text-xs tracking-wider uppercase text-indigo-100">Smart Contract</span>
                        </div>
                        <img src="https://cryptologos.cc/logos/polygon-matic-logo.png" alt="Polygon" className="w-8 h-8 opacity-90 filter brightness-200" />
                    </div>
                    
                    <p className="text-indigo-200 font-medium mb-1">Tổng tài sản tích lũy</p>
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm">
                        {wallet.isConnected && wallet.balance 
                            ? `${parseFloat(wallet.balance).toFixed(4)} POL` 
                            : formatCurrency(MOCK_INSURANCE_DATA.pensionBookTotal)
                        }
                    </p>
                    
                    <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-end">
                        <div className="text-xs">
                             <span className="text-indigo-300 block mb-1">Hash giao dịch mới nhất</span>
                             <span className="text-white font-mono flex items-center gap-1 cursor-pointer hover:underline opacity-90 hover:opacity-100" title="Xem trên Blockchain Explorer">
                                {latestHash ? formatAddress(latestHash) : "Chưa có"}
                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                             </span>
                        </div>
                        <button 
                           onClick={() => setIsPaymentModalOpen(true)}
                           className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-2 px-4 rounded-lg text-xs shadow-md transition-colors"
                        >
                          + Nạp thêm
                        </button>
                    </div>
                </div>
                {/* Decoration Circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-15 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-blue-400 opacity-20 rounded-full blur-2xl"></div>
             </div>

             {/* Soulbound Token / Reputation Score */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6 z-10">
                       <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                           <TrophyIcon className="w-6 h-6 text-yellow-500" />
                           Uy tín nghề nghiệp
                       </h3>
                       <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">SBT Token</span>
                  </div>
                  
                  <div className="flex-grow flex flex-col items-center justify-center py-2 z-10">
                      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 drop-shadow-sm">
                          {MOCK_INSURANCE_DATA.csrScore}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-sm text-green-700 font-bold bg-green-100 px-4 py-1.5 rounded-full">
                          <CheckBadgeIcon className="w-4 h-4" />
                          Rất uy tín
                      </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 z-10 text-center">
                      <p className="text-xs text-gray-500">
                          Điểm số được lưu trữ vĩnh viễn trên Blockchain.
                      </p>
                  </div>
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
             </div>
        </div>

        {/* --- CURRENT JOBS SECTION (GRID VIEW) --- */}
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BriefcaseIcon className="w-6 h-6 text-indigo-600" />
                Công việc hiện tại & Lịch sử
            </h3>
            
            {isLoadingEmployees ? (
                <div className="p-8"><Spinner /></div>
            ) : displayedEmployees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayedEmployees.map((job) => (
                        <div key={job.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all p-5 flex flex-col ${job.status === 'terminated' ? 'opacity-80' : 'hover:border-indigo-300'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {job.employerProfileImageUrl ? (
                                        <img src={job.employerProfileImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                            <BuildingStorefrontIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{job.jobTitle}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-1">{job.employerName}</p>
                                    </div>
                                </div>
                                {job.status === 'terminated' ? (
                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                        Đã nghỉ
                                    </span>
                                ) : (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                        Chính thức
                                    </span>
                                )}
                            </div>
                            
                            <div className="my-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Điểm đánh giá:</span>
                                    <span className="font-bold text-indigo-600">{job.performanceScore || 50}/100</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div 
                                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" 
                                        style={{ width: `${job.performanceScore || 50}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span>Bắt đầu: {new Date(job.applicationDate).toLocaleDateString('vi-VN')}</span>
                                {job.status === 'terminated' ? (
                                    <span className="text-red-600 font-medium flex items-center gap-1">
                                        <ShieldExclamationIcon className="w-3 h-3" />
                                        Đã kết thúc
                                    </span>
                                ) : (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                        <CheckBadgeIcon className="w-3 h-3" />
                                        Đang làm việc
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                    <BriefcaseIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p>Bạn chưa có công việc chính thức nào.</p>
                </div>
            )}
        </div>
    </div>
  );

  // --- GIAO DIỆN NHÀ TUYỂN DỤNG (EMPLOYER) ---
  const renderEmployerView = () => (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                 <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <HeartIcon className="w-7 h-7 text-red-500" />
                    Trách Nhiệm Xã Hội (CSR)
                </h3>
                 <p className="text-gray-500 text-sm mt-1">Xây dựng thương hiệu doanh nghiệp vì cộng đồng.</p>
             </div>
             {!wallet.isConnected ? (
                <button 
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
                >
                    <WalletIcon className="w-4 h-4"/>
                    {isConnecting ? 'Đang kết nối...' : 'Kết nối Ví Quỹ'}
                </button>
            ) : (
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl border border-purple-200 shadow-sm">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono font-bold">{formatAddress(wallet.address!)}</span>
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* CSR Badge Card */}
             <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                      <div>
                          <p className="text-orange-800 font-bold uppercase text-xs tracking-wider mb-1">Doanh nghiệp vì cộng đồng</p>
                          <h3 className="text-2xl font-bold text-gray-800">Huy Hiệu An Sinh</h3>
                      </div>
                      <div className="bg-white p-2 rounded-full shadow-sm">
                          <CheckBadgeIcon className="w-8 h-8 text-yellow-500" />
                      </div>
                  </div>
                  
                  <div className="mt-6 flex items-end gap-2 relative z-10">
                       <span className="text-5xl font-extrabold text-orange-600">{displayedEmployees.length > 0 ? displayedEmployees.length : MOCK_INSURANCE_DATA.workersSupportedThisMonth}</span>
                       <span className="text-gray-600 font-medium mb-1">lao động</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 relative z-10">đã được bạn hỗ trợ đóng BHXH trong tháng này.</p>
                  
                  <div className="mt-6 w-full bg-orange-200 rounded-full h-2 relative z-10">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-orange-700 mt-2 font-medium relative z-10">Top 5% Doanh nghiệp uy tín trên nền tảng.</p>
             </div>

             {/* Welfare Fund Card */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                               <SparklesIcon className="w-6 h-6 text-indigo-600" />
                           </div>
                           <div>
                               <h3 className="font-bold text-gray-800">Quỹ Thưởng An Sinh</h3>
                               <p className="text-xs text-gray-500">
                                   {wallet.isConnected ? 'Số dư On-chain' : 'Số dư khả dụng'}
                               </p>
                           </div>
                       </div>
                  </div>

                  <div className="flex-grow flex flex-col justify-center">
                       <p className="text-3xl font-bold text-gray-900">
                            {wallet.isConnected && wallet.balance 
                                ? `${parseFloat(wallet.balance).toFixed(4)} POL` 
                                : formatCurrency(MOCK_INSURANCE_DATA.welfareFundBalance)
                            }
                       </p>
                       <p className="text-sm text-gray-500 mt-1">
                           Smart Contract sẽ tự động trích thưởng cho nhân viên từ ví này.
                       </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                      <button 
                         onClick={() => setIsPaymentModalOpen(true)}
                         className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                          + Nạp tiền vào quỹ (Blockchain)
                      </button>
                  </div>
             </div>
        </div>

        {/* Benefits Info */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex gap-4">
             <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
             <div>
                 <h4 className="font-bold text-blue-900">Lợi ích của Quỹ An Sinh</h4>
                 <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                     Các tin tuyển dụng từ doanh nghiệp có quỹ thưởng (Huy hiệu CSR) sẽ được <strong>AI ưu tiên hiển thị</strong> lên đầu trang tìm kiếm và tăng 40% tỷ lệ ứng tuyển.
                 </p>
             </div>
        </div>

        {/* --- EMPLOYEE MANAGEMENT SECTION --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-indigo-600" />
                        Nhân sự
                    </h3>
                    {/* Toggle Buttons */}
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setEmployeeViewMode('active')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                employeeViewMode === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Đang làm việc
                        </button>
                        <button
                            onClick={() => setEmployeeViewMode('terminated')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                employeeViewMode === 'terminated' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Lịch sử / Đã nghỉ
                        </button>
                    </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${employeeViewMode === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {displayedEmployees.length} {employeeViewMode === 'active' ? 'nhân viên' : 'hồ sơ'}
                </span>
            </div>
            
            <div className="overflow-x-auto">
                {isLoadingEmployees ? (
                    <div className="p-8"><Spinner /></div>
                ) : displayedEmployees.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nhân viên</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Công việc</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Điểm tín nhiệm</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Quản lý</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayedEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {emp.workerProfileImageUrl ? (
                                                <img src={emp.workerProfileImageUrl} alt="" className="h-10 w-10 rounded-full object-cover mr-3 border border-gray-200" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-500">
                                                    <UserIcon className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{emp.workerName}</div>
                                                <div className="text-xs text-gray-500">{emp.contactPhoneNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{emp.jobTitle}</div>
                                        <div className="text-xs text-gray-400">Từ {new Date(emp.applicationDate).toLocaleDateString('vi-VN')}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            (emp.performanceScore || 50) >= 80 ? 'bg-green-100 text-green-800' :
                                            (emp.performanceScore || 50) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {emp.performanceScore || 50}/100
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                                            className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors opacity-90 group-hover:opacity-100"
                                        >
                                            Chi tiết / Trả lương
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <UsersIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="font-medium">
                            {employeeViewMode === 'active' 
                                ? 'Chưa có nhân viên chính thức nào.' 
                                : 'Chưa có lịch sử nhân viên nghỉ việc.'}
                        </p>
                        {employeeViewMode === 'active' && (
                            <p className="text-sm mt-1 text-gray-400">Hãy xác nhận tuyển dụng trong phần Hồ Sơ &rarr; Ứng viên.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <>
      <div className="space-y-12 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Trung tâm An Sinh</h2>
          <p className="text-lg text-gray-600">Hệ sinh thái bảo vệ tương lai cho người lao động tự do.</p>
        </div>

        {/* Conditional Rendering based on Role */}
        {currentUserData?.userType === UserRole.Employer ? renderEmployerView() : renderWorkerView()}
        
        {/* Additional Insurance Section - Common for both */}
        <div className="space-y-6 pt-6 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800">Sản phẩm Bảo hiểm Bổ sung</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {additionalInsuranceProducts.map((product) => (
                  <a 
                    key={product.title}
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                       <div className="w-12 h-12 rounded-lg bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                          {product.icon}
                       </div>
                       <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="font-bold text-gray-800 mt-4 group-hover:text-indigo-700 transition-colors">{product.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  </a>
                ))}
            </div>
        </div>
      </div>
      
      {/* Modals */}
      {isPaymentModalOpen && (
          <PaymentModal 
            onClose={() => setIsPaymentModalOpen(false)} 
            walletConnected={wallet.isConnected}
            onTransactionSuccess={handleTransactionSuccess}
          />
      )}
      
      {selectedEmployee && (
          <EmployeeManagementModal 
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            onPay={() => {
                setSelectedEmployee(null); // Close management modal
                setIsPaymentModalOpen(true); // Open payment modal
            }}
          />
      )}
    </>
  );
};

export default InsuranceDashboard;
