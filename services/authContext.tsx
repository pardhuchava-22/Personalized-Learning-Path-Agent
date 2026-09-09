/**
 * Auth Context — provides user state across the entire app.
 * Reads from localStorage on mount, validates with API.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from './apiService';

interface AuthUser {
  id: number | string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  institution?: string;
  department?: string;
  profile_picture?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount — check if we have a stored session
  useEffect(() => {
    const initAuth = async () => {
      if (authAPI.isLoggedIn()) {
        try {
          const profile = await authAPI.getProfile();
          setUser(profile);
        } catch {
          // Token expired or invalid
          authAPI.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthUser> => {
    const { user: userData } = await authAPI.login(username, password);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    authAPI.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (authAPI.isLoggedIn()) {
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
      } catch {
        authAPI.logout();
        setUser(null);
      }
    }
  }, []);

  const updateProfile = useCallback(async (data: any): Promise<AuthUser> => {
    const updated = await authAPI.updateProfile(data);
    setUser(prev => prev ? { ...prev, ...updated } : updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
