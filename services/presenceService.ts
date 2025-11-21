import firebase from 'firebase/compat/app';
import { rtdb } from './firebase';

/**
 * Sets up the Realtime Database listeners to manage a user's online/offline presence.
 * This should be called once when a user logs in.
 *
 * @param uid The UID of the currently logged-in user.
 * @returns A cleanup function to be called on logout.
 */
export const updateUserPresence = (uid: string): (() => void) => {
  const userStatusDatabaseRef = rtdb.ref(`/status/${uid}`);

  // Use firebase.database.ServerValue.TIMESTAMP for Realtime Database
  const isOnlineForDatabase = {
    isOnline: true,
    lastSeen: firebase.database.ServerValue.TIMESTAMP,
  };

  const isOfflineForDatabase = {
    isOnline: false,
    lastSeen: firebase.database.ServerValue.TIMESTAMP,
  };

  // Special reference to '.info/connected' which is a boolean provided by Firebase
  // that is true when the client is connected and false when it is not.
  const connectedRef = rtdb.ref('.info/connected');

  const listener = connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === false) {
      // Client is not connected to Firebase.
      return;
    }

    // When the user disconnects, set their status to offline.
    // This is the crucial part for handling browser closure, network loss, etc.
    userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
      // Once the onDisconnect is established, set the user's status to online.
      userStatusDatabaseRef.set(isOnlineForDatabase);
    });
  });

  // Return a cleanup function to detach the listener when the user logs out.
  return () => {
    connectedRef.off('value', listener);
    // Also explicitly set the user to offline on a clean logout.
    userStatusDatabaseRef.set(isOfflineForDatabase);
  };
};