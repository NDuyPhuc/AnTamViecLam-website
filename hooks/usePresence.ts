import { useState, useEffect } from 'react';
import { rtdb } from '../services/firebase';
import { formatTimeAgo } from '../utils/formatters';

interface PresenceStatus {
  isOnline: boolean;
  statusText: string | null;
}

export const usePresence = (userId: string | null): PresenceStatus => {
  const [presence, setPresence] = useState<PresenceStatus>({ isOnline: false, statusText: null });

  useEffect(() => {
    if (!userId) {
      setPresence({ isOnline: false, statusText: null });
      return;
    }

    const userStatusRef = rtdb.ref(`/users/${userId}/status`);
    const listener = userStatusRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data?.isOnline) {
        setPresence({ isOnline: true, statusText: 'Đang hoạt động' });
      } else if (data?.lastSeen && typeof data.lastSeen === 'number') {
        // Validate that lastSeen is a number before creating Date to prevent "RangeError: Invalid time value"
        try {
            const lastSeenDate = new Date(data.lastSeen).toISOString();
            // Use the 'presence' context for more appropriate formatting
            setPresence({ isOnline: false, statusText: `Hoạt động ${formatTimeAgo(lastSeenDate, 'presence')}` });
        } catch (e) {
            console.warn("Invalid lastSeen date for user:", userId, data.lastSeen);
            setPresence({ isOnline: false, statusText: 'Không hoạt động' });
        }
      } else {
        setPresence({ isOnline: false, statusText: 'Không hoạt động' });
      }
    }, (error) => {
        // Silently handle permission errors (users might not be able to read others' status based on rules)
        console.warn("Error reading presence:", error);
        setPresence({ isOnline: false, statusText: null });
    });

    return () => userStatusRef.off('value', listener);
  }, [userId]);

  return presence;
};