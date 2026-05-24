import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { projectsApi } from './api/projects';
import { getProjectColor } from './utils/projectColors';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectCalendarPage from './pages/ProjectCalendarPage';
import MeetingDetailPage from './pages/MeetingDetailPage';
import ProfilePage from './pages/ProfilePage';
import AgentPage from './pages/AgentPage';
import type { Project } from './types';

function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = () => {
    projectsApi.list().then(setProjects).catch(() => {});
  };

  useEffect(() => {
    loadProjects();
    window.addEventListener('confirm:projects:changed', loadProjects);
    return () => window.removeEventListener('confirm:projects:changed', loadProjects);
  }, []);

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* 로고 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900 tracking-tight">Conf:rm</span>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-0.5">

          {/* 대시보드 */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            대시보드
          </NavLink>

          {/* ── Projects 섹션 ── */}
          {activeProjects.length > 0 && (
            <div className="mt-1">
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Projects
              </p>
              <div className="space-y-0.5">
                {activeProjects.map(p => {
                  const color = getProjectColor(p.id);
                  return (
                    <NavLink
                      key={p.id}
                      to={`/projects/${p.id}/calendar`}
                      className={({ isActive }) =>
                        `flex items-center gap-2 pl-4 pr-2 py-1.5 rounded text-xs transition ${
                          isActive
                            ? 'bg-orange-50 text-orange-600 font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }`
                      }
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate">{p.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* 구분선 */}
          <div className="border-t border-gray-100 my-1.5" />

          {/* 프로젝트 관리 */}
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            프로젝트 관리
          </NavLink>

          {/* PM 에이전트 */}
          <NavLink
            to="/agent"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            PM 에이전트
          </NavLink>
        </nav>

        {/* 하단 */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition ${
                isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            계정 설정
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"         element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route path="/"                        element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
            <Route path="/projects"                element={<PrivateRoute><Layout><ProjectsPage /></Layout></PrivateRoute>} />
            <Route path="/projects/:id"            element={<PrivateRoute><Layout><ProjectDetailPage /></Layout></PrivateRoute>} />
            <Route path="/projects/:id/calendar"   element={<PrivateRoute><Layout><ProjectCalendarPage /></Layout></PrivateRoute>} />
            <Route path="/meetings/:meetingId"     element={<PrivateRoute><Layout><MeetingDetailPage /></Layout></PrivateRoute>} />
            <Route path="/profile"                 element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />
            <Route path="/agent"                   element={<PrivateRoute><Layout><AgentPage /></Layout></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
