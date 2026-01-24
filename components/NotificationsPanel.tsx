import React from 'react';
import { Notification, NotificationType } from '../types';
import BriefcaseIcon from './icons/BriefcaseIcon';
import UserIcon from './icons/UserIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import { useTranslation } from 'react-i18next';
import { formatTimeAgo } from '../utils/formatters';

interface NotificationsPanelProps {
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onMarkAllAsRead: () => void;
    onClose: () => void;
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0";
    switch (type) {
        case NotificationType.NEW_APPLICATION:
            return (
                <div className={`${baseClasses} bg-blue-100 text-blue-600`}>
                    <UserIcon className="w-5 h-5 bg-transparent" />
                </div>
            );
        case NotificationType.NEW_JOB_MATCH:
             return (
                <div className={`${baseClasses} bg-green-100 text-green-600`}>
                    <BriefcaseIcon className="w-5 h-5" />
                </div>
            );
        case NotificationType.APPLICATION_ACCEPTED:
            return (
                <div className={`${baseClasses} bg-green-100 text-green-600`}>
                    <CheckCircleIcon className="w-6 h-6" />
                </div>
            );
        case NotificationType.APPLICATION_REJECTED:
            return (
                <div className={`${baseClasses} bg-red-100 text-red-600`}>
                    <XCircleIcon className="w-6 h-6" />
                </div>
            );
        default:
            return (
                <div className={`${baseClasses} bg-gray-100 text-gray-600`}>
                    <BriefcaseIcon className="w-5 h-5" />
                </div>
            );
    }
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onNotificationClick, onMarkAllAsRead, onClose }) => {
    const { t } = useTranslation();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div 
            className="fixed inset-0 z-40"
            onClick={onClose}
        >
            <div
                className="absolute top-20 right-4 sm:right-6 lg:right-8 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-down z-50"
                style={{ animationDuration: '0.2s' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 flex items-center justify-between border-b">
                    <h3 className="font-bold text-gray-800">{t('notifications.title')}</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            {t('notifications.mark_all_read')}
                        </button>
                    )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(notification => {
                            // Check if dynamic translation is possible
                            const displayText = (notification.translationKey) 
                                ? t(notification.translationKey, notification.translationParams || {}) as string
                                : notification.message;

                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => onNotificationClick(notification)}
                                    className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b ${!notification.isRead ? 'bg-indigo-50' : 'bg-white'}`}
                                >
                                    <NotificationIcon type={notification.type} />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700">{displayText}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatTimeAgo(notification.createdAt)}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full mt-1 flex-shrink-0"></div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-gray-500">
                            <p>{t('notifications.empty')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPanel;