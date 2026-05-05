import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
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
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-5">프로필 설정</h2>

      <div className="bg-white border border-gray-200 rounded">
        {/* 아바타 + 이메일 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0">
            {user.name[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">이름 <span className="text-red-400">*</span></label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">이메일</label>
            <input
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              value={user.email}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">직군</label>
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
      </div>
    </div>
  );
}
