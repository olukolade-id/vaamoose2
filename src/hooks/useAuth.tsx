import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (name: string, email: string, password: string, phone?: string, schoolId?: string, parentEmail?: string) => Promise<boolean | 'exists'>;
  logout: () => void;
  updateUser: (updates: Partial<User & { profilePhoto?: string }>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = 'https://blissful-exploration-production.up.railway.app/api/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe = false
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    schoolId?: string,
    parentEmail?: string
  ): Promise<boolean | 'exists'> => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          phoneNumber: phone,
          university: schoolId,
          parentEmail,
        }),
      });
      const data = await res.json();
      if (
        res.status === 409 ||
        data.error?.toLowerCase().includes('exists') ||
        data.error?.toLowerCase().includes('duplicate') ||
        data.error?.toLowerCase().includes('already')
      ) {
        return 'exists';
      }
      if (!res.ok) return false;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  // Updates user in context AND storage instantly — no re-login needed
  const updateUser = useCallback((updates: Partial<User & { profilePhoto?: string }>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      if (localStorage.getItem('token')) {
        localStorage.setItem('user', JSON.stringify(updated));
      } else {
        sessionStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}