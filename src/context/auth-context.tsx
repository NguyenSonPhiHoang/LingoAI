
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Loader2 } from 'lucide-react';

export interface User extends FirebaseUser {
  role?: 'admin' | 'user';
  status?: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string, displayName: string) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener handles auth state changes.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If user is logged in, set up a real-time listener for their Firestore document.
        const userRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            // User document exists, merge auth data with Firestore data.
            const userData = docSnapshot.data();
            setUser({
              ...firebaseUser,
              role: userData.role,
              status: userData.status
            });
          } else {
             // This is a rare case, e.g., user exists in Auth but not in Firestore.
             // Let's create the doc. The listener will auto-update state.
            setDoc(doc(db, "users", firebaseUser.uid), {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: 'user',
                status: 'pending',
                createdAt: serverTimestamp(),
            }).catch(e => console.error("Error creating user doc on-the-fly:", e));
          }
          setLoading(false);
        }, (error) => {
           console.error("Firestore snapshot error:", error);
           setUser(firebaseUser); // Fallback to auth data only on error
           setLoading(false);
        });
        
        // Return a cleanup function for the snapshot listener.
        return () => unsubscribeSnapshot();
      } else {
        // If user is logged out, clear the user state and stop loading.
        setUser(null);
        setLoading(false);
      }
    });

    // This is the main cleanup function for the useEffect hook itself.
    return () => unsubscribeAuth();
  }, []);

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  }

  const signup = async (email: string, pass: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;
    if(firebaseUser){
      await updateProfile(firebaseUser, { displayName });
      const userRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        role: 'user',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    }
    return userCredential;
  }

  const logout = () => {
    return signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
