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
  signInWithPopup
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
      console.log("🔄 Fetching user with roles for:", firebaseUser.email);

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
            console.log("✅ Got roles from API:", roles);
          }
        }
      } catch (apiError) {
        console.warn("⚠️ Could not fetch roles from API, using default:", apiError);
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
      console.error("❌ Error fetching user roles:", error);
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
        console.error("❌ Error refreshing user:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 Auth state change:", firebaseUser?.email || 'signed out');
      console.log("🔍 Auth state details:", {
        hasUser: !!firebaseUser,
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        mounted
      });

      if (firebaseUser && mounted) {
        setIsLoading(true);
        setFirebaseUser(firebaseUser);
        try {
          const completeUser = await fetchUserWithRoles(firebaseUser);
          if (mounted) {
            setUser(completeUser);
            console.log("✅ User updated:", completeUser.email, "roles:", completeUser.roles);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("❌ Error in auth state change:", error);
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
            console.log("⚠️ Using basic user due to role fetch error");
            setIsLoading(false);
          }
        }
      } else {
        console.log("🚪 Setting user to null, mounted:", mounted);
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
      console.error("Sign in error:", error);
      return { error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Google sign-in successful:", result.user.email);
      return {};
    } catch (error: any) {
      console.error("Google sign in error:", error);
      return { error: error.message };
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
      console.error("Sign up error:", error);
      return { error: error.message };
    }
  };

  const signOut = async () => {
    console.log("🚪 Signing out user");
    setIsLoading(true);

    try {
      await firebaseSignOut(auth);
      console.log("✅ Successfully signed out");
    } catch (error) {
      console.error("Sign out error:", error);
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

  const getIdToken = async (): Promise<string | null> => {
    try {
      if (!firebaseUser) {
        console.warn("No Firebase user available for token");
        return null;
      }
      return await firebaseUser.getIdToken();
    } catch (error) {
      console.error("Failed to get ID token:", error);
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
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
