
import { db, serverTimestamp, arrayUnion } from './firebase';
import { messaging } from './firebase';
import { Notification as NotificationData, NotificationType, UserData } from '../types';

// QUAN TRỌNG: Thay thế giá trị này bằng VAPID key thực tế của bạn từ Firebase console
const VAPID_KEY = 'BC0S6kKANv-QpY1c-5rXw1Xg_WfH3Z7T6t_g8C6Z4-F8r4w8S9tQ8n7w6X3Z7f7b5t3b3Y5F-E1d0D9k8H';

/**
 * Yêu cầu quyền hiển thị thông báo và lưu token nếu được cấp phép.
 */
export const requestNotificationPermission = async (userId: string) => {
    console.log('Requesting notification permission...');
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            await saveMessagingDeviceToken(userId);
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('An error occurred while requesting permission:', error);
    }
};

/**
 * Lấy FCM token và lưu vào document của người dùng trên Firestore.
 * Uses existing SW registration to prevent 404 on default firebase-messaging-sw.js
 */
const saveMessagingDeviceToken = async (userId: string) => {
    try {
        // Wait for the service worker registered in App.tsx to be ready
        const registration = await navigator.serviceWorker.ready;
        
        // Pass the registration to getToken so it uses 'sw.js' instead of looking for 'firebase-messaging-sw.js'
        const fcmToken = await messaging.getToken({ 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration 
        });

        if (fcmToken) {
            console.log('FCM Token:', fcmToken);
            const userDocRef = db.collection('users').doc(userId);
            await userDocRef.update({
                fcmTokens: arrayUnion(fcmToken),
            });
            console.log('FCM token saved for user:', userId);

            messaging.onMessage((payload) => {
                console.log('Foreground message received. ', payload);
                // Optional: Show toast or custom UI
            });
        } else {
            console.log('No registration token available.');
        }
    } catch (error) {
        console.error('An error occurred while retrieving token:', error);
    }
};

/**
 * Creates a new notification document in Firestore.
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    message: string,
    link: string
): Promise<void> => {
    try {
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.add({
            userId,
            type,
            message,
            link,
            isRead: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * Subscribes to notifications for a specific user.
 */
export const subscribeToNotifications = (userId: string, callback: (notifications: NotificationData[]) => void) => {
    const notificationsCollection = db.collection('notifications');
    const q = notificationsCollection.where('userId', '==', userId);

    const unsubscribe = q.onSnapshot((querySnapshot) => {
        const notifications: NotificationData[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            notifications.push({
                id: doc.id,
                ...data,
                createdAt,
            } as NotificationData);
        });
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(notifications);
    }, (error) => {
        console.error("Error fetching notifications:", error);
        callback([]);
    });

    return unsubscribe;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const notificationRef = db.collection('notifications').doc(notificationId);
    await notificationRef.update({ isRead: true });
};

export const markAllNotificationsAsRead = async (userId: string, notifications: NotificationData[]): Promise<void> => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const batch = db.batch();
    unreadNotifications.forEach(notification => {
        const notificationRef = db.collection('notifications').doc(notification.id);
        batch.update(notificationRef, { isRead: true });
    });

    await batch.commit();
};
