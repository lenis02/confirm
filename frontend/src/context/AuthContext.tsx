import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { usersApi } from '../api/users';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // 토큰이 있으면 검증이 끝날 때까지 loading. 없으면 즉시 비로그인 확정.
  const [loading, setLoading] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    // 부팅 시 /me 호출로 토큰 유효성 검증. 401이면 client 인터셉터가
    // refresh 또는 토큰 정리 후 /login 리다이렉트를 처리한다.
    usersApi
      .getMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
