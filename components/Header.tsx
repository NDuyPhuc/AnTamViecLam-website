
import React, { useState, useEffect } from 'react';
import { View, UserRole, Notification } from '../types';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import BellIcon from './icons/BellIcon';
import SparklesIcon from './icons/SparklesIcon';
import NotificationsPanel from './NotificationsPanel';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../services/notificationService';
import { subscribeToConversations } from '../services/messagingService';
import BriefcaseIconSolid from './icons/BriefcaseIconSolid';
import ShieldCheckIconSolid from './icons/ShieldCheckIconSolid';
import PaperAirplaneIconSolid from './icons/PaperAirplaneIconSolid';
import ChatBubbleIconSolid from './icons/ChatBubbleIconSolid';
import UserCircleIconSolid from './icons/UserCircleIconSolid';
import SparklesIconSolid from './icons/SparklesIconSolid';
import LanguageSwitcher from './LanguageSwitcher'; 
import { useTranslation } from 'react-i18next'; 

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onPostJobClick: () => void;
  onNotificationNavigate: (link: string) => void;
}

const MobileNavItem: React.FC<{
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    hasUnread?: boolean;
}> = ({ icon, activeIcon, label, isActive, onClick, hasUnread = false }) => {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center space-y-1 w-full p-2 rounded-lg transition-colors duration-200 ${
                isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-100'
            }`}
        >
            {isActive ? activeIcon : icon}
            <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
            {hasUnread && (
              <span className="absolute top-1 right-3 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
            )}
        </button>
    );
};

const DesktopNavItem: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    hasUnread?: boolean;
}> = ({ label, isActive, onClick, hasUnread = false }) => {
    return (
        <button
            onClick={onClick}
            className={`relative px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-gray-600 hover:text-indigo-600 font-medium'
            }`}
        >
            {label}
            {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-indigo-600 rounded-full"></span>}
            {hasUnread && (
                 <span className="absolute top-1 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
            )}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onPostJobClick, onNotificationNavigate }) => {
  const { currentUser, currentUserData, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showKycAlert, setShowKycAlert] = useState(false); // State hiển thị modal cảnh báo KYC
  
  const { t } = useTranslation(); 

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
      if (currentUser) {
          const unsubscribeNotifications = subscribeToNotifications(currentUser.uid, setNotifications);
          
          const unsubscribeConversations = subscribeToConversations(currentUser.uid, (convos) => {
            const totalUnread = convos.reduce((acc, convo) => {
              return acc + (convo.unreadCounts?.[currentUser.uid] || 0);
            }, 0);
            setUnreadMessageCount(totalUnread);
          });

          return () => {
            unsubscribeNotifications();
            unsubscribeConversations();
          }
      }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    onNotificationNavigate(notification.link);
    setIsNotificationsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    if (currentUser) {
      markAllNotificationsAsRead(currentUser.uid, notifications);
    }
  };

  // Hàm kiểm tra KYC trước khi cho phép đăng tin
  const handlePostJobCheck = () => {
      // Yêu cầu bảo mật: Chỉ trạng thái 'verified' mới được đăng tin
      if (currentUserData?.kycStatus !== 'verified') {
          // Thay vì alert(), bật modal cảnh báo
          setShowKycAlert(true);
          return;
      }
      onPostJobClick();
  };


  let navItems = [
    { view: View.Jobs, label: t('nav.jobs'), icon: <BriefcaseIcon className="w-6 h-6" />, activeIcon: <BriefcaseIconSolid className="w-6 h-6" /> },
    { view: View.Insurance, label: t('nav.insurance'), icon: <ShieldCheckIcon className="w-6 h-6" />, activeIcon: <ShieldCheckIconSolid className="w-6 h-6" /> },
    { view: View.Messaging, label: t('nav.messaging'), icon: <PaperAirplaneIcon className="w-6 h-6" />, activeIcon: <PaperAirplaneIconSolid className="w-6 h-6" />, hasUnread: unreadMessageCount > 0 },
    { view: View.Chatbot, label: t('nav.chatbot'), icon: <ChatBubbleIcon className="w-6 h-6" />, activeIcon: <ChatBubbleIconSolid className="w-6 h-6" /> },
    { view: View.Profile, label: t('nav.profile'), icon: <UserCircleIcon className="w-6 h-6" />, activeIcon: <UserCircleIconSolid className="w-6 h-6" /> },
  ];

  if (currentUserData?.userType === UserRole.Worker) {
      navItems.splice(1, 0, { 
          view: View.Recommendations, 
          label: t('nav.ai_suggest'), 
          icon: <SparklesIcon className="w-6 h-6" />, 
          activeIcon: <SparklesIconSolid className="w-6 h-6" /> 
      });
  }

  return (
    <>
      {/* --- Desktop & Tablet Header --- */}
      <header className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-10">
                  <button onClick={() => setActiveView(View.Jobs)} className="flex items-center flex-shrink-0 group">
                      <img 
                        src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" 
                        alt="An Tâm Việc Làm Logo" 
                        className="h-10 w-10 rounded-full object-cover group-hover:opacity-90 transition-opacity" 
                      />
                      <h1 className="ml-3 text-2xl font-bold text-gray-800">{t('app_name')}</h1>
                  </button>
                  <nav className="flex items-baseline space-x-2 lg:space-x-4">
                       {navItems.map(item => (
                          <DesktopNavItem 
                              key={item.view} 
                              label={item.label} 
                              isActive={activeView === item.view} 
                              onClick={() => setActiveView(item.view)}
                              hasUnread={item.hasUnread}
                          />
                      ))}
                  </nav>
              </div>

              <div className="flex items-center space-x-4">
                  <LanguageSwitcher />

                  {currentUser && currentUserData && (
                      <>
                          {currentUserData.userType === UserRole.Employer && (
                              <button 
                                onClick={handlePostJobCheck}
                                className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                                  {t('nav.post_job')}
                              </button>
                          )}

                          <div className="relative">
                              <button
                                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                  aria-label="Thông báo"
                              >
                                  <BellIcon />
                                  {unreadNotificationCount > 0 && (
                                      <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                                  )}
                              </button>
                          </div>

                          <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600 text-right hidden lg:block">
                                {t('nav.hello')}, <span className="font-semibold">{currentUserData.fullName || currentUser.email}</span>
                              </span>
                              {currentUserData.profileImageUrl ? (
                                  <img src={currentUserData.profileImageUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                     <UserCircleIcon className="w-6 h-6 text-gray-500" />
                                  </div>
                              )}
                          </div>
                          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                              {t('common.logout')}
                          </button>
                      </>
                  )}
              </div>
          </div>
        </div>
      </header>
      
       {/* --- Mobile Bottom Nav --- */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto px-2">
                <nav className={`grid grid-cols-${navItems.length} gap-1 h-full items-center p-1.5`}>
                    {navItems.map(item => (
                        <MobileNavItem 
                            key={item.view}
                            icon={item.icon}
                            activeIcon={item.activeIcon}
                            label={item.label} 
                            isActive={activeView === item.view} 
                            onClick={() => setActiveView(item.view)}
                            hasUnread={item.hasUnread}
                        />
                    ))}
                </nav>
            </div>
       </div>
       
       {/* Mobile Header Top */}
       <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur shadow-sm px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
                 <img src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" className="w-8 h-8 rounded-full mr-2"/>
                 <h1 className="font-bold text-gray-800 text-sm">{t('app_name')}</h1>
            </div>
            <div className="flex items-center gap-3">
                <LanguageSwitcher />
                {currentUser && (
                    <button
                        onClick={() => setIsNotificationsOpen(prev => !prev)}
                        className="relative p-1"
                    >
                        <BellIcon className="w-6 h-6 text-gray-600" />
                        {unreadNotificationCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                    </button>
                )}
            </div>
       </div>
       
       {/* --- Mobile FAB for Posting Job --- */}
       {currentUser && currentUserData?.userType === UserRole.Employer && (
         <div className="md:hidden fixed bottom-20 right-4 z-50">
           <button
             onClick={handlePostJobCheck}
             className="bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             aria-label={t('nav.post_job')}
           >
             <PlusCircleIcon className="w-8 h-8" />
           </button>
         </div>
       )}

       {isNotificationsOpen && (
           <NotificationsPanel
               notifications={notifications}
               onNotificationClick={handleNotificationClick}
               onMarkAllAsRead={handleMarkAllAsRead}
               onClose={() => setIsNotificationsOpen(false)}
           />
       )}

       {/* --- KYC Requirement Modal --- */}
       {showKycAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowKycAlert(false)}></div>
           <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative z-10 animate-fade-in-up transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                  <ShieldCheckIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{t('kyc.title')}</h3>
              <p className="text-center text-gray-600 text-sm mb-6 leading-relaxed px-2">
                  {t('post_job.kyc_required_alert')}
              </p>
              <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                        setShowKycAlert(false);
                        setActiveView(View.Profile);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    {t('profile.kyc_resubmit').replace('Gửi lại', 'Đến')} 
                    <span className="text-lg">→</span>
                  </button>
                  <button 
                    onClick={() => setShowKycAlert(false)}
                    className="w-full py-3 bg-white text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    {t('common.close')}
                  </button>
              </div>
           </div>
        </div>
       )}
    </>
  );
};

export default Header;
