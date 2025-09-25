"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  roles: Array<"user" | "scout" | "mod" | "admin">;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  hasRole: (role: "scout" | "mod" | "admin") => boolean;
  canModerate: () => boolean;
  canAdmin: () => boolean;
  refreshUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUserWithRoles = async (firebaseUser: User): Promise<AuthUser> => {
    try {
      let roles: Array<"user" | "scout" | "mod" | "admin"> = ["user"];

      // Fetch roles from API (server-side computation, no Firestore needed)
      try {
        const response = await fetch('/api/auth/roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: firebaseUser.email, uid: firebaseUser.uid }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.roles) {
            roles = data.roles;
          }
        }
      } catch (apiError) {
        // Silently use default roles if API fails
      }

      const completeUser: AuthUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        name: firebaseUser.displayName || undefined,
        avatar: firebaseUser.photoURL || undefined,
        roles: roles,
      };

      return completeUser;
    } catch (error) {
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || undefined,
        name: firebaseUser.displayName || undefined,
        avatar: firebaseUser.photoURL || undefined,
        roles: ["user"],
      };
    }
  };


  const refreshUser = async () => {
    if (auth.currentUser) {
      setIsLoading(true);
      try {
        const completeUser = await fetchUserWithRoles(auth.currentUser);
        setUser(completeUser);
      } catch (error) {
        // Silently handle refresh errors
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // Handle redirect result from Google OAuth
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Google sign-in successful
        }
      } catch (error: any) {
        // Silently handle redirect result errors
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && mounted) {
        setIsLoading(true);
        setFirebaseUser(firebaseUser);
        try {
          const completeUser = await fetchUserWithRoles(firebaseUser);
          if (mounted) {
            setUser(completeUser);
            setIsLoading(false);
          }
        } catch (error) {
          // On error, create a basic user without roles to prevent sign-out
          if (mounted) {
            const basicUser: AuthUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || undefined,
              name: firebaseUser.displayName || undefined,
              avatar: firebaseUser.photoURL || undefined,
              roles: ["user"],
            };
            setUser(basicUser);
            setIsLoading(false);
          }
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const provider = new GoogleAuthProvider();

      // Configure provider for better UX
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Create a timeout promise for network issues
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Google Auth timeout - please check your internet connection'));
        }, 15000); // 15 second timeout
      });

      try {
        // First, try popup method with timeout
        const result = await Promise.race([
          signInWithPopup(auth, provider),
          timeoutPromise
        ]);
        return {};
      } catch (popupError: any) {
        // Handle network errors specifically
        if (popupError.message.includes('timeout') || 
            popupError.message.includes('Failed to fetch') ||
            popupError.code === 'auth/network-request-failed') {
          return { 
            error: "Network connection issue. Please check your internet connection and try again." 
          };
        }
        
        // If popup is blocked, fall back to redirect
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/cancelled-popup-request') {
          try {
            await Promise.race([
              signInWithRedirect(auth, provider),
              timeoutPromise
            ]);
            // The redirect will handle the rest, no return needed
            return {};
          } catch (redirectError: any) {
            if (redirectError.message.includes('timeout')) {
              return { 
                error: "Network connection issue. Please check your internet connection and try again." 
              };
            }
            throw redirectError;
          }
        } else {
          // Re-throw other errors
          throw popupError;
        }
      }
    } catch (error: any) {
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site or try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Sign-in was cancelled. Please try again.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
      }

      return { error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    setIsLoading(true);

    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // Silently handle sign out errors
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const hasRole = (role: "scout" | "mod" | "admin") => {
    return user?.roles.includes(role) || false;
  };

  const canModerate = () => {
    return hasRole("mod") || hasRole("admin");
  };

  const canAdmin = () => {
    return hasRole("admin");
  };

  const refreshUserRoles = async () => {
    if (user) {
      try {
        if (auth.currentUser) {
          const updatedUser = await fetchUserWithRoles(auth.currentUser);
          setUser(updatedUser);
          return true;
        }
      } catch (error) {
        // Silently handle role refresh errors
      }
    }
    return false;
  };

  const getIdToken = async (): Promise<string | null> => {
    try {
      if (!firebaseUser) {
        return null;
      }
      return await firebaseUser.getIdToken();
    } catch (error) {
      return null;
    }
  };

  const value = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    hasRole,
    canModerate,
    canAdmin,
    refreshUser,
    refreshUserRoles,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
