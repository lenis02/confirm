import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
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
    <Modal title="새 프로젝트 그룹" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[11px] text-works-subtle bg-works-hover rounded-lg px-3 py-2 leading-relaxed">
          그룹을 만들면 메시지방·노트·캘린더·드라이브가 자동 구성되고, 생성 후 팀원을 초대할 수 있습니다.
        </p>
        <div>
          <label className="block text-xs font-medium text-works-muted mb-1.5">그룹명 <span className="text-red-400">*</span></label>
          <input className="input-field" placeholder="예) 신규 서비스 런칭 TF" required
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-works-muted mb-1.5">설명</label>
          <textarea className="input-field resize-none" placeholder="프로젝트 목표·범위 간단 설명" rows={2}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-works-muted mb-1.5">목표 기간</label>
          <div className="flex items-center gap-2">
            <input type="date" className="input-field"
              value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <span className="text-works-subtle">~</span>
            <input type="date" className="input-field"
              value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <p className="text-[11px] text-works-subtle mt-1.5">AI가 이 기간에 맞춰 WBS 일정을 계산합니다.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? '생성 중...' : '그룹 만들기'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '진행 중', cls: 'bg-brand-50 text-brand-700 border-brand-100' },
  ARCHIVED: { label: '완료', cls: 'bg-works-hover text-works-muted border-works-border' },
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
    <div className="page-shell">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">워크스페이스</h1>
          <p className="page-subtitle">프로젝트 그룹별 통합 리소스 · WBS · 회의 관리</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          그룹 만들기
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            title="아직 워크스페이스가 없습니다"
            description="프로젝트 그룹을 만들면 메시지·노트·캘린더·드라이브가 자동 구성됩니다"
            action={<button onClick={() => setShowModal(true)} className="btn-primary">+ 그룹 만들기</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => {
            const st = STATUS[p.status];
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="card p-5 hover:shadow-card-hover hover:border-brand-200 transition group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition">
                    <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </div>
                <h3 className="text-base font-semibold text-works-text truncate group-hover:text-brand-700 transition">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-works-muted line-clamp-2 mt-1.5 leading-relaxed">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-3">
                  {['메시지', '노트', '캘린더', '드라이브'].map(r => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-md bg-works-hover text-works-subtle">{r}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-works-subtle mt-4 pt-3 border-t border-works-border">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {p.members?.length ?? 0}명
                  </span>
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
