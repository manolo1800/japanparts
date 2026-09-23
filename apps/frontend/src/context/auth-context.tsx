'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, UserRole } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';

interface AuthContextType {
  user: UserSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isBodega: boolean;
  isVendedor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedUser = localStorage.getItem('current_user');
      const token = localStorage.getItem('access_token');

      if (token) {
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {}
        }
        try {
          const res = await apiClient.get<UserSummary>('/auth/me');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('current_user', JSON.stringify(res.data));
          }
        } catch {
          // Token expired or invalid
          setUser(null);
          apiClient.clearTokens();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiClient.post<any>('/auth/login', { email, password });
      if (res.data) {
        apiClient.setTokens({
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
        });
        setUser(res.data.user);
        localStorage.setItem('current_user', JSON.stringify(res.data.user));
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.rol === UserRole.ADMIN;
  const isBodega = user?.rol === UserRole.BODEGA || isAdmin;
  const isVendedor = user?.rol === UserRole.VENDEDOR || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isBodega,
        isVendedor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
