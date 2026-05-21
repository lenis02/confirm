import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useToast } from '../context/ToastContext';
import { PROJECT_PALETTE, getProjectColor, setProjectColor } from '../utils/projectColors';
import type { Project } from '../types';

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">프로젝트 색상</label>
      <div className="flex gap-2 flex-wrap">
        {PROJECT_PALETTE.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded-full transition-transform cursor-pointer focus:outline-none"
            style={{ backgroundColor: color, transform: value === color ? 'scale(1.25)' : 'scale(1)', outline: value === color ? `2px solid ${color}` : 'none', outlineOffset: '2px' }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [selectedColor, setSelectedColor] = useState(PROJECT_PALETTE[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const created = await projectsApi.create({
        name: form.name,
        ...(form.description && { description: form.description }),
        ...(form.startDate && { startDate: form.startDate }),
        ...(form.endDate && { endDate: form.endDate }),
      });
      setProjectColor(created.id, selectedColor);
      window.dispatchEvent(new CustomEvent('confirm:projects:changed'));
      toast('프로젝트가 생성되었습니다', 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded shadow-lg w-full max-w-md">
        {/* 모달 헤더 — 선택된 색상으로 상단 바 표시 */}
        <div
          className="h-1.5 rounded-t"
          style={{ backgroundColor: selectedColor }}
        />
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <h3 className="text-sm font-semibold text-gray-800">새 프로젝트 생성</h3>
          </div>
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

          <ColorPicker value={selectedColor} onChange={setSelectedColor} />

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >취소</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 text-white rounded py-2 text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: selectedColor }}
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
  // 색상 변경 감지를 위해 렌더 카운터 사용
  const [colorVersion, setColorVersion] = useState(0);

  const load = () => {
    setLoading(true);
    projectsApi.list().then(setProjects).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreated = () => {
    load();
    setColorVersion(v => v + 1);
  };

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
            const color = getProjectColor(p.id);
            // colorVersion을 참조해서 색상 갱신 트리거
            void colorVersion;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-sm transition block cursor-pointer"
              >
                {/* 색상 상단 바 */}
                <div className="h-1.5" style={{ backgroundColor: color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{p.name}</h3>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <span>팀원 {p.members?.length ?? 0}명</span>
                    {p.startDate && <span>{p.startDate} ~ {p.endDate ?? '미정'}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
