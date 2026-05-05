import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      // flushSync: state 업데이트를 동기적으로 flush한 뒤 navigate 실행
      // 없으면 PrivateRoute가 isAuthenticated=false로 평가해 /login으로 튕김
      flushSync(() => {
        login(accessToken, refreshToken);
      });
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">로그인 처리 중...</p>
      </div>
    </div>
  );
}
