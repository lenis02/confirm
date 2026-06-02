import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import Spinner from '../components/ui/Spinner';
import type { User } from '../types';

const JOB_TITLES = ['PM', '개발자', '디자이너', 'QA', 'DevOps', '기타'];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', jobTitle: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    usersApi.getMe().then(u => {
      setUser(u);
      setForm({ name: u.name, jobTitle: u.jobTitle ?? '' });
    });
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
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }

  return (
    <div className="page-shell max-w-xl">
      <div className="mb-6">
        <h1 className="page-title">프로필</h1>
        <p className="page-subtitle">계정 정보 및 직군 설정</p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-brand-50 to-white border-b border-works-border flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-sm">
            {user.name[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-works-text">{user.name}</p>
            <p className="text-sm text-works-muted">{user.email}</p>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-works-muted mb-1.5">이름 <span className="text-red-400">*</span></label>
            <input className="input-field" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-works-muted mb-1.5">이메일</label>
            <input className="input-field bg-works-bg text-works-subtle cursor-not-allowed" value={user.email} disabled />
            <p className="text-xs text-works-subtle mt-1">이메일은 변경할 수 없습니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-works-muted mb-1.5">직군</label>
            <select className="input-field cursor-pointer"
              value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}>
              <option value="">선택 안 함</option>
              {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '저장 중...' : '저장'}
            </button>
            {saved && (
              <span className="text-xs text-brand-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                저장됐습니다
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
