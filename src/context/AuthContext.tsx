import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { fetchMe } from '../api/authApi';

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  credentials: { username: string; password: string } | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_USER_KEY = 'bg_username';
const STORAGE_PASS_KEY = 'bg_password';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [initializing, setInitializing] = useState(true);

  // On mount, try to rehydrate from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem(STORAGE_USER_KEY);
    const storedPassword = localStorage.getItem(STORAGE_PASS_KEY);
    if (storedUsername && storedPassword) {
      fetchMe(storedUsername, storedPassword)
        .then((authUser) => {
          setUser(authUser);
          setCredentials({ username: storedUsername, password: storedPassword });
        })
        .catch(() => {
          // 401 or network error — clear storage
          localStorage.removeItem(STORAGE_USER_KEY);
          localStorage.removeItem(STORAGE_PASS_KEY);
        })
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const authUser = await fetchMe(username, password);
    setUser(authUser);
    setCredentials({ username, password });
    localStorage.setItem(STORAGE_USER_KEY, username);
    localStorage.setItem(STORAGE_PASS_KEY, password);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCredentials(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_PASS_KEY);
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, credentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
