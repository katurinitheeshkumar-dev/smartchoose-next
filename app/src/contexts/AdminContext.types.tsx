import React, { createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

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

// Extremely lightweight mock provider for visitors
export function InertAdminProvider({ children }: { children: React.ReactNode }) {
  const value: AdminContextType = {
    isAdmin: false,
    user: null,
    role: null,
    showLogin: false,
    loginError: null,
    isLoading: false,
    setShowLogin: () => {}, // Do nothing
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
