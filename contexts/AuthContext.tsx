import React, { useContext, useState, useEffect, createContext, useCallback } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserRole, UserData } from '../types';
import { requestNotificationPermission } from '../services/notificationService';
import { updateUserPresence } from '../services/presenceService';

interface AuthContextType {
  currentUser: User | null;
  currentUserData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, role: UserRole) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
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
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Convert timestamp to ISO string to prevent serialization issues
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      const userData: UserData = {
          uid: data.uid,
          email: data.email,
          userType: data.userType,
          createdAt: createdAt,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          address: data.address,
          profileImageUrl: data.profileImageUrl,
          fcmTokens: data.fcmTokens || [], // Ensure fcmTokens is an array
      };
      setCurrentUserData(userData);
    } else {
      console.log("No such user document!");
      setCurrentUserData(null);
    }
  };
  
  const refetchUserData = useCallback(async () => {
    if (currentUser) {
        await fetchUserData(currentUser);
    }
  }, [currentUser]);


  const signup = async (email: string, password: string, role: UserRole) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      userType: role,
      createdAt: serverTimestamp(),
      fullName: null,
      phoneNumber: null,
      address: null,
      profileImageUrl: null,
      fcmTokens: [],
    });
    return userCredential;
  };

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    // updateUserPresence handles setting the status to offline via onDisconnect
    return signOut(auth);
  };
  
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const { user } = result;
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // Force new Google users into the profile completion flow
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              userType: UserRole.Worker, // Default role for Google sign-up
              createdAt: serverTimestamp(),
              fullName: null,
              phoneNumber: null,
              address: null,
              profileImageUrl: user.photoURL || null, // Pre-fill avatar if available
              fcmTokens: [],
            });
          }
        }
      } catch (error) {
        console.error("Error handling Google redirect result:", error);
      }
    };
    
    handleRedirectResult();

    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        // Clean up previous presence listener if it exists
        if (presenceCleanup) {
          presenceCleanup();
          presenceCleanup = undefined;
        }

        setCurrentUser(user);
        if (user) {
            await fetchUserData(user);
            // After user is logged in, ask for permission to send notifications.
            // This will only show the prompt once, then the browser remembers the choice.
            await requestNotificationPermission(user.uid);
            // Start presence tracking
            presenceCleanup = updateUserPresence(user.uid);
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