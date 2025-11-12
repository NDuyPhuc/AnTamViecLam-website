import { useState, useEffect } from 'react';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
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

    const userStatusRef = ref(rtdb, `/status/${userId}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.isOnline) {
        setPresence({ isOnline: true, statusText: 'Đang hoạt động' });
      } else if (data?.lastSeen) {
        const lastSeenDate = new Date(data.lastSeen).toISOString();
        // Use the 'presence' context for more appropriate formatting
        setPresence({ isOnline: false, statusText: `Hoạt động ${formatTimeAgo(lastSeenDate, 'presence')}` });
      } else {
        setPresence({ isOnline: false, statusText: 'Không hoạt động' });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return presence;
};
