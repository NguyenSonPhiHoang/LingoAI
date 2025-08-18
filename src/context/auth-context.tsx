
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            setUser({
              ...firebaseUser,
              role: userData.role,
              status: userData.status
            });
            setLoading(false);
          } else {
            // If user exists in Auth but not in Firestore, create their doc.
            // This handles the case for the very first admin or users created before the system was in place.
            const newUserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: 'user',
                status: 'pending',
                createdAt: serverTimestamp(),
            };
            setDoc(userRef, newUserData).then(() => {
               // The snapshot listener will automatically pick up this change and set the user state.
            }).catch(e => {
                console.error("Error creating user document:", e);
                setLoading(false);
            });
          }
        }, (error) => {
           console.error("Snapshot listener error:", error);
           setUser(firebaseUser); // Set user without role/status on error
           setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

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
      // The onAuthStateChanged listener will now handle creating the user document,
      // so we only need to set the initial data here.
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


  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
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
