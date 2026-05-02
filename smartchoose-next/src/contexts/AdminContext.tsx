"use client";
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export type AdminRole = 'super_admin' | 'editor' | 'viewer';

export interface AdminContextType {
  isAdmin: boolean;
  user: FirebaseUser | null;
  role: AdminRole | null;
  showLogin: boolean;
  loginError: string | null;
  isLoading: boolean;
  setShowLogin: (show: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: AdminRole) => boolean;
  clearLoginError: () => void;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  'super_admin': 3,
  'editor': 2,
  'viewer': 1
};

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  //  Auth State Observer (Gated for visitors)
  // ============================================================
  useEffect(() => {
    const isAdminUnlocked = localStorage.getItem('sc_admin_unlocked') === 'true';
    if (!isAdminUnlocked && !showLogin) {
      setIsLoading(false);
      return;
    }

    // Wait 2 seconds before initializing Auth to allow LCP/FCP to complete first
    // If showLogin is true, we initialize immediately to avoid lag
    const delay = showLogin ? 0 : 2000;
    const timer = setTimeout(() => {
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        setIsLoading(true);
        if (firebaseUser) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
            if (adminDoc.exists()) {
              const userData = adminDoc.data();
              const userRole = userData.role as AdminRole;
              
              setUser(firebaseUser);
              setRole(userRole);
              setIsAdmin(true);
            } else {
              await signOut(auth);
              setUser(null);
              setRole(null);
              setIsAdmin(false);
            }
          } catch (e) {
            console.error("Auth sync error:", e);
          }
        } else {
          setUser(null);
          setRole(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      });

      return () => unsubscribeAuth();
    }, delay);

    return () => clearTimeout(timer);
  }, [showLogin]);

  // Keyboard shortcut: Ctrl+Shift+A & Activation link handler
  useEffect(() => {
    const isAdminUnlocked = localStorage.getItem('sc_admin_unlocked') === 'true';
    if (!isAdminUnlocked) return;

    // Check for activation link flag
    const shouldShowLogin = sessionStorage.getItem('sc_show_admin_login') === 'true';
    if (shouldShowLogin) {
      sessionStorage.removeItem('sc_show_admin_login');
      setShowLogin(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowLogin(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoginError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLogin(false);
      return true;
    } catch (err: any) {
      console.error('Login failed', err);
      setLoginError('Login failed. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      setUser(null);
      setRole(null);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }, []);

  const hasPermission = useCallback((requiredRole: AdminRole) => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  }, [role]);

  const handleSetShowLogin = useCallback((show: boolean) => {
    if (show) localStorage.setItem('sc_admin_unlocked', 'true');
    setShowLogin(show);
  }, []);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value: AdminContextType = {
    isAdmin,
    user,
    role,
    showLogin,
    loginError,
    isLoading,
    setShowLogin: handleSetShowLogin,
    login,
    logout,
    hasPermission,
    clearLoginError,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// Lightweight mock provider for visitors (for types only)
export function InertAdminProvider({ children }: { children: React.ReactNode }) {
  const value: AdminContextType = {
    isAdmin: false,
    user: null,
    role: null,
    showLogin: false,
    loginError: null,
    isLoading: false,
    setShowLogin: () => {},
    login: async () => false,
    logout: async () => {},
    hasPermission: () => false,
    clearLoginError: () => {},
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}
