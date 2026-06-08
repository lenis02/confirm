export default function LoginPage() {
  return (
    <div className="min-h-screen bg-works-bg flex">
      {/* 좌측 브랜드 패널 */}
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-64 h-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white text-lg font-bold">C</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Conf:rm</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            PM을 위한<br />AI 프로젝트 어시스턴트
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs">
            수행계획서 업로드 → WBS 자동 생성 → 회의 실시간 어시스트 → 의사결정 이력 관리
          </p>
        </div>
        <div className="relative space-y-3">
          {['WBS 자동 생성', '회의 체크리스트 검증', 'Action Item 이월'].map(f => (
            <div key={f} className="flex items-center gap-2.5 text-white/90 text-sm">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="text-xl font-bold text-works-text">Conf:rm</span>
          </div>

          <h2 className="text-2xl font-bold text-works-text mb-1">시작하기</h2>
          <p className="text-sm text-works-muted mb-8">Google 계정으로 로그인하세요</p>

          <a
            href={`${import.meta.env.VITE_API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white border border-works-border
              rounded-2xl px-4 py-3.5 text-sm text-works-text font-medium
              hover:bg-works-hover hover:shadow-card transition cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 계정으로 로그인
          </a>

          <p className="text-xs text-works-subtle text-center mt-6">
            로그인 시 서비스 이용약관에 동의하는 것으로 간주됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
