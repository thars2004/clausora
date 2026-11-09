import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { User, UserRole, DEMO_USERS } from '@clausora/shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (persona: 'client' | 'provider' | 'judge') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const savedUser = localStorage.getItem('clausora_user');
      const token = localStorage.getItem('clausora_token');
      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser));
          const res = await api.get('/auth/me');
          if (res.data.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('clausora_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          localStorage.removeItem('clausora_token');
          localStorage.removeItem('clausora_user');
          setUser(null);
        }
      } else {
        // Auto-seed initial client for immediate preview if not logged in
        try {
          await switchPersona('client');
        } catch {
          // ignore
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    const { user: userData, token } = res.data.data;
    setUser(userData);
    localStorage.setItem('clausora_token', token);
    localStorage.setItem('clausora_user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, pass: string, role: UserRole) => {
    const res = await api.post('/auth/register', { name, email, password: pass, role });
    const { user: userData, token } = res.data.data;
    setUser(userData);
    localStorage.setItem('clausora_token', token);
    localStorage.setItem('clausora_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('clausora_token');
    localStorage.removeItem('clausora_user');
  };

  const switchPersona = async (persona: 'client' | 'provider' | 'judge') => {
    setLoading(true);
    try {
      const res = await api.post('/auth/demo-switch', { persona });
      const { user: userData, token } = res.data.data;
      setUser(userData);
      localStorage.setItem('clausora_token', token);
      localStorage.setItem('clausora_user', JSON.stringify(userData));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchPersona }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
