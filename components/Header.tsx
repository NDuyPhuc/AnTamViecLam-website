
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
import PhotoIcon from './icons/PhotoIcon'; // Import
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
import PhotoIconSolid from './icons/PhotoIconSolid'; // Import
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
            className={`relative flex flex-col items-center justify-center space-y-1 w-full p-2 rounded-2xl transition-all duration-300 ${
                isActive ? 'text-indigo-600 bg-indigo-50/80' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
            {isActive ? activeIcon : icon}
            <span className={`text-[10px] text-center leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
            {hasUnread && (
              <span className="absolute top-1 right-3 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white ring-1 ring-white"></span>
            )}
        </button>
    );
};

// Cập nhật: Thêm icon vào desktop, style dạng Pill (viên thuốc) OS-like
const DesktopNavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    hasUnread?: boolean;
}> = ({ label, icon, activeIcon, isActive, onClick, hasUnread = false }) => {
    return (
        <button
            onClick={onClick}
            className={`
                group relative flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm transition-all duration-300 ease-out border whitespace-nowrap
                active:scale-95 select-none
                ${isActive 
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700 font-bold shadow-sm' 
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium'
                }
            `}
        >
            <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {isActive ? activeIcon : icon}
            </span>
            <span>{label}</span>
            
            {hasUnread && (
                 <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white shadow-sm"></span>
            )}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onPostJobClick, onNotificationNavigate }) => {
  const { currentUser, currentUserData, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showKycAlert, setShowKycAlert] = useState(false); 
  
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

  const handlePostJobCheck = () => {
      if (currentUserData?.kycStatus !== 'verified') {
          setShowKycAlert(true);
          return;
      }
      onPostJobClick();
  };


  let navItems = [
    { view: View.Jobs, label: t('nav.jobs'), icon: <BriefcaseIcon className="w-5 h-5" />, activeIcon: <BriefcaseIconSolid className="w-5 h-5" /> },
    { view: View.Insurance, label: t('nav.insurance'), icon: <ShieldCheckIcon className="w-5 h-5" />, activeIcon: <ShieldCheckIconSolid className="w-5 h-5" /> },
    { view: View.Messaging, label: t('nav.messaging'), icon: <PaperAirplaneIcon className="w-5 h-5" />, activeIcon: <PaperAirplaneIconSolid className="w-5 h-5" />, hasUnread: unreadMessageCount > 0 },
    { view: View.Chatbot, label: t('nav.chatbot'), icon: <ChatBubbleIcon className="w-5 h-5" />, activeIcon: <ChatBubbleIconSolid className="w-5 h-5" /> },
    { view: View.AIImages, label: t('nav.ai_images'), icon: <PhotoIcon className="w-5 h-5" />, activeIcon: <PhotoIconSolid className="w-5 h-5" /> },
    { view: View.Profile, label: t('nav.profile'), icon: <UserCircleIcon className="w-5 h-5" />, activeIcon: <UserCircleIconSolid className="w-5 h-5" /> },
  ];

  if (currentUserData?.userType === UserRole.Worker) {
      // Insert Recommendations after Insurance
      navItems.splice(1, 0, { 
          view: View.Recommendations, 
          label: t('nav.ai_suggest'), 
          icon: <SparklesIcon className="w-5 h-5" />, 
          activeIcon: <SparklesIconSolid className="w-5 h-5" /> 
      });
  }

  return (
    <>
      <header className="hidden md:block sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
              <div className="flex items-center space-x-2 lg:space-x-8 flex-shrink">
                  <button onClick={() => setActiveView(View.Jobs)} className="flex items-center flex-shrink-0 group focus:outline-none mr-2 lg:mr-0">
                      <img 
                        src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" 
                        alt="Logo" 
                        className="h-8 w-8 lg:h-10 lg:w-10 rounded-xl object-cover group-hover:opacity-90 transition-all shadow-sm group-hover:shadow-md" 
                      />
                      <h1 className="ml-2 lg:ml-3 text-lg lg:text-xl font-extrabold text-gray-800 tracking-tight group-hover:text-indigo-600 transition-colors whitespace-nowrap hidden xl:block">{t('app_name')}</h1>
                  </button>
                  <nav className="flex items-center space-x-0.5 lg:space-x-1 p-1 bg-gray-50/50 rounded-full border border-gray-100 overflow-x-auto scrollbar-hide max-w-[60vw] lg:max-w-none">
                       {navItems.map(item => (
                          <DesktopNavItem 
                              key={item.view} 
                              label={item.label} 
                              icon={item.icon}
                              activeIcon={item.activeIcon}
                              isActive={activeView === item.view} 
                              onClick={() => setActiveView(item.view)}
                              hasUnread={item.hasUnread}
                          />
                      ))}
                  </nav>
              </div>

              <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0 ml-2">
                  <LanguageSwitcher />

                  {currentUser && currentUserData && (
                      <>
                          {currentUserData.userType === UserRole.Employer && (
                              <button 
                                onClick={handlePostJobCheck}
                                className="flex items-center gap-1.5 lg:gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-2 px-3 lg:py-2.5 lg:px-5 rounded-full hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 whitespace-nowrap"
                              >
                                  <PlusCircleIcon className="w-5 h-5" />
                                  <span className="hidden lg:inline">{t('nav.post_job')}</span>
                                  <span className="lg:hidden text-xs">Đăng tin</span>
                              </button>
                          )}

                          <div className="relative">
                              <button
                                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                                  className={`p-2 lg:p-2.5 rounded-full transition-all duration-200 ${isNotificationsOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                                  aria-label="Thông báo"
                              >
                                  <BellIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                                  {unreadNotificationCount > 0 && (
                                      <span className="absolute top-2 right-2 block h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full bg-red-500 border-2 border-white ring-1 ring-white"></span>
                                  )}
                              </button>
                          </div>

                          <div className="h-6 lg:h-8 w-px bg-gray-200 mx-1 lg:mx-2"></div>

                          <div className="flex items-center gap-2 lg:gap-3 pl-1">
                              <div className="text-right hidden xl:block">
                                <p className="text-xs text-gray-500 font-medium">{t('nav.hello')}</p>
                                <p className="text-sm font-bold text-gray-800 leading-none max-w-[120px] truncate">{currentUserData.fullName || currentUser.email}</p>
                              </div>
                              <div className="relative group cursor-pointer flex-shrink-0">
                                {currentUserData.profileImageUrl ? (
                                    <img src={currentUserData.profileImageUrl} alt="Avatar" className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-all" />
                                ) : (
                                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                                       <UserCircleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-500" />
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-green-500 border-2 border-white rounded-full"></div>
                              </div>
                              
                              <button 
                                onClick={handleLogout} 
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors hidden sm:block"
                                title={t('common.logout')}
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                  </svg>
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
        </div>
      </header>
      
       <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 pb-safe">
            <div className="max-w-7xl mx-auto px-2">
                <nav className={`grid grid-cols-${navItems.length} gap-1 h-full items-center p-2`}>
                    {navItems.map(item => (
                        <MobileNavItem 
                            key={item.view}
                            icon={React.cloneElement(item.icon as React.ReactElement, { className: "w-6 h-6" })}
                            activeIcon={React.cloneElement(item.activeIcon as React.ReactElement, { className: "w-6 h-6" })}
                            label={item.label} 
                            isActive={activeView === item.view} 
                            onClick={() => setActiveView(item.view)}
                            hasUnread={item.hasUnread}
                        />
                    ))}
                </nav>
            </div>
       </div>
       
       <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md shadow-sm px-4 py-3 flex justify-between items-center border-b border-gray-100 pt-safe">
            <div className="flex items-center">
                 <img src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" className="w-9 h-9 rounded-xl mr-2 shadow-sm"/>
                 <h1 className="font-extrabold text-gray-800 text-base tracking-tight">{t('app_name')}</h1>
            </div>
            <div className="flex items-center gap-3">
                <LanguageSwitcher />
                {currentUser && (
                    <button
                        onClick={() => setIsNotificationsOpen(prev => !prev)}
                        className="relative p-2 bg-gray-50 rounded-full active:scale-95 transition-transform"
                    >
                        <BellIcon className="w-6 h-6 text-gray-600" />
                        {unreadNotificationCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                    </button>
                )}
            </div>
       </div>
       
       {currentUser && currentUserData?.userType === UserRole.Employer && (
         <div className="md:hidden fixed bottom-24 right-4 z-50">
           <button
             onClick={handlePostJobCheck}
             className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-indigo-300/50 hover:scale-105 active:scale-95 transition-all duration-300"
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

       {showKycAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowKycAlert(false)}></div>
           <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full relative z-10 animate-fade-in-up transform transition-all scale-100 border border-gray-100">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow ring-8 ring-red-50/50">
                  <ShieldCheckIcon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{t('kyc.title')}</h3>
              <p className="text-center text-gray-500 text-sm mb-8 leading-relaxed px-2">
                  {t('post_job.kyc_required_alert')}
              </p>
              <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                        setShowKycAlert(false);
                        setActiveView(View.Profile);
                    }}
                    className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {t('post_job.go_to_profile')}
                    <span className="text-lg">→</span>
                  </button>
                  <button 
                    onClick={() => setShowKycAlert(false)}
                    className="w-full py-3.5 bg-white text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-colors border-2 border-gray-100 active:scale-95"
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
