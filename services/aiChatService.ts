
import { db, serverTimestamp } from './firebase';
import { ChatMessage, MessageAuthor } from '../types';

const COLLECTION_NAME = 'ai_conversations';

/**
 * Lắng nghe lịch sử chat của người dùng với AI.
 */
export const subscribeToAiChatHistory = (userId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = db.collection('users')
        .doc(userId)
        .collection(COLLECTION_NAME)
        .orderBy('timestamp', 'asc');

    const unsubscribe = messagesRef.onSnapshot((snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                author: data.author as MessageAuthor,
                text: data.text
            });
        });
        callback(messages);
    }, (error) => {
        console.error("Error fetching AI chat history:", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Lưu tin nhắn mới vào lịch sử.
 */
export const saveAiChatMessage = async (userId: string, message: ChatMessage) => {
    try {
        await db.collection('users')
            .doc(userId)
            .collection(COLLECTION_NAME)
            .add({
                text: message.text,
                author: message.author,
                timestamp: serverTimestamp()
            });
    } catch (error) {
        console.error("Error saving AI chat message:", error);
    }
};

/**
 * Xóa toàn bộ lịch sử chat AI của người dùng.
 */
export const clearAiChatHistory = async (userId: string) => {
    try {
        const collectionRef = db.collection('users').doc(userId).collection(COLLECTION_NAME);
        const snapshot = await collectionRef.get();
        
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Error clearing AI chat history:", error);
        throw error;
    }
};
