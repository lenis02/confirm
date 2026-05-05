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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded shadow-lg w-full max-w-md">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">새 프로젝트 생성</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer leading-none text-xl">×</button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">프로젝트명 <span className="text-red-400">*</span></label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="프로젝트명을 입력하세요"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">설명</label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-400"
              placeholder="프로젝트 설명"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >취소</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
            >{loading ? '생성 중...' : '생성'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '진행 중', cls: 'bg-orange-50 text-orange-600 border border-orange-200' },
  ARCHIVED: { label: '완료', cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-800">내 프로젝트</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 transition cursor-pointer"
        >+ 새 프로젝트</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-sm mb-1">프로젝트가 없습니다</p>
          <p className="text-xs">새 프로젝트를 생성해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map(p => {
            const st = STATUS_LABEL[p.status];
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="bg-white border border-gray-200 rounded p-4 hover:border-orange-300 hover:shadow-sm transition block cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{p.name}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                {p.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
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
