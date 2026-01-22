
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
import ClockIcon from './icons/ClockIcon';
import TrashIcon from './icons/TrashIcon'; 
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Application } from '../types';
import { connectWallet, formatAddress, WalletState, getWalletBalance, WELFARE_FUND_ADDRESS } from '../services/blockchainService';
import { subscribeToApplicationsForEmployer, subscribeToApplicationsForWorker, addEmploymentLog } from '../services/applicationService';
import { updateUserWallet, getUserProfile } from '../services/userService';
import Spinner from './Spinner';
import EmployeeManagementModal from './EmployeeManagementModal';
import { useTranslation, Trans } from 'react-i18next';

// Local icon definition to avoid creating a new file
const WalletIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
    </svg>
);

interface BlockchainTransaction {
    hash: string;
    amount: string;
    type: 'deposit' | 'salary';
    date: Date;
    recipient?: string;
}

const InsuranceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, currentUserData, refetchUserData } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletState>({ address: null, balance: null, chainId: null, isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [latestHash, setLatestHash] = useState<string | null>(MOCK_INSURANCE_DATA.latestTxHash);
  
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [paymentRecipient, setPaymentRecipient] = useState<string | undefined>(undefined);
  const [paymentTitle, setPaymentTitle] = useState<string | undefined>(undefined);
  const [pendingEmployeePayment, setPendingEmployeePayment] = useState<Application | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Application | null>(null);
  
  const [employeeViewMode, setEmployeeViewMode] = useState<'active' | 'terminated'>('active');

  const additionalInsuranceProducts = [
    { 
      title: t('insurance_products.motor_civil.title'), 
      description: t('insurance_products.motor_civil.desc'), 
      link: 'https://motor-civil.globalcare.vn/293f4359&skip-password=1?token=2306244fxozgmotc', 
      icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
    },
    { 
        title: t('insurance_products.auto_civil.title'), 
        description: t('insurance_products.auto_civil.desc'), 
        link: 'https://oto-civil.globalcare.vn/293f4359?token=2306244fxozgmotc', 
        icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
    },
    { 
        title: t('insurance_products.auto_material.title'), 
        description: t('insurance_products.auto_material.desc'), 
        link: 'https://phydam.globalcare.vn/293f4359?token=2306244fxozgmotc', 
        icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
    },
    { 
        title: t('insurance_products.health.title'), 
        description: t('insurance_products.health.desc'), 
        link: 'https://globalcare.vn/products-hub?code=health&token=2306244fxozgmotc', 
        icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
    },
    { 
        title: t('insurance_products.cyber.title'), 
        description: t('insurance_products.cyber.desc'), 
        link: 'https://globalcare.vn/bao-hiem-an-ninh-mang?token=2306244fxozgmotc', 
        icon: <ShieldExclamationIcon className="w-7 h-7 text-blue-600" /> 
    },
    { 
        title: t('insurance_products.business.title'), 
        description: t('insurance_products.business.desc'), 
        link: 'https://globalcare.vn/bao-hiem-toan-dien-ho-kinh-doanh-ca-the?token=2306244fxozgmotc', 
        icon: <BuildingStorefrontIcon className="w-7 h-7 text-yellow-600" /> 
    },
    { 
        title: t('insurance_products.motor_rescue.title'), 
        description: t('insurance_products.motor_rescue.desc'), 
        link: 'https://globalcare.vn/dich-vu-cuu-ho-xe-may?token=2306244fxozgmotc', 
        icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
    },
    { 
        title: t('insurance_products.critical_disease.title'), 
        description: t('insurance_products.critical_disease.desc'), 
        link: 'https://critical-disease.globalcare.vn/b45306c2?token=2306244fxozgmotc', 
        icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
    },
    { 
        title: t('insurance_products.vib_care.title'), 
        description: t('insurance_products.vib_care.desc'), 
        link: 'https://vbi-care.globalcare.vn/293f4359?token=2306244fxozgmotc', 
        icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
    },
    { 
        title: t('insurance_products.private_home.title'), 
        description: t('insurance_products.private_home.desc'), 
        link: 'https://private-home.globalcare.vn/293f4359?token=2306244fxozgmotc', 
        icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
    },
    { 
        title: t('insurance_products.tomato.title'), 
        description: t('insurance_products.tomato.desc'), 
        link: 'https://tomato.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
        icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
    },
    { 
        title: t('insurance_products.home_care.title'), 
        description: t('insurance_products.home_care.desc'), 
        link: 'https://private-home.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
        icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
    },
    { 
        title: t('insurance_products.personal_accident.title'), 
        description: t('insurance_products.personal_accident.desc'), 
        link: 'https://personal-accident.globalcare.vn/293f4359?token=2306244fxozgmotc', 
        icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
    }
  ];

  const displayedEmployees = useMemo(() => {
      if (currentUserData?.userType === UserRole.Employer) {
          if (employeeViewMode === 'active') {
              return applications.filter(app => app.status === 'hired');
          } else {
              return applications.filter(app => app.status === 'terminated');
          }
      }
      return applications.filter(app => app.status === 'hired' || app.status === 'terminated');
  }, [applications, currentUserData, employeeViewMode]);

  useEffect(() => {
      const loadSavedWallet = async () => {
          if (currentUserData?.walletAddress) {
              try {
                  const balance = await getWalletBalance(currentUserData.walletAddress);
                  setWallet({
                      address: currentUserData.walletAddress,
                      balance: balance,
                      chainId: '80002', 
                      isConnected: true
                  });
              } catch (e) {
                  console.error("Failed to load wallet balance", e);
              }
          }
      };
      loadSavedWallet();
  }, [currentUserData]);

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
          if (walletData.address && currentUser) {
              await updateUserWallet(currentUser.uid, walletData.address);
              await refetchUserData(); 
          }
      } catch (error: any) {
          alert(error.message || t('common.error'));
      } finally {
          setIsConnecting(false);
      }
  };

  const handleDisconnectWallet = async () => {
      if (window.confirm(t('common.confirm'))) {
          if (currentUser) {
              await updateUserWallet(currentUser.uid, null);
              await refetchUserData();
          }
          setWallet({ address: null, balance: null, chainId: null, isConnected: false });
      }
  };

  const handleTransactionSuccess = async (hash: string, amount: string) => {
      setLatestHash(hash);
      setIsPaymentModalOpen(false);
      alert(`${t('payment.success')} Hash: ${hash}`);
      
      const newTx: BlockchainTransaction = {
          hash: hash,
          amount: amount,
          type: paymentRecipient ? 'salary' : 'deposit',
          date: new Date(),
          recipient: paymentRecipient
      };
      setTransactions(prev => [newTx, ...prev]);

      if (pendingEmployeePayment && paymentRecipient) {
          try {
              const amountVal = parseFloat(amount);
              await addEmploymentLog(
                  pendingEmployeePayment.id, 
                  'PAYMENT', 
                  t('payment.title_salary') + ' (Blockchain)', 
                  `Hash: ${formatAddress(hash)}`,
                  amountVal 
              );
              
              const insuranceAmount = amountVal * 0.1;
              await addEmploymentLog(
                  pendingEmployeePayment.id,
                  'PAYMENT',
                  'BHXH (Auto)',
                  `10% (${insuranceAmount.toFixed(4)} POL)`,
                  insuranceAmount
              );

          } catch (e) {
              console.error("Failed to log payment:", e);
          }
          setPendingEmployeePayment(null);
          setPaymentRecipient(undefined);
          setPaymentTitle(undefined);
      }
      
      if (wallet.address) {
          try {
            const newBalance = await getWalletBalance(wallet.address);
            setWallet(prev => ({ ...prev, balance: newBalance }));
          } catch (e) {
              console.error("Failed to update balance");
          }
      }
  };

  const initiateSalaryPayment = async (employee: Application, amount: number) => {
      let walletAddr = "";
      try {
          const workerProfile = await getUserProfile(employee.workerId);
          if (workerProfile && workerProfile.walletAddress) {
              walletAddr = workerProfile.walletAddress;
          }
      } catch (error) {
          console.error("Failed to fetch worker profile for wallet", error);
      }

      setPaymentRecipient(walletAddr);
      setPaymentTitle(t('employee_mgmt.pay_salary') + `: ${employee.workerName}`);
      setPendingEmployeePayment(employee);
      setIsPaymentModalOpen(true);
  };

  const handleOpenDepositModal = () => {
      setPaymentRecipient(undefined); 
      setPaymentTitle(t('insurance.deposit_fund'));
      setPendingEmployeePayment(null);
      setIsPaymentModalOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  // --- WORKER VIEW ---
  const renderWorkerView = () => (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                 <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CubeTransparentIcon className="w-7 h-7 text-indigo-600" />
                    {t('insurance.pension_book')}
                </h3>
                <p className="text-gray-500 text-sm mt-1">{t('insurance.pension_desc')}</p>
             </div>
            {!wallet.isConnected ? (
                <button 
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
                >
                    <WalletIcon className="w-4 h-4"/>
                    {isConnecting ? t('insurance.connecting') : t('insurance.connect_wallet')}
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200 shadow-sm">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-mono font-bold">{formatAddress(wallet.address!)}</span>
                    </div>
                    <button 
                        onClick={handleDisconnectWallet}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('insurance.disconnect')}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                            <ShieldCheckIcon className="w-5 h-5 text-green-300" />
                            <span className="font-bold text-xs tracking-wider uppercase text-indigo-100">Smart Contract</span>
                        </div>
                        <img src="https://cryptologos.cc/logos/polygon-matic-logo.png" alt="Polygon" className="w-8 h-8 opacity-90 filter brightness-200" />
                    </div>
                    
                    <p className="text-indigo-200 font-medium mb-1">{t('insurance.total_assets')}</p>
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm">
                        {wallet.isConnected && wallet.balance 
                            ? `${parseFloat(wallet.balance).toFixed(4)} POL` 
                            : formatCurrency(MOCK_INSURANCE_DATA.pensionBookTotal)
                        }
                    </p>
                    
                    <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-end">
                        <div className="text-xs">
                             <span className="text-indigo-300 block mb-1">{t('insurance.latest_tx')}</span>
                             <span className="text-white font-mono flex items-center gap-1 cursor-pointer hover:underline opacity-90 hover:opacity-100" title="View on Explorer">
                                {latestHash ? formatAddress(latestHash) : t('insurance.none')}
                                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                             </span>
                        </div>
                        <button 
                           onClick={handleOpenDepositModal}
                           className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-2 px-4 rounded-lg text-xs shadow-md transition-colors"
                        >
                          + {t('insurance.deposit_more')}
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-15 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-blue-400 opacity-20 rounded-full blur-2xl"></div>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6 z-10">
                       <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                           <TrophyIcon className="w-6 h-6 text-yellow-500" />
                           {t('insurance.reputation')}
                       </h3>
                       <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">SBT Token</span>
                  </div>
                  
                  <div className="flex-grow flex flex-col items-center justify-center py-2 z-10">
                      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 drop-shadow-sm">
                          {MOCK_INSURANCE_DATA.csrScore}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-sm text-green-700 font-bold bg-green-100 px-4 py-1.5 rounded-full">
                          <CheckBadgeIcon className="w-4 h-4" />
                          {t('insurance.very_reputable')}
                      </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 z-10 text-center">
                      <p className="text-xs text-gray-500">
                          {t('insurance.stored_on_chain')}
                      </p>
                  </div>
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
             </div>
        </div>

        {/* CURRENT JOBS */}
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BriefcaseIcon className="w-6 h-6 text-indigo-600" />
                {t('insurance.current_jobs')}
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
                                        {t('employee_mgmt.terminated')}
                                    </span>
                                ) : (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                        {t('employee_mgmt.official')}
                                    </span>
                                )}
                            </div>
                            
                            <div className="my-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">{t('insurance.table_score')}:</span>
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
                                <span>{t('insurance.started_at')}: {new Date(job.applicationDate).toLocaleDateString()}</span>
                                {job.status === 'terminated' ? (
                                    <span className="text-red-600 font-medium flex items-center gap-1">
                                        <ShieldExclamationIcon className="w-3 h-3" />
                                        {t('employee_mgmt.terminated')}
                                    </span>
                                ) : (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                        <CheckBadgeIcon className="w-3 h-3" />
                                        {t('insurance.filter_active')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                    <BriefcaseIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p>{t('insurance.no_jobs')}</p>
                </div>
            )}
        </div>
    </div>
  );

  // --- EMPLOYER VIEW ---
  const renderEmployerView = () => (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                 <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <HeartIcon className="w-7 h-7 text-red-500" />
                    {t('insurance.csr_title')}
                </h3>
                 <p className="text-gray-500 text-sm mt-1">{t('insurance.csr_desc')}</p>
             </div>
             {!wallet.isConnected ? (
                <button 
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
                >
                    <WalletIcon className="w-4 h-4"/>
                    {isConnecting ? t('insurance.connecting') : t('insurance.connect_fund_wallet')}
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl border border-purple-200 shadow-sm">
                        <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-mono font-bold">{formatAddress(wallet.address!)}</span>
                    </div>
                    <button 
                        onClick={handleDisconnectWallet}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('insurance.disconnect')}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                      <div>
                          <p className="text-orange-800 font-bold uppercase text-xs tracking-wider mb-1">{t('insurance.badge_subtitle')}</p>
                          <h3 className="text-2xl font-bold text-gray-800">{t('insurance.badge_title')}</h3>
                      </div>
                      <div className="bg-white p-2 rounded-full shadow-sm">
                          <CheckBadgeIcon className="w-8 h-8 text-yellow-500" />
                      </div>
                  </div>
                  
                  <div className="mt-6 flex items-end gap-2 relative z-10">
                       <span className="text-5xl font-extrabold text-orange-600">{displayedEmployees.length > 0 ? displayedEmployees.length : MOCK_INSURANCE_DATA.workersSupportedThisMonth}</span>
                       <span className="text-gray-600 font-medium mb-1">{t('insurance.workers_supported')}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 relative z-10">{t('insurance.workers_supported_suffix')}</p>
                  
                  <div className="mt-6 w-full bg-orange-200 rounded-full h-2 relative z-10">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-orange-700 mt-2 font-medium relative z-10">{t('insurance.top_employer')}</p>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                               <SparklesIcon className="w-6 h-6 text-indigo-600" />
                           </div>
                           <div>
                               <h3 className="font-bold text-gray-800">{t('insurance.welfare_fund')}</h3>
                               <p className="text-xs text-gray-500">
                                   {wallet.isConnected ? t('insurance.balance_onchain') : t('insurance.balance_available')}
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
                           {t('insurance.smart_contract_hint')}
                       </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                      <button 
                         onClick={handleOpenDepositModal}
                         className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                          + {t('insurance.deposit_fund')}
                      </button>
                  </div>
             </div>
        </div>

        {wallet.isConnected && transactions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-gray-500" />
                    {t('insurance.tx_history')}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-4 py-3">{t('insurance.tx_type')}</th>
                                <th className="px-4 py-3">{t('insurance.tx_amount')}</th>
                                <th className="px-4 py-3">{t('insurance.tx_hash')}</th>
                                <th className="px-4 py-3">{t('insurance.tx_time')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {tx.type === 'deposit' ? (
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">{t('insurance.tx_deposit')}</span>
                                        ) : (
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">{t('insurance.tx_salary')}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                                        -{tx.amount} POL
                                    </td>
                                    <td className="px-4 py-3">
                                        <a 
                                            href={`https://amoy.polygonscan.com/tx/${tx.hash}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-xs"
                                        >
                                            {formatAddress(tx.hash)}
                                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {tx.date.toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex gap-4">
             <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
             <div>
                 <h4 className="font-bold text-blue-900">{t('insurance.benefits_title')}</h4>
                 <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                     <Trans i18nKey="insurance.benefits_desc">
                        Các tin tuyển dụng... <strong>AI ưu tiên...</strong> ...
                     </Trans>
                 </p>
             </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-indigo-600" />
                        {t('insurance.staff')}
                    </h3>
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setEmployeeViewMode('active')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                employeeViewMode === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t('insurance.filter_active')}
                        </button>
                        <button
                            onClick={() => setEmployeeViewMode('terminated')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                employeeViewMode === 'terminated' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t('insurance.filter_history')}
                        </button>
                    </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${employeeViewMode === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {displayedEmployees.length} {employeeViewMode === 'active' ? t('insurance.table_employee') : t('insurance.filter_history')}
                </span>
            </div>
            
            <div className="overflow-x-auto">
                {isLoadingEmployees ? (
                    <div className="p-8"><Spinner /></div>
                ) : displayedEmployees.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('insurance.table_employee')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('insurance.table_job')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('insurance.table_score')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('insurance.table_manage')}</th>
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
                                        <div className="text-xs text-gray-400">{t('insurance.started_at')} {new Date(emp.applicationDate).toLocaleDateString()}</div>
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
                                            {t('insurance.manage_btn')}
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
                                ? t('insurance.no_staff_active') 
                                : t('insurance.no_staff_history')}
                        </p>
                        {employeeViewMode === 'active' && (
                            <p className="text-sm mt-1 text-gray-400">{t('insurance.check_applicants')}</p>
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('insurance.title')}</h2>
          <p className="text-lg text-gray-600">{t('insurance.subtitle')}</p>
        </div>

        {currentUserData?.userType === UserRole.Employer ? renderEmployerView() : renderWorkerView()}
        
        <div className="space-y-6 pt-6 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800">{t('insurance.supplementary_products')}</h3>
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
      
      {isPaymentModalOpen && (
          <PaymentModal 
            onClose={() => setIsPaymentModalOpen(false)} 
            walletConnected={wallet.isConnected}
            onTransactionSuccess={handleTransactionSuccess}
            recipientAddress={paymentRecipient}
            title={paymentTitle}
          />
      )}
      
      {selectedEmployee && (
          <EmployeeManagementModal 
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            onPay={(amount) => {
                setSelectedEmployee(null); 
                initiateSalaryPayment(selectedEmployee, amount); 
            }}
          />
      )}
    </>
  );
};

export default InsuranceDashboard;
