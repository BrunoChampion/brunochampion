import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, User } from '../lib/api';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  completeOAuthLogin: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const response = await authAPI.getSession();
      const sessionUser = response.data?.user ?? null;
      setUser(sessionUser);
      return { success: Boolean(sessionUser) };
    } catch (error: any) {
      const normalizedError = error?.response?.data?.message || 'Unable to fetch session';
      setUser(null);
      return {
        success: false,
        error: normalizedError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      await authAPI.signInEmail({ email, password });
      await checkAuth();
      router.push('/dashboard');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || 'Login failed',
      };
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      await authAPI.signUpEmail({ email, password, name });
      await checkAuth();
      router.push('/dashboard');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const completeOAuthLogin = useCallback(
    async () => {
      const deadline = Date.now() + 8000;
      let lastError: string | undefined;

      while (Date.now() < deadline) {
        const result = await checkAuth();
        if (result.success) {
          router.push('/dashboard');
          return result;
        }

        lastError = result.error;
        await new Promise((resolve) => setTimeout(resolve, 750));
      }

      return {
        success: false,
        error: lastError || 'Unable to complete OAuth login',
      };
    },
    [checkAuth, router],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, completeOAuthLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
