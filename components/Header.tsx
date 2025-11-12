import React, { useState, useEffect } from 'react';
import { View, UserRole, Notification } from '../types';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import BellIcon from './icons/BellIcon';
import NotificationsPanel from './NotificationsPanel';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../services/notificationService';
import { subscribeToConversations } from '../services/messagingService';
import BriefcaseIconSolid from './icons/BriefcaseIconSolid';
import ShieldCheckIconSolid from './icons/ShieldCheckIconSolid';
import PaperAirplaneIconSolid from './icons/PaperAirplaneIconSolid';
import ChatBubbleIconSolid from './icons/ChatBubbleIconSolid';
import UserCircleIconSolid from './icons/UserCircleIconSolid';

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
                isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
            {isActive ? activeIcon : icon}
            <span className="text-xs font-medium">{label}</span>
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


  const navItems = [
    { view: View.Jobs, label: 'Tìm Việc', icon: <BriefcaseIcon className="w-6 h-6" />, activeIcon: <BriefcaseIconSolid className="w-6 h-6" /> },
    { view: View.Insurance, label: 'Bảo Hiểm', icon: <ShieldCheckIcon className="w-6 h-6" />, activeIcon: <ShieldCheckIconSolid className="w-6 h-6" /> },
    { view: View.Messaging, label: 'Tin Nhắn', icon: <PaperAirplaneIcon className="w-6 h-6" />, activeIcon: <PaperAirplaneIconSolid className="w-6 h-6" />, hasUnread: unreadMessageCount > 0 },
    { view: View.Chatbot, label: 'Hỏi Đáp', icon: <ChatBubbleIcon className="w-6 h-6" />, activeIcon: <ChatBubbleIconSolid className="w-6 h-6" /> },
    { view: View.Profile, label: 'Hồ Sơ', icon: <UserCircleIcon className="w-6 h-6" />, activeIcon: <UserCircleIconSolid className="w-6 h-6" /> },
  ];

  return (
    <>
      {/* --- Desktop & Tablet Header --- */}
      <header className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-10">
                  <button onClick={() => setActiveView(View.Jobs)} className="flex items-center flex-shrink-0 group">
                      <ShieldCheckIcon className="h-8 w-8 text-indigo-600 group-hover:animate-pulse" />
                      <h1 className="ml-3 text-2xl font-bold text-gray-800">An Tâm Việc Làm</h1>
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

              {currentUser && currentUserData && (
                  <div className="flex items-center space-x-4">
                      {currentUserData.userType === UserRole.Employer && (
                          <button 
                            onClick={onPostJobClick}
                            className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                              <PlusCircleIcon className="w-5 h-5 mr-2" />
                              Đăng tin tuyển dụng
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
                          <span className="text-sm text-gray-600 text-right">
                            Chào, <span className="font-semibold">{currentUserData.fullName || currentUser.email}</span>
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
                          Đăng xuất
                      </button>
                  </div>
              )}
          </div>
        </div>
      </header>
      
       {/* --- Mobile Bottom Nav --- */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto px-2">
                <nav className="grid grid-cols-5 gap-1 h-full items-center p-1.5">
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
       
       {/* --- Mobile FAB for Posting Job --- */}
       {currentUser && currentUserData?.userType === UserRole.Employer && (
         <div className="md:hidden fixed bottom-20 right-4 z-50">
           <button
             onClick={onPostJobClick}
             className="bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             aria-label="Đăng tin tuyển dụng mới"
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
    </>
  );
};

export default Header;