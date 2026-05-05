import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await projectsApi.create({
        name: form.name,
        ...(form.description && { description: form.description }),
        ...(form.startDate && { startDate: form.startDate }),
        ...(form.endDate && { endDate: form.endDate }),
      });
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">새 프로젝트</h3>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="프로젝트명 *" required
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="설명" rows={2}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2">
            <input type="date" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="시작일"
              value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <input type="date" className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="종료일"
              value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '진행 중', cls: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: '완료', cls: 'bg-gray-100 text-gray-600' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    projectsApi.list().then(setProjects).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">내 프로젝트</h2>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + 새 프로젝트
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">프로젝트가 없습니다</p>
          <p className="text-sm">새 프로젝트를 생성해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const st = STATUS_LABEL[p.status];
            return (
              <Link key={p.id} to={`/projects/${p.id}`}
                className="bg-white border rounded-xl p-5 hover:shadow-md transition block">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 truncate">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>팀원 {p.members?.length ?? 0}명</span>
                  {p.startDate && <span>{p.startDate} ~ {p.endDate ?? '미정'}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
