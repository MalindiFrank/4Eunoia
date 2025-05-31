
// src/context/auth-context.tsx
'use client';

import React, { createContext, useState, useContext, useEffect, type ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    }, (authError) => {
      console.error("Auth state error:", authError);
      setError(authError);
      setIsLoading(false);
      toast({
        title: "Authentication Error",
        description: "Could not verify your authentication status.",
        variant: "destructive",
      });
    });
    return () => unsubscribe();
  }, [toast]);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Signed In", description: "Successfully signed in with Google." });
    } catch (signInError: any) {
      console.error("Google Sign-In error:", signInError);
      setError(signInError);
      toast({
        title: "Sign-In Failed",
        description: signInError.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Auth state change will set loading to false
    }
  }, [toast]);

  const signOutUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (signOutError: any) {
      console.error("Sign Out error:", signOutError);
      setError(signOutError);
      toast({
        title: "Sign-Out Failed",
        description: signOutError.message || "Could not sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
       // Auth state change will set loading to false
    }
  }, [toast]);

  const value = { user, isLoading, error, signInWithGoogle, signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
