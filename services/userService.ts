
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
        isVerified: data.isVerified || false,
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
 * Updates the user's verified status after successful eKYC and saves the KYC data.
 * @param userId The user's ID
 * @param kycData The raw data returned from the eKYC provider (images, face data, etc.)
 */
export const verifyUser = async (userId: string, kycData?: any): Promise<void> => {
    if (!userId) return;
    try {
        await db.collection('users').doc(userId).update({
            isVerified: true,
            kycData: kycData || null, // Store the full KYC result object (base64 images, etc.)
            verifiedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error verifying user:", error);
        throw error;
    }
};
