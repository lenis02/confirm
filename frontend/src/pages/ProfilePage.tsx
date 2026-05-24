import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import type { User, UserIntegration } from '../types';

const JOB_TITLES = ['PM', '개발자', '디자이너', 'QA', 'DevOps', '기타'];

const SERVICE_META: Record<string, { label: string; color: string; description: string }> = {
  NAVER_WORKS: {
    label: 'Naver Works',
    color: 'bg-green-50 text-green-700 border-green-200',
    description: '회의 결과 및 Action Item을 Naver Works 채널로 자동 전달합니다',
  },
  NOTION: {
    label: 'Notion',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    description: '회의록 및 WBS를 Notion 데이터베이스에 자동 동기화합니다',
  },
};

// ── 프로필 섹션 ───────────────────────────────────────────────────────────────
function ProfileSection() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', jobTitle: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    usersApi.getMe().then(u => {
      setUser(u);
      setForm({ name: u.name, jobTitle: u.jobTitle ?? '' });
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await usersApi.updateMe({
        name: form.name,
        ...(form.jobTitle && { jobTitle: form.jobTitle }),
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">내 프로필</h2>
        {saved && <span className="text-xs text-green-600">저장되었습니다</span>}
      </div>

      {/* 아바타 + 이메일 */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-lg font-semibold shrink-0">
          {user.name?.[0] ?? '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
          {user.jobTitle && <p className="text-xs text-gray-500 mt-0.5">{user.jobTitle}</p>}
        </div>
      </div>

      {/* 수정 폼 */}
      <form onSubmit={submit} className="space-y-3 pt-1">
        <div>
          <label className="text-xs text-gray-500 block mb-1">이름 <span className="text-red-400">*</span></label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">이메일</label>
          <input
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            value={user.email}
            disabled
          />
          <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">직군 / 역할</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400 cursor-pointer bg-white"
            value={form.jobTitle}
            onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
          >
            <option value="">선택 안 함</option>
            {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          {saved && <span className="text-xs text-green-600">저장됐습니다</span>}
        </div>
      </form>
    </section>
  );
}

// ── 외부 서비스 연동 섹션 ─────────────────────────────────────────────────────
function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    usersApi.getIntegrations().then(setIntegrations).catch(() => {});
  }, []);

  const add = async (serviceType: string) => {
    if (!tokenInput.trim()) return;
    setLoading(true);
    try {
      const result = await usersApi.addIntegration({ serviceType, accessToken: tokenInput.trim() });
      setIntegrations(prev => [...prev.filter(i => i.serviceType !== serviceType), result]);
      setAddingFor(null);
      setTokenInput('');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (integration: UserIntegration) => {
    setRemoving(integration.id);
    try {
      await usersApi.removeIntegration(integration.id);
      setIntegrations(prev => prev.filter(i => i.id !== integration.id));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">외부 서비스 연동</h2>
        <p className="text-xs text-gray-400 mt-0.5">확정된 회의 결과를 외부 협업 도구로 자동 전달합니다</p>
      </div>

      <div className="space-y-3">
        {Object.entries(SERVICE_META).map(([type, meta]) => {
          const integration = integrations.find(i => i.serviceType === type);
          const isConnected = !!integration;
          const isExpired = integration?.status === 'EXPIRED';
          const isAdding = addingFor === type;

          return (
            <div key={type} className="border border-gray-200 rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs px-2 py-0.5 border rounded font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                  {isConnected && !isExpired && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                      연결됨
                    </span>
                  )}
                  {isExpired && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />
                      만료됨
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {isConnected && (
                    <button
                      onClick={() => remove(integration)}
                      disabled={removing === integration.id}
                      className="text-xs text-red-500 hover:text-red-600 transition cursor-pointer disabled:opacity-50"
                    >
                      {removing === integration.id ? '해제 중...' : '연동 해제'}
                    </button>
                  )}
                  {(!isConnected || isExpired) && !isAdding && (
                    <button
                      onClick={() => { setAddingFor(type); setTokenInput(''); }}
                      className="text-xs border border-orange-400 text-orange-600 px-2.5 py-1 rounded hover:bg-orange-50 transition cursor-pointer"
                    >
                      {isExpired ? '재연동' : '연동'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500">{meta.description}</p>

              {/* 토큰 입력 폼 */}
              {isAdding && (
                <div className="space-y-2 pt-1">
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    placeholder={`${meta.label} API 토큰 입력`}
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                  />
                  <p className="text-xs text-gray-400">
                    토큰은 서버에서 AES-256 암호화 후 안전하게 저장됩니다
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAddingFor(null); setTokenInput(''); }}
                      className="flex-1 border border-gray-300 rounded py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => add(type)}
                      disabled={loading || !tokenInput.trim()}
                      className="flex-1 bg-orange-500 text-white rounded py-1.5 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? '연동 중...' : '연동 완료'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-base font-semibold text-gray-800">계정 설정</h1>
      <ProfileSection />
      <IntegrationsSection />
    </div>
  );
}
