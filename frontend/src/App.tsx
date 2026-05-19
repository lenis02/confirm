import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import ProfilePage from './pages/ProfilePage';

function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900 tracking-tight">Conf:rm</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <NavLink to="/" end className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
          }>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            대시보드
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
          }>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            프로젝트
          </NavLink>
        </nav>
        <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
          <NavLink to="/profile" className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
          }>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            프로필
          </NavLink>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition cursor-pointer w-full text-left"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Layout><ProjectsPage /></Layout></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><Layout><ProjectDetailPage /></Layout></PrivateRoute>} />
          <Route path="/meetings/:id" element={<PrivateRoute><Layout><MeetingDetailPage /></Layout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
