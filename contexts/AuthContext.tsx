import React, { useContext, useState, useEffect, createContext, useCallback } from 'react';
import type { User } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import { auth, db, serverTimestamp } from '../services/firebase';
import { UserRole, UserData } from '../types';
import { requestNotificationPermission } from '../services/notificationService';
import { updateUserPresence } from '../services/presenceService';

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
          fcmTokens: data.fcmTokens || [],
          // Worker-specific profile fields
          bio: data.bio || '',
          skills: data.skills || [],
          workHistory: data.workHistory || [],
          cvUrl: data.cvUrl || null,
          cvName: data.cvName || null,
      };
      setCurrentUserData(userData as UserData);
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
    });
    return userCredential;
  };

  const login = (email: string, password: string) => {
    return auth.signInWithEmailAndPassword(email, password);
  };

  const logout = () => {
    // updateUserPresence handles setting the status to offline via onDisconnect
    return auth.signOut();
  };
  
  const loginWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        // NOTE: We do NOT create the user document here anymore.
        // We let CompleteProfilePage handle the role selection and document creation 
        // if the user document doesn't exist.
    } catch (error) {
        console.error("Error with Google Sign-in Popup:", error);
        throw error;
    }
  };

  useEffect(() => {
    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        // Clean up previous presence listener if it exists
        if (presenceCleanup) {
          presenceCleanup();
          presenceCleanup = undefined;
        }

        setCurrentUser(user);
        if (user) {
            await fetchUserData(user);
            // Only setup extras if userData exists (meaning they finished profile completion)
            // However, requestNotificationPermission is safe to call early
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