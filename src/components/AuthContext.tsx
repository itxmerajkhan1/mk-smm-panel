/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocFromServer,
  addDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User, Notification, Order, Ticket, Transaction } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore SECURE Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  notifications: Notification[];
  loadingProfile: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string, username: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  addNotificationSync: (title: string, message: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserApiKey: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);

  // Validate connection to Firestore on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test-connection-probe', 'probe'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or networks.");
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Auth User Authentication Status
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    let notificationUnsubscribe: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      // Clean up previous active listeners immediately
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
        notificationUnsubscribe = null;
      }

      setFirebaseUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setNotifications([]);
        setLoadingProfile(false);
        setHasSynced(false);
        return;
      }

      setLoadingProfile(true);
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Listen to profile updates inside Firestore in real-time
      profileUnsubscribe = onSnapshot(userDocRef, async (profileSnap) => {
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as User;
          
          // Guard suspended users immediately
          if (profileData.status === 'suspended') {
            await signOut(auth);
            setUserProfile(null);
            alert('Your SMM account has been suspended by an administrator.');
            return;
          }
          
          setUserProfile(profileData);

          // One-time session sync with SMM Node server
          if (!hasSynced) {
            setHasSynced(true);
            (async () => {
              try {
                const token = await currentUser.getIdToken();
                const savedRef = localStorage.getItem('mk_smm_referrer');
                
                let referrerUid = '';
                if (savedRef) {
                  const q = query(collection(db, 'users'), where('username', '==', savedRef.toLowerCase().trim()));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    referrerUid = snap.docs[0].id;
                  }
                }

                if (referrerUid && referrerUid !== currentUser.uid && !profileData.referredBy) {
                  // Save referredBy on client-side Firestore document
                  await setDoc(userDocRef, {
                    referredBy: referrerUid
                  }, { merge: true });

                  // Add Notification to Referrer
                  await addDoc(collection(db, 'notifications'), {
                    userId: referrerUid,
                    title: '🔥 New Referral Registered!',
                    message: `@${profileData.username || 'A user'} registered using your referral link. You will earn 10% commission on their funding deposits!`,
                    read: false,
                    createdAt: new Date().toISOString()
                  });

                  localStorage.removeItem('mk_smm_referrer');
                } else {
                  // heartbeat sync removed

                  if (profileData.referredBy || (savedRef && savedRef.toLowerCase().trim() === profileData.username.toLowerCase())) {
                    localStorage.removeItem('mk_smm_referrer');
                  }
                }
              } catch (err) {
                console.error('Profile heartbeat sync failed:', err);
              }
            })();
          }
        } else {
          // If Firestore profile doesn't exist, bootstrap it (useful for first Google sign-ins)
          const fallbackUsername = currentUser.displayName?.replace(/\s+/g, '').toLowerCase() || currentUser.email?.split('@')[0] || `user_${currentUser.uid.substring(0, 5)}`;
          
          let bootstrappedReferrer = '';
          const savedRef = localStorage.getItem('mk_smm_referrer');
          if (savedRef) {
            try {
              const q = query(collection(db, 'users'), where('username', '==', savedRef.toLowerCase().trim()));
              const snap = await getDocs(q);
              if (!snap.empty) {
                bootstrappedReferrer = snap.docs[0].id;
              }
            } catch (err) {
              console.error('Saved referrer lookup during bootstrap failed:', err);
            }
          }

          const brandNewProfile: User & { uid?: string } = {
            id: currentUser.uid,
            uid: currentUser.uid,
            username: fallbackUsername,
            email: currentUser.email || '',
            role: currentUser.email === 'admin@mksmm.com' || currentUser.email === 'itxmerajkhan3109@gmail.com' ? 'admin' : 'user',
            balance: 0,
            status: 'active',
            apiKey: `mk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
            createdAt: new Date().toISOString(),
            referredBy: bootstrappedReferrer && bootstrappedReferrer !== currentUser.uid ? bootstrappedReferrer : undefined
          };

          try {
            await setDoc(doc(db, 'users', currentUser.uid), brandNewProfile);
            setUserProfile(brandNewProfile as User);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
          }
        }
        setLoadingProfile(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        setLoadingProfile(false);
      });

      // Synchronize client-specific notifications in real-time
      const notificationQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid)
      );

      notificationUnsubscribe = onSnapshot(notificationQuery, (snap) => {
        const list: Notification[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Notification);
        });
        // Sort notifications: newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      });
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (notificationUnsubscribe) notificationUnsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Google Sign In Error:', e);
      throw e;
    }
  };

  const registerWithEmail = async (email: string, pass: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // Wait for Auth observer to bootstrap the profile document
      const brandNewProfile: User & { uid?: string } = {
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        username: username.toLowerCase().replace(/\s+/g, ''),
        email: email,
        role: email === 'admin@mksmm.com' || email === 'itxmerajkhan3109@gmail.com' ? 'admin' : 'user',
        balance: 0,
        status: 'active',
        apiKey: `mk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), brandNewProfile);
    } catch (e: any) {
      console.error('Email Registration Error:', e);
      throw e;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      console.error('Email Authentication Error:', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Account Logout Error:', e);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      console.error('Password Reset Error:', e);
      throw e;
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (e) {
        console.error('Email Verification Trigger Error:', e);
        throw e;
      }
    }
  };

  const addNotificationSync = async (title: string, message: string) => {
    if (!auth.currentUser) return;
    try {
      const notifRef = collection(db, 'notifications');
      await addDoc(notifRef, {
        userId: auth.currentUser.uid,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications');
    }
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const profileSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (profileSnap.exists()) {
        setUserProfile(profileSnap.data() as User);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${auth.currentUser.uid}`);
    }
  };

  const updateUserApiKey = async () => {
    if (!auth.currentUser || !userProfile) throw new Error('Not authenticated');
    const newKey = `mk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...userProfile,
        apiKey: newKey
      });
      return newKey;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      notifications,
      loadingProfile,
      signInWithGoogle,
      registerWithEmail,
      loginWithEmail,
      logout,
      resetPassword,
      sendVerification,
      addNotificationSync,
      refreshProfile,
      updateUserApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
