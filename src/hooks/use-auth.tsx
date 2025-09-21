'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, type User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => void;
  signInWithGoogle: () => void;
  createUserInFirestore: (user: User, role: 'user' | 'lawyer') => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
  signInWithGoogle: () => {},
  createUserInFirestore: async () => {},
});

const updateUserInFirestore = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user', // Default role for new Google sign-in users
            createdAt: new Date(),
        }, { merge: true });
    } else {
         // User exists, just update their details but preserve the role
         await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
        }, { merge: true });
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await updateUserInFirestore(user);
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const createUserInFirestore = async (user: User, role: 'user' | 'lawyer') => {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: role,
        createdAt: new Date(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await updateUserInFirestore(result.user);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signInWithGoogle, createUserInFirestore }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
