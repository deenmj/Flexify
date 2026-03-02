import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<string>;
  logout: () => void;
  setUserFromToken: (token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const saveAuth = useCallback((userData: User, tokenStr: string) => {
    const normalized: User = {
      ...userData,
      id: userData.id || userData._id || '',
      verified: userData.verified || false,
      isKycVerified: userData.isKycVerified || false,
      verificationStatus: userData.verificationStatus || 'not_submitted',
    };
    setUser(normalized);
    setToken(tokenStr);
    localStorage.setItem('user', JSON.stringify(normalized));
    localStorage.setItem('token', tokenStr);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const userData = await authApi.me();
      saveAuth(userData, t);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [saveAuth, logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    saveAuth(data.user, data.token);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await authApi.signup(name, email, password);
    return data.message;
  };

  const setUserFromToken = async (tokenStr: string) => {
    localStorage.setItem('token', tokenStr);
    setToken(tokenStr);
    try {
      const userData = await authApi.me();
      saveAuth(userData, tokenStr);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, setUserFromToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
