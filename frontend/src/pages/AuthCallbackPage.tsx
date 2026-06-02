import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      login(accessToken, refreshToken);
      queueMicrotask(() => navigate('/', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-works-bg flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center"><Spinner size="lg" /></div>
        <p className="text-sm text-works-muted mt-4">로그인 처리 중...</p>
      </div>
    </div>
  );
}
