import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';

/**
 * Sets up the Realtime Database listeners to manage a user's online/offline presence.
 * This should be called once when a user logs in.
 *
 * @param uid The UID of the currently logged-in user.
 * @returns A cleanup function to be called on logout.
 */
export const updateUserPresence = (uid: string): (() => void) => {
  const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
  const isOnlineForDatabase = {
    isOnline: true,
    lastSeen: serverTimestamp(),
  };
  const isOfflineForDatabase = {
    isOnline: false,
    lastSeen: serverTimestamp(),
  };

  // Special reference to '.info/connected' which is a boolean provided by Firebase
  // that is true when the client is connected and false when it is not.
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      // Client is not connected to Firebase.
      return;
    }

    // When the user disconnects, set their status to offline.
    // This is the crucial part for handling browser closure, network loss, etc.
    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
      // Once the onDisconnect is established, set the user's status to online.
      set(userStatusDatabaseRef, isOnlineForDatabase);
    });
  });

  // Return a cleanup function to detach the listener when the user logs out.
  return () => {
    unsubscribe();
    // Also explicitly set the user to offline on a clean logout.
    set(userStatusDatabaseRef, isOfflineForDatabase);
  };
};
