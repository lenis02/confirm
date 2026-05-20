import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { meetingsApi } from '../api/meetings';
import { actionItemsApi } from '../api/actionItems';
import type { Project, Document, ProjectWbs, WbsItem, Meeting, ActionItem } from '../types';

type Tab = 'wbs' | 'meetings' | 'members' | 'actions';

const ROLES = ['PM', 'DEVELOPER', 'DESIGNER', 'QA', 'DEVOPS', 'OTHER'] as const;

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};
const MEETING_TYPE_COLOR: Record<string, string> = {
  KICKOFF: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROGRESS_CHECK: 'bg-orange-50 text-orange-600 border-orange-200',
  ISSUE_CHECK: 'bg-red-50 text-red-600 border-red-200',
  CONSENSUS: 'bg-green-50 text-green-700 border-green-200',
};
const MEETING_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: '예정', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  IN_PROGRESS: { label: '진행 중', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
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
];
const ROLE_COLOR: Record<string, string> = {
  PM: 'bg-orange-50 text-orange-600 border-orange-200',
  DEVELOPER: 'bg-gray-50 text-gray-700 border-gray-200',
  DESIGNER: 'bg-pink-50 text-pink-700 border-pink-200',
  QA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DEVOPS: 'bg-red-50 text-red-600 border-red-200',
  OTHER: 'bg-gray-50 text-gray-500 border-gray-200',
};

type BarColor = { bg: string; text: string; border: string };

const ROLE_BAR_PALETTE: BarColor[] = [
  { bg: '#FECACA', text: '#991B1B', border: '#F87171' }, // 🔴 red 200/400 + text 800
  { bg: '#FDE68A', text: '#92400E', border: '#FBBF24' }, // 🟡 amber 200/400 + text 800
  { bg: '#A7F3D0', text: '#065F46', border: '#34D399' }, // 🟢 emerald 200/400 + text 800
  { bg: '#BAE6FD', text: '#075985', border: '#38BDF8' }, // 🔵 sky 200/400 + text 800
  { bg: '#DDD6FE', text: '#5B21B6', border: '#A78BFA' }, // 🟣 violet 200/400 + text 800
  { bg: '#FBCFE8', text: '#9D174D', border: '#F472B6' }, // 🌸 pink 200/400 + text 800
];

const FALLBACK_BAR_COLOR: BarColor = { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF' };

// ── WBS 탭 ────────────────────────────────────────────────────────────────────
function WbsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);
  const [wbsError, setWbsError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modalItem, setModalItem] = useState<WbsItem | null>(null);
  const [itemForm, setItemForm] = useState({ title: '', assignedRole: '', durationDays: 0, startDate: '', endDate: '', isDecisionPoint: false });
  const [savingItem, setSavingItem] = useState(false);
  const [sortKey, setSortKey] = useState<WbsSortKey>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
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

  const openItemModal = (item: WbsItem) => {
    setModalItem(item);
    setItemForm({
      title: item.title,
      assignedRole: item.assignedRole ?? '',
      durationDays: item.durationDays ?? 0,
      startDate: (item.startDate ?? '').slice(0, 10),
      endDate: (item.endDate ?? '').slice(0, 10),
      isDecisionPoint: item.isDecisionPoint,
    });
  };

  const saveItem = async () => {
    if (!modalItem) return;
    setSavingItem(true);
    try {
      const updated = await projectsApi.updateWbsItem(projectId, modalItem.id, itemForm);
      setWbs(prev => prev ? { ...prev, items: prev.items.map(i => i.id === updated.id ? updated : i) } : prev);
      setModalItem(null);
    } finally {
      setSavingItem(false);
    }
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
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 rounded p-5 text-center transition ${
          dragging
            ? 'border-solid border-orange-400 bg-orange-50'
            : 'border-dashed border-gray-200 bg-gray-50'
        }`}
      >
        <svg
          className={`w-8 h-8 mx-auto mb-2 transition ${dragging ? 'text-orange-500' : 'text-gray-300'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <p className="text-xs text-gray-400 mb-3">수행계획서(PDF)를 끌어다 놓거나 선택하면 AI가 WBS를 자동 생성합니다</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onInputChange} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || isProcessing}
          className="border border-orange-400 text-orange-600 px-4 py-1.5 rounded text-sm hover:bg-orange-50 transition disabled:opacity-50 cursor-pointer">
          {uploading ? '업로드 중...' : '파일 선택'}
        </button>
      </div>

      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded px-4 py-2.5 text-sm">
              <span className="flex-1 truncate text-gray-700">{d.fileName}</span>
              {(d.status === 'PENDING' || d.status === 'IN_PROGRESS') ? (
                <span className="flex items-center gap-1.5 text-xs text-orange-500">
                  <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />분석 중
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
              </div>
            </div>
            {wbs.status === 'DRAFT' && (
              <button onClick={confirm} disabled={confirming}
                className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
                {confirming ? '확정 중...' : 'WBS 확정'}
              </button>
            )}
          </div>
          {wbs.projectSummary && (
            <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded px-3 py-2 mb-3">{wbs.projectSummary}</p>
          )}
          {viewMode === 'chart' ? (
            <WbsGanttChart items={sortedItems} onItemClick={openItemModal} />
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
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.isDecisionPoint ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs whitespace-nowrap">{item.taskId ?? `T${String(item.order).padStart(2, '0')}`}</td>
                    <td className="px-3 py-2 max-w-xs">
                      <button onClick={() => openItemModal(item)}
                        className="block w-full text-left text-sm font-medium text-gray-800 truncate hover:text-orange-600 hover:underline transition cursor-pointer">
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
                        className={`w-4 h-4 border flex items-center justify-center transition cursor-pointer rounded-sm ${item.isDecisionPoint ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}>
                        {item.isDecisionPoint && <span className="text-xs leading-none">✓</span>}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setModalItem(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">태스크 상세</h3>
              <span className="text-xs text-gray-400 font-mono">
                {modalItem.taskId ?? `T${String(modalItem.order).padStart(2, '0')}`}
              </span>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">태스크명</label>
              <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">부서</label>
                <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={itemForm.assignedRole} onChange={e => setItemForm(f => ({ ...f, assignedRole: e.target.value }))} />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">기간(일)</label>
                <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={itemForm.durationDays} onChange={e => setItemForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">시작일</label>
                <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={itemForm.startDate} onChange={e => setItemForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">종료일</label>
                <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={itemForm.endDate} onChange={e => setItemForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="accent-orange-500 cursor-pointer"
                  checked={itemForm.isDecisionPoint}
                  onChange={e => setItemForm(f => ({ ...f, isDecisionPoint: e.target.checked }))} />
                확인
              </label>
              {modalItem.complexity && (
                <span className="text-xs text-gray-500">
                  복잡도 <span className={`px-1.5 py-0.5 border rounded ${COMPLEXITY_COLOR[modalItem.complexity] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>{modalItem.complexity}</span>
                </span>
              )}
            </div>

            {modalItem.reasoning && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">근거</label>
                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-3 py-2">{modalItem.reasoning}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalItem(null)}
                className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">취소</button>
              <button onClick={saveItem} disabled={savingItem}
                className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
                {savingItem ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WBS 간트 차트 ─────────────────────────────────────────────────────────────
function WbsGanttChart({ items, onItemClick }: { items: WbsItem[]; onItemClick: (item: WbsItem) => void }) {
  const DAY_MS = 86_400_000;
  const PX_PER_DAY = 10;
  const ROW_HEIGHT = 32;
  const NAME_WIDTH = 220;

  const validItems = items.filter(i => i.startDate && i.endDate);
  const omitted = items.length - validItems.length;

  if (validItems.length === 0) {
    return (
      <div className="border border-gray-200 rounded p-8 text-center text-sm text-gray-400">
        일정이 있는 태스크가 없어 차트를 표시할 수 없습니다
      </div>
    );
  }

  const sorted = [...validItems].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const uniqueRoles = Array.from(new Set(sorted.map(i => i.assignedRole).filter((r): r is string => !!r)));
  const roleColorMap = new Map<string, BarColor>();
  uniqueRoles.forEach((role, i) => {
    roleColorMap.set(role, ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length]);
  });
  const getRoleColor = (role?: string | null): BarColor =>
    (role && roleColorMap.get(role)) || FALLBACK_BAR_COLOR;
  const startTimes = sorted.map(i => new Date(i.startDate!).getTime());
  const endTimes = sorted.map(i => new Date(i.endDate!).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);
  const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / DAY_MS) + 1);
  const chartWidth = totalDays * PX_PER_DAY;

  const tickStart = new Date(minTime);
  tickStart.setDate(1);
  const monthTicks: { left: number; label: string }[] = [];
  for (const cursor = new Date(tickStart); cursor.getTime() <= maxTime; cursor.setMonth(cursor.getMonth() + 1)) {
    const offsetDays = (cursor.getTime() - minTime) / DAY_MS;
    monthTicks.push({
      left: Math.max(0, offsetDays * PX_PER_DAY),
      label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  return (
    <div className="border border-gray-200 rounded">
      {(omitted > 0 || uniqueRoles.length > 0) && (
        <div className="flex items-center justify-between gap-4 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            {omitted > 0 ? `일정 미정 ${omitted}건은 차트에서 제외되었습니다` : ''}
          </p>
          {uniqueRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-end">
              {uniqueRoles.map(role => {
                const c = getRoleColor(role);
                return (
                  <div key={role} className="flex items-center gap-1.5 text-xs">
                    <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: c.bg, borderColor: c.border }} />
                    <span className="text-gray-600">{role}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <div style={{ width: NAME_WIDTH + chartWidth }}>
          <div className="flex border-b border-gray-200 bg-gray-50" style={{ height: 28 }}>
            <div style={{ width: NAME_WIDTH }} className="flex items-center px-3 text-xs font-medium text-gray-500 border-r border-gray-200">
              태스크
            </div>
            <div className="relative" style={{ width: chartWidth }}>
              {monthTicks.map((t, i) => (
                <div key={i} className="absolute top-0 bottom-0 flex items-center pl-1 text-xs text-gray-500 border-l border-gray-200" style={{ left: t.left }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
          {sorted.map(item => {
            const startTime = new Date(item.startDate!).getTime();
            const endTime = new Date(item.endDate!).getTime();
            const left = ((startTime - minTime) / DAY_MS) * PX_PER_DAY;
            const width = Math.max(PX_PER_DAY, ((endTime - startTime) / DAY_MS + 1) * PX_PER_DAY);
            const barColor = getRoleColor(item.assignedRole);
            return (
              <div key={item.id} className="flex border-b border-gray-100 hover:bg-gray-50/60" style={{ height: ROW_HEIGHT }}>
                <div style={{ width: NAME_WIDTH }} className="flex items-center px-3 text-xs border-r border-gray-200 overflow-hidden">
                  <span className="text-gray-400 font-mono mr-2 shrink-0">{item.taskId ?? `T${String(item.order).padStart(2, '0')}`}</span>
                  <span className="text-gray-700 truncate">{item.title}</span>
                </div>
                <div className="relative" style={{ width: chartWidth }}>
                  {monthTicks.map((t, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: t.left }} />
                  ))}
                  {item.isDecisionPoint ? (
                    <button onClick={() => onItemClick(item)}
                      className="absolute cursor-pointer hover:opacity-80 transition"
                      style={{ left: left - 8, top: ROW_HEIGHT / 2 - 8, width: 16, height: 16 }}
                      title={item.title}>
                      <svg viewBox="0 0 16 16" className="w-full h-full">
                        <polygon points="8,1 15,8 8,15 1,8" className="fill-orange-500" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={() => onItemClick(item)}
                      className="absolute border rounded px-1.5 text-xs truncate hover:shadow transition cursor-pointer text-left"
                      style={{ left, width, top: ROW_HEIGHT / 2 - 10, height: 20, lineHeight: '18px', backgroundColor: barColor.bg, color: barColor.text, borderColor: barColor.border }}
                      title={item.title}>
                      {item.title}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 회의 탭 ───────────────────────────────────────────────────────────────────
function MeetingsTab({ projectId }: { projectId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [form, setForm] = useState({ title: '', type: 'KICKOFF', scheduledAt: '' });
  const [editForm, setEditForm] = useState({ title: '', scheduledAt: '' });
  const [loading, setLoading] = useState(false);

  const load = () => meetingsApi.list(projectId).then(setMeetings);
  useEffect(() => { load(); }, [projectId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await meetingsApi.create(projectId, form); await load(); setShowForm(false); setForm({ title: '', type: 'KICKOFF', scheduledAt: '' }); }
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
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer">
          + 회의 생성
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            placeholder="회의 제목 *" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="flex gap-2">
            <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {Object.entries(MEETING_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="datetime-local" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              required value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      )}

      {editTarget && (
        <form onSubmit={saveEdit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500">회의 수정</p>
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            required value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <input type="datetime-local" className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            required value={editForm.scheduledAt} onChange={e => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditTarget(null)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
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
                <Link to={`/meetings/${m.id}`} className="flex-1 text-sm font-medium text-gray-800 truncate hover:text-orange-600 transition cursor-pointer">
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
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer">
          + 팀원 추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMember} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">사용자 ID <span className="text-red-400">*</span></label>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              placeholder="초대할 사용자 ID" required value={form.userId}
              onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">역할</label>
            <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {project.members.map(m => (
          <div key={m.id} className="bg-white border border-gray-200 rounded px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
              {m.user?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{m.user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
            </div>

            {editingId === m.id ? (
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white cursor-pointer focus:outline-none focus:border-orange-400"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => updateRole(m.id)}
                  className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition cursor-pointer">저장</button>
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
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer">
          + Action Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            placeholder="제목 *" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="flex gap-2">
            <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              required value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">담당자 선택 *</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.name}</option>)}
            </select>
            <input type="date" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
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
                className={`w-4 h-4 border flex items-center justify-center shrink-0 transition cursor-pointer rounded-sm ${item.status === 'COMPLETED' ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}>
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

// ── 메인 ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'wbs', label: 'WBS' },
  { key: 'meetings', label: '회의' },
  { key: 'members', label: '팀원' },
  { key: 'actions', label: 'Action Items' },
];

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '진행 중', cls: 'bg-orange-50 text-orange-600 border border-orange-200' },
  ARCHIVED: { label: '완료', cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>('wbs');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => { if (id) projectsApi.get(id).then(setProject); };
  useEffect(() => { load(); }, [id]);

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5 pb-4 border-b border-gray-200">
        {editMode ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="flex gap-2">
              <input className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              <select className="border border-gray-300 rounded px-3 py-2 text-sm cursor-pointer focus:outline-none focus:border-orange-400 bg-white"
                value={project.status} onChange={async e => {
                  const updated = await projectsApi.update(project.id, { status: e.target.value });
                  setProject(updated);
                }}>
                <option value="ACTIVE">진행 중</option>
                <option value="ARCHIVED">완료</option>
              </select>
            </div>
            <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-400"
              rows={2} placeholder="설명" value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-2">
              <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
              <input type="date" className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditMode(false)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">취소</button>
              <button type="submit" disabled={saving}
                className="bg-orange-500 text-white rounded px-3 py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
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
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition cursor-pointer ${
              tab === t.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === 'wbs' && <WbsTab projectId={project.id} />}
      {tab === 'meetings' && <MeetingsTab projectId={project.id} />}
      {tab === 'members' && <MembersTab project={project} onReload={load} />}
      {tab === 'actions' && <ActionItemsTab projectId={project.id} members={project.members} />}
    </div>
  );
}
