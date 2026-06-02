import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { meetingsApi } from '../api/meetings';
import { actionItemsApi } from '../api/actionItems';
import Spinner from '../components/ui/Spinner';
import type { Project, Document, ProjectWbs, WbsItem, Meeting, ActionItem } from '../types';
import WbsGanttChart, { ROLE_BAR_PALETTE } from '../components/WbsGanttChart';
import WbsCalendar from '../components/WbsCalendar';
import WbsItemEditModal from '../components/WbsItemEditModal';

type Tab = 'overview' | 'wbs' | 'meetings' | 'members' | 'actions';

const ROLES = ['PM', 'DEVELOPER', 'DESIGNER', 'QA', 'DEVOPS', 'OTHER'] as const;

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};
const MEETING_TYPE_COLOR: Record<string, string> = {
  KICKOFF: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROGRESS_CHECK: 'bg-brand-50 text-brand-600 border-brand-100',
  ISSUE_CHECK: 'bg-red-50 text-red-600 border-red-200',
  CONSENSUS: 'bg-green-50 text-green-700 border-green-200',
};
const MEETING_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: '예정', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  IN_PROGRESS: { label: '진행 중', cls: 'bg-brand-50 text-brand-600 border-brand-100' },
  COMPLETED: { label: '완료', cls: 'bg-green-50 text-green-700 border-green-200' },
};
const COMPLEXITY_COLOR: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border-red-200',
  Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
};
const COMPLEXITY_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

type WbsSortKey = 'id' | 'title' | 'assignedRole' | 'complexity' | 'durationDays' | 'startDate' | 'endDate';

const WBS_COLUMNS: { key: WbsSortKey | null; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '태스크명' },
  { key: 'assignedRole', label: '부서' },
  { key: 'complexity', label: '복잡도' },
  { key: 'durationDays', label: '기간' },
  { key: 'startDate', label: '시작일' },
  { key: 'endDate', label: '종료일' },
  { key: null, label: '확인' },
  { key: null, label: '삭제' },
];
const ROLE_COLOR: Record<string, string> = {
  PM: 'bg-brand-50 text-brand-600 border-brand-100',
  DEVELOPER: 'bg-gray-50 text-gray-700 border-gray-200',
  DESIGNER: 'bg-pink-50 text-pink-700 border-pink-200',
  QA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DEVOPS: 'bg-red-50 text-red-600 border-red-200',
  OTHER: 'bg-gray-50 text-gray-500 border-gray-200',
};

// ── WBS 탭 ────────────────────────────────────────────────────────────────────
function WbsTab({ project }: { project: Project }) {
  const projectId = project.id;
  const [docs, setDocs] = useState<Document[]>([]);
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);
  const [wbsError, setWbsError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modalItem, setModalItem] = useState<WbsItem | null>(null);
  const [sortKey, setSortKey] = useState<WbsSortKey>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'member'>('table');
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadDocs = () => projectsApi.listDocuments(projectId).then(setDocs);
  const loadWbs = () =>
    projectsApi.getWbs(projectId)
      .then(w => { setWbs(w); setWbsError(false); })
      .catch(() => setWbsError(true));

  useEffect(() => {
    loadDocs(); loadWbs();
    return () => clearInterval(pollRef.current);
  }, [projectId]);

  useEffect(() => {
    const processing = docs.some(d => d.status === 'PENDING' || d.status === 'IN_PROGRESS');
    clearInterval(pollRef.current);
    if (processing) {
      pollRef.current = setInterval(async () => {
        await loadDocs(); await loadWbs();
        const latest = await projectsApi.listDocuments(projectId);
        if (latest.every(d => d.status === 'COMPLETED' || d.status === 'FAILED'))
          clearInterval(pollRef.current);
      }, 3000);
    }
  }, [docs, projectId]);

  const uploadFile = async (file: File) => {
    setUploading(true); setWbsError(false);
    try { await projectsApi.uploadDocument(projectId, file); await loadDocs(); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading || isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) uploadFile(file);
  };

  const removeDoc = async (d: Document) => {
    const processing = d.status === 'PENDING' || d.status === 'IN_PROGRESS';
    if (!window.confirm(processing ? '분석을 취소하시겠습니까?' : '문서를 삭제하시겠습니까?')) return;
    await projectsApi.deleteDocument(projectId, d.id);
    await loadDocs();
  };

  const confirm = async () => {
    setConfirming(true);
    try { setWbs(await projectsApi.confirmWbs(projectId)); }
    finally { setConfirming(false); }
  };

  const toggleDecision = async (itemId: string, current: boolean) => {
    const updated = await projectsApi.updateWbsItem(projectId, itemId, { isDecisionPoint: !current });
    setWbs(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? updated : i) } : prev);
  };

  const removeWbs = async () => {
    if (!window.confirm('WBS 전체를 삭제하시겠습니까? 모든 태스크가 함께 삭제됩니다.')) return;
    await projectsApi.deleteWbs(projectId);
    setWbs(null);
    setWbsError(false);
  };

  const openItemModal = (item: WbsItem) => setModalItem(item);

  const removeItem = async (item: WbsItem) => {
    if (!window.confirm(`'${item.title}' 항목을 삭제하시겠습니까?`)) return;
    await projectsApi.deleteWbsItem(projectId, item.id);
    setModalItem(null);
    await loadWbs(); // 삭제 후 재정렬된 ID 반영을 위해 다시 로드
  };

  const isProcessing = docs.some(d => d.status === 'PENDING' || d.status === 'IN_PROGRESS');

  const handleSort = (key: WbsSortKey) => {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedItems = wbs
    ? [...wbs.items].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'id': cmp = a.order - b.order; break;
          case 'title': cmp = a.title.localeCompare(b.title); break;
          case 'assignedRole': cmp = (a.assignedRole ?? '').localeCompare(b.assignedRole ?? ''); break;
          case 'complexity': cmp = (COMPLEXITY_RANK[a.complexity ?? ''] ?? 0) - (COMPLEXITY_RANK[b.complexity ?? ''] ?? 0); break;
          case 'durationDays': cmp = (a.durationDays ?? 0) - (b.durationDays ?? 0); break;
          case 'startDate': cmp = (a.startDate ?? '').localeCompare(b.startDate ?? ''); break;
          case 'endDate': cmp = (a.endDate ?? '').localeCompare(b.endDate ?? ''); break;
        }
        return sortAsc ? cmp : -cmp;
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-brand-50/60 border border-brand-100 rounded-xl px-4 py-3">
        <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-works-text">
            목표 기간{' '}
            {project.startDate
              ? <span className="text-brand-700">{project.startDate} ~ {project.endDate ?? '미정'}</span>
              : <span className="text-works-subtle">미설정</span>}
          </p>
          <p className="text-[11px] text-works-subtle mt-0.5">
            사업계획서를 분석해 이 기간 안에서 팀원별 업무 선후 관계와 소요 일정을 계산한 WBS를 자동 생성합니다.
          </p>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 rounded p-5 text-center transition ${
          dragging
            ? 'border-solid border-brand-300 bg-brand-50'
            : 'border-dashed border-gray-200 bg-gray-50'
        }`}
      >
        <svg
          className={`w-8 h-8 mx-auto mb-2 transition ${dragging ? 'text-brand-500' : 'text-gray-300'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <p className="text-xs text-gray-400 mb-3">수행계획서(PDF)를 끌어다 놓거나 선택하면 AI가 WBS를 자동 생성합니다</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onInputChange} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || isProcessing}
          className="border border-brand-300 text-brand-600 px-4 py-1.5 rounded text-sm hover:bg-brand-50 transition disabled:opacity-50 cursor-pointer">
          {uploading ? '업로드 중...' : '파일 선택'}
        </button>
      </div>

      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded px-4 py-2.5 text-sm">
              <span className="flex-1 truncate text-gray-700">{d.fileName}</span>
              {(d.status === 'PENDING' || d.status === 'IN_PROGRESS') ? (
                <span className="flex items-center gap-1.5 text-xs text-brand-500">
                  <span className="w-3.5 h-3.5 border-2 border-brand-300 border-t-transparent rounded-full animate-spin inline-block" />분석 중
                </span>
              ) : d.status === 'COMPLETED' ? (
                <span className="text-xs text-green-600">완료</span>
              ) : <span className="text-xs text-red-500">실패</span>}
              <button onClick={() => removeDoc(d)}
                className={`text-xs border px-2 py-0.5 rounded transition cursor-pointer ${
                  d.status === 'PENDING' || d.status === 'IN_PROGRESS'
                    ? 'border-gray-300 text-gray-500 hover:bg-gray-50'
                    : 'border-red-200 text-red-400 hover:bg-red-50'
                }`}>
                {d.status === 'PENDING' || d.status === 'IN_PROGRESS' ? '취소' : '삭제'}
              </button>
            </div>
          ))}
        </div>
      )}

      {wbs && !wbsError && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">WBS</span>
              <span className={`text-xs px-1.5 py-0.5 border rounded ${wbs.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                {wbs.status === 'CONFIRMED' ? '확정' : '초안'}
              </span>
              <div className="inline-flex border border-gray-200 rounded overflow-hidden ml-1">
                <button onClick={() => setViewMode('table')}
                  className={`text-xs px-2 py-0.5 transition cursor-pointer ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  표
                </button>
                <button onClick={() => setViewMode('chart')}
                  className={`text-xs px-2 py-0.5 transition cursor-pointer border-l border-gray-200 ${viewMode === 'chart' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  차트
                </button>
                <button onClick={() => setViewMode('member')}
                  className={`text-xs px-2 py-0.5 transition cursor-pointer border-l border-gray-200 ${viewMode === 'member' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  부서별
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {wbs.status === 'DRAFT' && (
                <button onClick={confirm} disabled={confirming}
                  className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
                  {confirming ? '확정 중...' : 'WBS 확정'}
                </button>
              )}
              <button onClick={removeWbs}
                className="border border-red-200 text-red-500 px-3 py-1.5 rounded text-sm hover:bg-red-50 transition cursor-pointer">
                전체 삭제
              </button>
            </div>
          </div>
          {wbs.projectSummary && (
            <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded px-3 py-2 mb-3">{wbs.projectSummary}</p>
          )}
          <TeamResourcesPanel projectId={projectId} wbs={wbs} onUpdated={setWbs} />
          {viewMode === 'chart' ? (
            <WbsGanttChart items={sortedItems} onItemClick={openItemModal} />
          ) : viewMode === 'member' ? (
            <WbsByMember items={sortedItems} onItemClick={openItemModal} />
          ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {WBS_COLUMNS.map(col => (
                    <th key={col.label} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                      {col.key ? (
                        <button onClick={() => handleSort(col.key!)}
                          className="flex items-center gap-1 hover:text-gray-700 transition cursor-pointer">
                          {col.label}
                          {sortKey === col.key && (
                            <span className="inline-flex flex-col leading-none text-[0.6rem]">
                              <span className={sortAsc ? 'text-gray-700' : 'text-gray-300'}>▲</span>
                              <span className={!sortAsc ? 'text-gray-700' : 'text-gray-300'}>▼</span>
                            </span>
                          )}
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.isDecisionPoint ? 'bg-brand-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs whitespace-nowrap">{item.taskId ?? `T${String(item.order).padStart(2, '0')}`}</td>
                    <td className="px-3 py-2 max-w-xs">
                      <button onClick={() => openItemModal(item)}
                        className="block w-full text-left text-sm font-medium text-gray-800 truncate hover:text-brand-600 hover:underline transition cursor-pointer">
                        {item.title}
                      </button>
                      {item.reasoning && <div className="text-xs text-gray-400 truncate">{item.reasoning}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{item.assignedRole}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {item.complexity && (
                        <span className={`text-xs px-1.5 py-0.5 border rounded ${COMPLEXITY_COLOR[item.complexity] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {item.complexity}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{item.durationDays}일</td>
                    <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{item.startDate ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{item.endDate ?? '-'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => toggleDecision(item.id, item.isDecisionPoint)}
                        className={`w-4 h-4 border flex items-center justify-center transition cursor-pointer rounded-sm ${item.isDecisionPoint ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 hover:border-brand-300'}`}>
                        {item.isDecisionPoint && <span className="text-xs leading-none">✓</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeItem(item)}
                        className="text-xs text-red-400 hover:text-red-600 transition cursor-pointer">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {modalItem && (
        <WbsItemEditModal
          projectId={projectId}
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSaved={updated => {
            setWbs(prev => prev ? { ...prev, items: prev.items.map(i => i.id === updated.id ? updated : i) } : prev);
            setModalItem(null);
          }}
          onDeleted={() => {
            setModalItem(null);
            loadWbs(); // 삭제 후 재정렬된 ID 반영을 위해 다시 로드
          }}
        />
      )}
    </div>
  );
}

// ── WBS 부서별 뷰 ─────────────────────────────────────────────────────────────
function WbsByMember({ items, onItemClick }: { items: WbsItem[]; onItemClick: (item: WbsItem) => void }) {
  if (items.length === 0) {
    return <div className="border border-gray-200 rounded p-8 text-center text-sm text-gray-400">태스크가 없습니다</div>;
  }
  const groups = new Map<string, WbsItem[]>();
  for (const it of items) {
    const role = it.assignedRole || '미지정';
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role)!.push(it);
  }
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([role, tasks], i) => {
        const c = ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length];
        const totalDays = tasks.reduce((s, t) => s + (t.durationDays ?? 0), 0);
        return (
          <div key={role} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
              <span className="text-sm font-semibold text-gray-800">{role}</span>
              <span className="text-xs text-gray-400 ml-auto">태스크 {tasks.length}개 · 총 {totalDays}일</span>
            </div>
            <div className="divide-y divide-gray-100">
              {tasks.map(t => (
                <button key={t.id} onClick={() => onItemClick(t)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition cursor-pointer">
                  <span className="text-gray-400 font-mono text-xs shrink-0">{t.taskId ?? `T${String(t.order).padStart(2, '0')}`}</span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{t.title}</span>
                  {t.isDecisionPoint && <span className="text-xs text-brand-600 shrink-0">◆ 의사결정</span>}
                  <span className="text-xs text-gray-400 shrink-0">{t.durationDays ?? 0}일</span>
                  <span className="hidden sm:block text-xs text-gray-400 shrink-0 w-40 text-right">{t.startDate ?? '-'} ~ {t.endDate ?? '-'}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 인식한 팀 구성 확인 패널 ──────────────────────────────────────────────────
type TeamRow = { department: string; role: string; experience_level: string };

function TeamResourcesPanel({
  projectId,
  wbs,
  onUpdated,
}: {
  projectId: string;
  wbs: ProjectWbs;
  onUpdated: (w: ProjectWbs) => void;
}) {
  const toRows = (w: ProjectWbs): TeamRow[] =>
    (w.teamResources ?? []).map(r => ({
      department: r.department ?? '',
      role: r.role ?? '',
      experience_level: r.experience_level ?? '',
    }));

  const [rows, setRows] = useState<TeamRow[]>(() => toRows(wbs));
  const [draft, setDraft] = useState<TeamRow>({ department: '', role: '', experience_level: '' });
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setRows(toRows(wbs));
    setConfirmed(false);
  }, [wbs.id, wbs.teamResources]);

  const updateRow = (i: number, key: keyof TeamRow, value: string) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const removeRow = (i: number) => { setRows(rs => rs.filter((_, idx) => idx !== i)); setConfirmed(false); };
  const addRow = () => {
    if (!draft.department.trim() && !draft.role.trim()) return;
    setRows(rs => [...rs, {
      department: draft.department.trim(),
      role: draft.role.trim(),
      experience_level: draft.experience_level.trim(),
    }]);
    setDraft({ department: '', role: '', experience_level: '' });
    setConfirmed(false);
  };

  const save = async () => {
    const cleaned = rows
      .filter(r => r.department.trim() || r.role.trim())
      .map(r => ({
        department: r.department.trim(),
        role: r.role.trim(),
        experience_level: r.experience_level.trim(),
      }));
    setSaving(true);
    try {
      const updated = await projectsApi.updateWbsTeamResources(projectId, cleaned);
      onUpdated(updated);
      setConfirmed(true);
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = rows.length === 0;

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-works-text">사업계획서에서 인식한 팀 구성</h3>
        {!isEmpty && <span className="badge bg-brand-50 text-brand-700 border-brand-100">{rows.length}개 부서</span>}
        {confirmed && (
          <span className="badge bg-green-50 text-green-700 border-green-200 ml-auto">✓ 확인 완료</span>
        )}
      </div>
      <p className="text-xs text-works-subtle mb-4">
        {isEmpty
          ? '문서에서 팀 구성을 인식하지 못했습니다. 프로젝트에 필요한 부서/역할을 직접 입력해 주세요.'
          : 'AI가 인식한 부서/역할 구성이 맞는지 확인하고 필요하면 수정하세요.'}
      </p>

      {!isEmpty && (
        <div className="space-y-2 mb-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input-field !py-2 flex-[4] min-w-0"
                placeholder="부서"
                value={r.department}
                onChange={e => updateRow(i, 'department', e.target.value)}
              />
              <input
                className="input-field !py-2 flex-[9] min-w-0"
                placeholder="역할"
                value={r.role}
                onChange={e => updateRow(i, 'role', e.target.value)}
              />
              <input
                className="input-field !py-2 w-44 shrink-0"
                placeholder="경력/직급"
                value={r.experience_level}
                onChange={e => updateRow(i, 'experience_level', e.target.value)}
              />
              <button
                onClick={() => removeRow(i)}
                className="text-works-subtle hover:text-red-500 transition cursor-pointer px-1 shrink-0"
                title="삭제"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 추가 입력 폼 */}
      <div className="flex items-center gap-2 pt-1">
        <input
          className="input-field !py-2 flex-[4] min-w-0"
          placeholder="부서 (예: 개발)"
          value={draft.department}
          onChange={e => setDraft(d => ({ ...d, department: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
        />
        <input
          className="input-field !py-2 flex-[9] min-w-0"
          placeholder="역할 (예: 백엔드)"
          value={draft.role}
          onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
        />
        <input
          className="input-field !py-2 w-44 shrink-0"
          placeholder="경력/직급"
          value={draft.experience_level}
          onChange={e => setDraft(d => ({ ...d, experience_level: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
        />
        <button onClick={addRow} className="btn-secondary !py-2 shrink-0">추가</button>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? '저장 중...' : isEmpty ? '팀 구성 저장' : '팀 구성 확인'}
        </button>
      </div>
    </div>
  );
}

// ── 회의 탭 ───────────────────────────────────────────────────────────────────
function MeetingsTab({ projectId }: { projectId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [form, setForm] = useState<{ title: string; type: string; scheduledAt: string; departments: string[] }>({ title: '', type: 'KICKOFF', scheduledAt: '', departments: [] });
  const [editForm, setEditForm] = useState({ title: '', scheduledAt: '' });
  const [loading, setLoading] = useState(false);

  const load = () => meetingsApi.list(projectId).then(setMeetings);
  useEffect(() => {
    load();
    projectsApi.getWbs(projectId)
      .then(w => setDepartments(Array.from(new Set((w.items ?? []).map(i => i.assignedRole).filter((r): r is string => !!r)))))
      .catch(() => setDepartments([]));
  }, [projectId]);

  const toggleDept = (dept: string) =>
    setForm(f => ({
      ...f,
      departments: f.departments.includes(dept)
        ? f.departments.filter(d => d !== dept)
        : [...f.departments, dept],
    }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await meetingsApi.create(projectId, { ...form, departments: form.departments });
      await load();
      setShowForm(false);
      setForm({ title: '', type: 'KICKOFF', scheduledAt: '', departments: [] });
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : '회의 생성에 실패했습니다.';
      alert(`회의 생성 실패: ${msg}`);
    }
    finally { setLoading(false); }
  };

  const openEdit = (m: Meeting) => {
    setEditTarget(m);
    setEditForm({ title: m.title, scheduledAt: m.scheduledAt.slice(0, 16) });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setLoading(true);
    try { await meetingsApi.update(editTarget.id, editForm); await load(); setEditTarget(null); }
    finally { setLoading(false); }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm('회의를 삭제하시겠습니까?')) return;
    await meetingsApi.delete(id); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="border border-brand-300 text-brand-600 px-3 py-1.5 rounded text-sm hover:bg-brand-50 transition cursor-pointer">
          + 회의 생성
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
            placeholder="회의 제목 *" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="flex gap-2">
            <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300 cursor-pointer"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {Object.entries(MEETING_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="datetime-local" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
              required value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
          {departments.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">관련 부서 (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-1.5">
                {departments.map((d, i) => {
                  const c = ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length];
                  const active = form.departments.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d)}
                      className={`text-xs px-2 py-1 rounded-md border transition cursor-pointer ${active ? '' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                      style={active ? { backgroundColor: c.bg, color: c.text, borderColor: c.border } : undefined}
                    >
                      {active ? '✓ ' : ''}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand-500 text-white rounded py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      )}

      {editTarget && (
        <form onSubmit={saveEdit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">회의 수정</p>
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
            required value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <input type="datetime-local" className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
            required value={editForm.scheduledAt} onChange={e => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditTarget(null)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand-500 text-white rounded py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {meetings.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">회의가 없습니다</p>
      ) : (
        <div className="space-y-1.5">
          {meetings.map(m => {
            const st = MEETING_STATUS_LABEL[m.status];
            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded px-4 py-2.5 flex items-center gap-3">
                <span className={`text-xs px-1.5 py-0.5 border rounded ${MEETING_TYPE_COLOR[m.type]}`}>
                  {MEETING_TYPE_LABEL[m.type]}
                </span>
                {m.departments?.map(dep => {
                  const idx = departments.indexOf(dep);
                  const c = ROLE_BAR_PALETTE[(idx < 0 ? 0 : idx) % ROLE_BAR_PALETTE.length];
                  return (
                    <span key={dep} className="text-xs px-1.5 py-0.5 border rounded" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
                      {dep}
                    </span>
                  );
                })}
                <Link to={`/meetings/${m.id}`} className="flex-1 text-sm font-medium text-gray-800 truncate hover:text-brand-600 transition cursor-pointer">
                  {m.title}
                </Link>
                <span className="text-xs text-gray-400">{new Date(m.scheduledAt).toLocaleDateString('ko-KR')}</span>
                <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
                {m.status === 'SCHEDULED' && (
                  <>
                    <button onClick={() => openEdit(m)}
                      className="text-xs border border-gray-300 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer">수정</button>
                    <button onClick={() => deleteMeeting(m.id)}
                      className="text-xs border border-red-200 text-red-400 px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer">삭제</button>
                  </>
                )}
                {m.status === 'COMPLETED' && m.achievementRate !== undefined && (
                  <span className="text-xs text-gray-400">{m.achievementRate}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 팀원 탭 ───────────────────────────────────────────────────────────────────
function MembersTab({ project, onReload }: { project: Project; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', role: 'DEVELOPER' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await projectsApi.addMember(project.id, form); onReload(); setShowForm(false); setForm({ userId: '', role: 'DEVELOPER' }); }
    finally { setLoading(false); }
  };

  const updateRole = async (memberId: string) => {
    await projectsApi.updateMember(project.id, memberId, { role: editRole });
    setEditingId(null);
    onReload();
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('팀원을 제거하시겠습니까?')) return;
    await projectsApi.removeMember(project.id, memberId);
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="border border-brand-300 text-brand-600 px-3 py-1.5 rounded text-sm hover:bg-brand-50 transition cursor-pointer">
          + 팀원 추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMember} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">사용자 ID <span className="text-red-400">*</span></label>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
              placeholder="초대할 사용자 ID" required value={form.userId}
              onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">역할</label>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300 cursor-pointer"
              value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand-500 text-white rounded py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {project.members.map(m => (
          <div key={m.id} className="bg-white border border-gray-200 rounded px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
              {m.user?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{m.user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
            </div>

            {editingId === m.id ? (
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white cursor-pointer focus:outline-none focus:border-brand-300"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => updateRole(m.id)}
                  className="text-xs bg-brand-500 text-white px-2 py-1 rounded hover:bg-brand-600 transition cursor-pointer">저장</button>
                <button onClick={() => setEditingId(null)}
                  className="text-xs border border-gray-300 text-gray-500 px-2 py-1 rounded hover:bg-gray-50 transition cursor-pointer">취소</button>
              </div>
            ) : (
              <>
                <span className={`text-xs px-1.5 py-0.5 border rounded ${ROLE_COLOR[m.role]}`}>{m.role}</span>
                <button onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                  className="text-xs border border-gray-300 text-gray-500 px-2 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer">수정</button>
                <button onClick={() => removeMember(m.id)}
                  className="text-xs border border-red-200 text-red-400 px-2 py-0.5 rounded hover:bg-red-50 transition cursor-pointer">제거</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Action Items 탭 ───────────────────────────────────────────────────────────
function ActionItemsTab({ projectId, members }: { projectId: string; members: Project['members'] }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [loading, setLoading] = useState(false);

  const load = () => actionItemsApi.list(projectId).then(setItems);
  useEffect(() => { load(); }, [projectId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await actionItemsApi.create(projectId, form); await load(); setShowForm(false); setForm({ title: '', assigneeId: '', dueDate: '' }); }
    finally { setLoading(false); }
  };

  const toggle = async (id: string) => { await actionItemsApi.toggle(id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)}
          className="border border-brand-300 text-brand-600 px-3 py-1.5 rounded text-sm hover:bg-brand-50 transition cursor-pointer">
          + Action Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
            placeholder="제목 *" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="flex gap-2">
            <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300 cursor-pointer"
              required value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">담당자 선택 *</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.name}</option>)}
            </select>
            <input type="date" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-brand-300"
              required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand-500 text-white rounded py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Action Item이 없습니다</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className={`bg-white border border-gray-200 rounded px-4 py-2.5 flex items-center gap-3 ${item.status === 'COMPLETED' ? 'opacity-50' : ''}`}>
              <button onClick={() => toggle(item.id)}
                className={`w-4 h-4 border flex items-center justify-center shrink-0 transition cursor-pointer rounded-sm ${item.status === 'COMPLETED' ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 hover:border-brand-300'}`}>
                {item.status === 'COMPLETED' && <span className="text-xs leading-none">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${item.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</span>
              {item.isCarriedOver && (
                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">이월</span>
              )}
              <span className="text-xs text-gray-400">{item.assignee?.name}</span>
              <span className="text-xs text-gray-400">{item.dueDate}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 개요(워크스페이스) 탭 ──────────────────────────────────────────────────────
function OverviewTab({ project, onNavigate }: { project: Project; onNavigate: (tab: Tab) => void }) {
  const navigate = useNavigate();
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);
  const [wbsLoading, setWbsLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [modalItem, setModalItem] = useState<WbsItem | null>(null);

  useEffect(() => {
    setWbsLoading(true);
    projectsApi.getWbs(project.id)
      .then(setWbs)
      .catch(() => setWbs(null))
      .finally(() => setWbsLoading(false));
    meetingsApi.list(project.id).then(setMeetings).catch(() => setMeetings([]));
  }, [project.id]);

  const taskCount = wbs?.items.length ?? 0;
  const decisionCount = wbs?.items.filter(i => i.isDecisionPoint).length ?? 0;
  const departments = Array.from(
    new Set((wbs?.items ?? []).map(i => i.assignedRole).filter((r): r is string => !!r)),
  );

  return (
    <div className="space-y-6">
      {/* 1. 부서별 색상 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-works-text">부서별 색상</h3>
          {departments.length > 0 && (
            <span className="badge bg-brand-50 text-brand-700 border-brand-100">{departments.length}개 부서</span>
          )}
        </div>
        {departments.length === 0 ? (
          <p className="text-sm text-works-subtle py-4 text-center">WBS가 생성되면 부서별 색상이 표시됩니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {departments.map((dept, i) => {
              const c = ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length];
              return (
                <div key={dept} className="flex items-center gap-2 border border-works-border rounded-xl px-3 py-1.5 bg-white">
                  <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                  <span className="text-sm font-medium text-works-text">{dept}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 프로젝트 캘린더 (WBS 간트 일정 합산) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-works-text">프로젝트 캘린더</h3>
          <span className="text-xs text-works-subtle">WBS 일정과 회의가 합쳐진 일정표</span>
        </div>
        {wbsLoading ? (
          <div className="card flex justify-center py-16"><Spinner /></div>
        ) : (
          <WbsCalendar
            items={wbs?.items ?? []}
            meetings={meetings}
            onItemClick={item => setModalItem(item)}
            onMeetingClick={id => navigate(`/meetings/${id}`)}
          />
        )}
      </div>

      {/* 3. WBS 현황 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-works-text">WBS 현황</h3>
          <button onClick={() => onNavigate('wbs')} className="text-xs text-brand-600 font-medium hover:underline cursor-pointer">
            WBS 보기 →
          </button>
        </div>
        {wbsLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : wbs ? (
          <div className="flex items-center gap-3">
            <span className={`badge ${wbs.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
              {wbs.status === 'CONFIRMED' ? '확정됨' : '초안'}
            </span>
            <p className="text-sm text-works-muted">
              사업계획서 분석으로 <span className="font-semibold text-works-text">{taskCount}개</span> 태스크가 생성되었습니다
              {decisionCount > 0 && <> · 의사결정 포인트 <span className="font-semibold text-works-text">{decisionCount}개</span></>}
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-works-muted mb-3">아직 생성된 WBS가 없습니다. 사업계획서를 업로드하면 AI가 WBS를 자동 생성합니다.</p>
            <button onClick={() => onNavigate('wbs')} className="btn-primary">사업계획서 업로드 →</button>
          </div>
        )}
      </div>

      {modalItem && (
        <WbsItemEditModal
          projectId={project.id}
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSaved={updated => {
            setWbs(prev => prev ? { ...prev, items: prev.items.map(i => i.id === updated.id ? updated : i) } : prev);
            setModalItem(null);
          }}
          onDeleted={deletedId => {
            setWbs(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== deletedId) } : prev);
            setModalItem(null);
          }}
        />
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'wbs', label: 'WBS' },
  { key: 'meetings', label: '회의' },
  { key: 'members', label: '팀원' },
  { key: 'actions', label: 'Action Items' },
];

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '진행 중', cls: 'bg-brand-50 text-brand-600 border border-brand-100' },
  ARCHIVED: { label: '완료', cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => { if (id) projectsApi.get(id).then(setProject); };
  useEffect(() => { load(); }, [id]);

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const openEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
    });
    setEditMode(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = await projectsApi.update(project.id, {
        name: editForm.name,
        ...(editForm.description && { description: editForm.description }),
        ...(editForm.startDate && { startDate: editForm.startDate }),
        ...(editForm.endDate && { endDate: editForm.endDate }),
      });
      setProject(updated);
      setEditMode(false);
    } finally { setSaving(false); }
  };

  const deleteProject = async () => {
    if (!confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?\nWBS·회의·Action Item이 모두 삭제됩니다.`)) return;
    setDeleting(true);
    try { await projectsApi.delete(project.id); navigate('/projects', { replace: true }); }
    finally { setDeleting(false); }
  };

  const st = PROJECT_STATUS[project.status];

  return (
    <div className="page-shell">
      {/* 헤더 */}
      <div className="mb-5 pb-4 border-b border-gray-200">
        {editMode ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="flex gap-2">
              <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
                required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              <select className="border border-gray-300 rounded px-3 py-2 text-sm cursor-pointer focus:outline-none focus:border-brand-300 bg-white"
                value={project.status} onChange={async e => {
                  const updated = await projectsApi.update(project.id, { status: e.target.value });
                  setProject(updated);
                }}>
                <option value="ACTIVE">진행 중</option>
                <option value="ARCHIVED">완료</option>
              </select>
            </div>
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-300"
              rows={2} placeholder="설명" value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
                value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
              <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
                value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditMode(false)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">취소</button>
              <button type="submit" disabled={saving}
                className="bg-brand-500 text-white rounded px-3 py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
              </div>
              {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
              {project.startDate && <p className="text-xs text-gray-400 mt-1">{project.startDate} ~ {project.endDate ?? '미정'}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={openEdit}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition cursor-pointer">수정</button>
              <button onClick={deleteProject} disabled={deleting}
                className="border border-red-300 text-red-500 px-3 py-1.5 rounded text-sm hover:bg-red-50 transition disabled:opacity-50 cursor-pointer">삭제</button>
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-item ${tab === t.key ? 'tab-item-active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab project={project} onNavigate={setTab} />}
      {tab === 'wbs' && <WbsTab project={project} />}
      {tab === 'meetings' && <MeetingsTab projectId={project.id} />}
      {tab === 'members' && <MembersTab project={project} onReload={load} />}
      {tab === 'actions' && <ActionItemsTab projectId={project.id} members={project.members} />}
    </div>
  );
}
