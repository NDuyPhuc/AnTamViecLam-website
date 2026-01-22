
import { db, serverTimestamp, arrayUnion } from './firebase';
import { messaging } from './firebase';
import { Notification as NotificationData, NotificationType, UserData } from '../types';

// QUAN TRỌNG: Thay thế giá trị này bằng VAPID key thực tế của bạn từ Firebase console
// Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration -> Web Push certificates
const VAPID_KEY = 'BC0S6kKANv-QpY1c-5rXw1Xg_WfH3Z7T6t_g8C6Z4-F8r4w8S9tQ8n7w6X3Z7f7b5t3b3Y5F-E1d0D9k8H';

/**
 * Yêu cầu quyền hiển thị thông báo và lưu token nếu được cấp phép.
 */
export const requestNotificationPermission = async (userId: string) => {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }

    if (Notification.permission === 'granted') {
        await saveMessagingDeviceToken(userId);
    } else if (Notification.permission !== 'denied') {
        // Only request if not already denied
        console.log('Requesting notification permission...');
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                await saveMessagingDeviceToken(userId);
            } else {
                console.log('Notification permission denied.');
            }
        } catch (error) {
            console.error('An error occurred while requesting permission:', error);
        }
    } else {
        console.log('Notification permission previously denied.');
    }
};

/**
 * Lấy FCM token và lưu vào document của người dùng trên Firestore.
 */
const saveMessagingDeviceToken = async (userId: string) => {
    try {
        const fcmToken = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (fcmToken) {
            // console.log('FCM Token:', fcmToken); // Uncomment for debugging
            const userDocRef = db.collection('users').doc(userId);
            // Sử dụng arrayUnion để thêm token mà không tạo bản sao.
            await userDocRef.update({
                fcmTokens: arrayUnion(fcmToken),
            });
            console.log('FCM token saved for user.');

            // Lắng nghe các tin nhắn khi ứng dụng đang mở (foreground)
            messaging.onMessage((payload) => {
                console.log('Foreground message received. ', payload);
                // Trong ứng dụng thực tế, bạn nên hiển thị một thông báo tùy chỉnh trong ứng dụng (ví dụ: toast)
                // thay vì một alert mặc định.
                // alert(`Tin nhắn mới từ ${payload.notification?.title}:\n${payload.notification?.body}`);
            });
        } else {
            console.log('No registration token available. Request permission to generate one.');
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
    message: string, // Keep message as fallback or for static text
    link: string,
    translationKey?: string,
    translationParams?: Record<string, any>
): Promise<void> => {
    try {
        const notificationsCollection = db.collection('notifications');
        const notificationData: any = {
            userId,
            type,
            message,
            link,
            isRead: false,
            createdAt: serverTimestamp(),
        };

        if (translationKey) {
            notificationData.translationKey = translationKey;
        }
        if (translationParams) {
            notificationData.translationParams = translationParams;
        }

        await notificationsCollection.add(notificationData);
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

        // Sort notifications on the client side by creation date, newest first.
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        callback(notifications);
    }, (error) => {
        console.error("Error fetching notifications:", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const notificationRef = db.collection('notifications').doc(notificationId);
    await notificationRef.update({ isRead: true });
};

/**
 * Marks all unread notifications for a user as read.
 */
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
