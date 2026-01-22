
import { rtdb } from './firebase';

const firebase = (window as any).firebase;

const isOfflineForDatabase = {
    isOnline: false,
    lastSeen: firebase?.database?.ServerValue?.TIMESTAMP,
};

const isOnlineForDatabase = {
    isOnline: true,
    lastSeen: firebase?.database?.ServerValue?.TIMESTAMP,
};

/**
 * Chủ động đặt trạng thái người dùng thành Offline.
 * Hàm này cần được gọi TRƯỚC KHI auth.signOut() để tránh lỗi permission denied.
 */
export const setUserOffline = async (uid: string) => {
    try {
        const userStatusDatabaseRef = rtdb.ref(`/users/${uid}/status`);
        await userStatusDatabaseRef.set(isOfflineForDatabase);
    } catch (error) {
        console.error("Error setting user offline:", error);
    }
};

/**
 * Sets up the Realtime Database listeners to manage a user's online/offline presence.
 * This should be called once when a user logs in.
 *
 * @param uid The UID of the currently logged-in user.
 * @returns A cleanup function to be called on logout.
 */
export const updateUserPresence = (uid: string): (() => void) => {
  const userStatusDatabaseRef = rtdb.ref(`/users/${uid}/status`);

  // Special reference to '.info/connected' which is a boolean provided by Firebase
  // that is true when the client is connected and false when it is not.
  const connectedRef = rtdb.ref('.info/connected');

  const listener = connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === false) {
      // Client is not connected to Firebase.
      return;
    }

    // When the user disconnects (closes tab/app), set their status to offline automatically.
    userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase)
        .then(() => {
            // Once the onDisconnect is established, set the user's status to online.
            userStatusDatabaseRef.set(isOnlineForDatabase).catch(err => console.warn("Presence set online failed", err.code));
        })
        .catch(err => console.warn("Presence onDisconnect failed", err.code));
  });

  // Return a cleanup function to detach the listener when the user logs out.
  return () => {
    connectedRef.off('value', listener);
  };
};
