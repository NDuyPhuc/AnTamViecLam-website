import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
    addDoc,
    orderBy,
    updateDoc,
    FieldValue,
    writeBatch,
    getDocs,
    increment
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserData, Application, Conversation, Message } from '../types';

/**
 * Gets an existing conversation or creates a new one between two users.
 * Uses a sorted combination of UIDs as the document ID to ensure uniqueness.
 */
export const getOrCreateConversation = async (application: Application): Promise<string> => {
    const { workerId, employerId } = application;
    const participants = [workerId, employerId].sort();
    const conversationId = participants.join('_');

    const conversationRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(conversationRef);

    if (!docSnap.exists()) {
        const participantInfo = {
            [workerId]: {
                fullName: application.workerName,
                profileImageUrl: application.workerProfileImageUrl || null,
            },
            [employerId]: {
                fullName: application.employerName,
                profileImageUrl: application.employerProfileImageUrl || null,
            }
        };
        
        const unreadCounts = {
            [workerId]: 0,
            [employerId]: 0,
        };

        await setDoc(conversationRef, {
            id: conversationId,
            participants,
            participantInfo,
            lastMessage: `Bắt đầu trò chuyện về công việc: ${application.jobTitle}`,
            lastMessageTimestamp: serverTimestamp(),
            unreadCounts,
        });
    }

    return conversationId;
};

/**
 * Subscribes to all conversations for a specific user.
 */
export const subscribeToConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
    const conversationsCollection = collection(db, 'conversations');
    const q = query(
        conversationsCollection,
        where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const conversations: Conversation[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const lastMessageTimestamp = data.lastMessageTimestamp?.toDate
                ? data.lastMessageTimestamp.toDate().toISOString()
                : new Date().toISOString();
            
            conversations.push({
                id: doc.id,
                ...data,
                lastMessageTimestamp,
            } as Conversation);
        });

        // Sort by most recent message
        conversations.sort((a, b) => 
            new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime()
        );
        
        callback(conversations);
    }, (error) => {
        console.error("Error fetching conversations:", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Subscribes to messages within a specific conversation.
 */
export const subscribeToMessages = (conversationId: string, callback: (messages: Message[]) => void) => {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
            messages.push({
                id: doc.id,
                conversationId: conversationId,
                ...data,
                timestamp,
            } as Message);
        });
        callback(messages);
    }, (error) => {
        console.error("Error fetching messages:", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Gửi một tin nhắn, cập nhật trạng thái cuộc trò chuyện và tăng số tin nhắn chưa đọc cho người nhận.
 */
export const sendMessage = async (conversationId: string, senderId: string, senderName: string, text: string) => {
    if (!text.trim()) return;

    // 1. Thêm tin nhắn mới với trạng thái 'sent'
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(messagesCollection, {
        senderId,
        text,
        timestamp: serverTimestamp(),
        status: 'sent',
        deleted: false,
    });

    // 2. Cập nhật tin nhắn cuối cùng và tăng số tin chưa đọc cho người nhận
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        const recipientId = conversationData.participants.find((p: string) => p !== senderId);
        
        if (recipientId) {
            const updateData = {
                lastMessage: text,
                lastMessageTimestamp: serverTimestamp(),
                [`unreadCounts.${recipientId}`]: increment(1),
            };
            await updateDoc(conversationRef, updateData);
        }
    }
};

/**
 * Đánh dấu cuộc trò chuyện là đã đọc bằng cách reset bộ đếm tin chưa đọc của người dùng.
 */
export const markConversationAsRead = async (conversationId: string, userId: string): Promise<void> => {
    const conversationRef = doc(db, 'conversations', conversationId);
    try {
        await updateDoc(conversationRef, {
            [`unreadCounts.${userId}`]: 0,
        });
    } catch (error) {
        console.error("Error marking conversation as read:", error);
    }
};

/**
 * Đánh dấu tất cả tin nhắn trong một cuộc trò chuyện là đã đọc bởi một người dùng.
 */
export const markMessagesAsRead = async (conversationId: string, readByUserId: string): Promise<void> => {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, where('senderId', '!=', readByUserId), where('status', '==', 'sent'));
    
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return;

        const batch = writeBatch(db);
        querySnapshot.forEach(document => {
            batch.update(document.ref, { status: 'read' });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
};

/**
 * Deletes a message by marking it as deleted.
 * Only the sender can delete their own message.
 */
export const deleteMessage = async (conversationId: string, messageId: string, currentUserId: string, messageSenderId: string): Promise<void> => {
    if (currentUserId !== messageSenderId) {
        throw new Error("You can only delete your own messages.");
    }
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
        text: 'Tin nhắn này đã được thu hồi.',
        deleted: true,
    });
};