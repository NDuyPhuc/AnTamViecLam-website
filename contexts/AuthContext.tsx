
import React, { useContext, useState, useEffect, createContext, useCallback } from 'react';
import type { User } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import { auth, db, serverTimestamp } from '../services/firebase';
import { UserRole, UserData } from '../types';
import { requestNotificationPermission } from '../services/notificationService';
import { updateUserPresence, setUserOffline } from '../services/presenceService';

interface AuthContextType {
  currentUser: User | null;
  currentUserData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, role: UserRole) => Promise<firebase.auth.UserCredential>;
  login: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: User) => {
    if (!user) {
        setCurrentUserData(null);
        return;
    };
    const userDocRef = db.collection('users').doc(user.uid);
    const docSnap = await userDocRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      
      // SECURITY: Check if user is banned
      if (data?.isDisabled === true) {
          throw new Error("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.");
      }

      // Convert timestamp to ISO string to prevent serialization issues
      const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const kycSubmittedAt = data?.kycSubmittedAt?.toDate ? data.kycSubmittedAt.toDate().toISOString() : undefined;
      
      const userData: UserData = {
          uid: data?.uid,
          email: data?.email,
          userType: data?.userType,
          createdAt: createdAt,
          fullName: data?.fullName,
          phoneNumber: data?.phoneNumber,
          address: data?.address,
          profileImageUrl: data?.profileImageUrl,
          fcmTokens: data?.fcmTokens || [],
          bio: data?.bio || '',
          skills: data?.skills || [],
          workHistory: data?.workHistory || [],
          cvUrl: data?.cvUrl || null,
          cvName: data?.cvName || null,
          walletAddress: data?.walletAddress || null,
          
          // KYC Fields
          kycStatus: data?.kycStatus || 'none',
          kycImages: data?.kycImages || [],
          kycRejectReason: data?.kycRejectReason || '',
          kycSubmittedAt: kycSubmittedAt,
          isDisabled: data?.isDisabled || false,
      };
      setCurrentUserData(userData as UserData);
    } else {
      console.log("No such user document!");
      setCurrentUserData(null);
    }
  };
  
  const refetchUserData = useCallback(async () => {
    if (currentUser) {
        try {
            await fetchUserData(currentUser);
        } catch (e) {
            // If fetch fail (e.g. banned), logout
            await logout();
        }
    }
  }, [currentUser]);


  const signup = async (email: string, password: string, role: UserRole) => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const { user } = userCredential;
    if (!user) {
      throw new Error("User creation failed.");
    }
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      userType: role,
      createdAt: serverTimestamp(),
      fullName: null,
      phoneNumber: null,
      address: null,
      profileImageUrl: null,
      fcmTokens: [],
      bio: '',
      skills: [],
      workHistory: [],
      cvUrl: null,
      cvName: null,
      kycStatus: 'none',
      isDisabled: false, // Default false
    });
    return userCredential;
  };

  const login = async (email: string, password: string) => {
    // Standard Firebase login
    const credential = await auth.signInWithEmailAndPassword(email, password);
    // Extra security check handled in onAuthStateChanged -> fetchUserData
    return credential;
  };

  const logout = async () => {
    try {
        if (currentUser) {
            await setUserOffline(currentUser.uid);
        }
        await auth.signOut();
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            } catch (error) {
                console.warn("Could not unregister service workers:", error);
            }
        }
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    } catch (error) {
        console.error("Logout error:", error);
        window.location.reload();
    }
  };
  
  const loginWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Error with Google Sign-in Popup:", error);
        throw error;
    }
  };

  // --- REAL-TIME BAN MONITORING ---
  useEffect(() => {
      let unsubscribeUserDoc: () => void;

      if (currentUser) {
          const userRef = db.collection('users').doc(currentUser.uid);
          unsubscribeUserDoc = userRef.onSnapshot((doc) => {
              const data = doc.data();
              if (data && data.isDisabled === true) {
                  console.warn("User has been disabled by Admin. Logging out.");
                  alert("Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
                  logout();
              }
          });
      }

      return () => {
          if (unsubscribeUserDoc) unsubscribeUserDoc();
      };
  }, [currentUser]);


  useEffect(() => {
    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (presenceCleanup) {
          presenceCleanup();
          presenceCleanup = undefined;
        }

        setCurrentUser(user);
        if (user) {
            try {
                await fetchUserData(user);
                await requestNotificationPermission(user.uid);
                presenceCleanup = updateUserPresence(user.uid);
            } catch (error: any) {
                console.error("Auth check failed (likely disabled):", error.message);
                alert(error.message);
                await auth.signOut();
                setCurrentUser(null);
                setCurrentUserData(null);
            }
        } else {
            setCurrentUserData(null);
        }
        setLoading(false);
    });

    return () => {
      unsubscribe();
      if (presenceCleanup) {
        presenceCleanup();
      }
    };
  }, []);

  const value = {
    currentUser,
    currentUserData,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    refetchUserData,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
