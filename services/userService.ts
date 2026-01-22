
import { db, serverTimestamp } from './firebase';
import type { UserData } from '../types';

/**
 * Fetches the public profile data for a specific user.
 * @param userId The UID of the user to fetch.
 * @returns A UserData object or null if not found.
 */
export const getUserProfile = async (userId: string): Promise<UserData | null> => {
  if (!userId) return null;

  try {
    const userDocRef = db.collection('users').doc(userId);
    const docSnap = await userDocRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      // Convert timestamp to ISO string to prevent serialization issues
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const kycSubmittedAt = data.kycSubmittedAt?.toDate ? data.kycSubmittedAt.toDate().toISOString() : undefined;
      
      // Construct a safe public profile, excluding sensitive data if any were present.
      const userProfile: UserData = {
        uid: data.uid,
        email: data.email,
        userType: data.userType,
        createdAt: createdAt,
        fullName: data.fullName || 'Người dùng ẩn danh',
        phoneNumber: data.phoneNumber, // Note: consider privacy implications
        address: data.address,
        profileImageUrl: data.profileImageUrl,
        bio: data.bio || '',
        skills: data.skills || [],
        workHistory: data.workHistory || [],
        walletAddress: data.walletAddress || null, // Include wallet address
        
        // KYC Fields
        kycStatus: data.kycStatus || 'none',
        kycImages: data.kycImages || [],
        kycRejectReason: data.kycRejectReason || '',
        kycSubmittedAt: kycSubmittedAt,
      };
      return userProfile as UserData;
    } else {
      console.log("No such user document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Updates the wallet address for a user.
 * @param userId The UID of the user.
 * @param walletAddress The wallet address to bind (or null to unbind).
 */
export const updateUserWallet = async (userId: string, walletAddress: string | null): Promise<void> => {
    try {
        await db.collection('users').doc(userId).update({
            walletAddress: walletAddress
        });
    } catch (error) {
        console.error("Error updating user wallet:", error);
        throw error;
    }
};

/**
 * Submits a KYC request for a user.
 * @param userId The UID of the user.
 * @param images Array of 3 image URLs [front, back, portrait]
 */
export const submitKycRequest = async (userId: string, images: string[]): Promise<void> => {
    try {
        await db.collection('users').doc(userId).update({
            kycStatus: 'pending',
            kycImages: images,
            kycSubmittedAt: serverTimestamp(),
            // IMPORTANT: Reset reject reason to clear error UI and indicate new submission
            kycRejectReason: null 
        });
    } catch (error) {
        console.error("Error submitting KYC:", error);
        throw error;
    }
};
