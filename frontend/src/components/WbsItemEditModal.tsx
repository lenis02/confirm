import { useState } from 'react';
import { projectsApi } from '../api/projects';
import type { WbsItem } from '../types';

const COMPLEXITY_COLOR: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border-red-200',
  Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
};

export default function WbsItemEditModal({
  projectId,
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  projectId: string;
  item: WbsItem;
  onClose: () => void;
  onSaved: (updated: WbsItem) => void;
  onDeleted: (itemId: string) => void;
}) {
  const [form, setForm] = useState({
    title: item.title,
    assignedRole: item.assignedRole ?? '',
    durationDays: item.durationDays ?? 0,
    startDate: (item.startDate ?? '').slice(0, 10),
    endDate: (item.endDate ?? '').slice(0, 10),
    isDecisionPoint: item.isDecisionPoint,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await projectsApi.updateWbsItem(projectId, item.id, form);
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`'${item.title}' 항목을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await projectsApi.deleteWbsItem(projectId, item.id);
      onDeleted(item.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">태스크 상세</h3>
          <span className="text-xs text-gray-400 font-mono">
            {item.taskId ?? `T${String(item.order).padStart(2, '0')}`}
          </span>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">태스크명</label>
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">부서</label>
            <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
              value={form.assignedRole} onChange={e => setForm(f => ({ ...f, assignedRole: e.target.value }))} />
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-500 mb-1">기간(일)</label>
            <input type="number" min={0} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
              value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
              value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">종료일</label>
            <input type="date" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-300"
              value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="accent-brand-500 cursor-pointer"
              checked={form.isDecisionPoint}
              onChange={e => setForm(f => ({ ...f, isDecisionPoint: e.target.checked }))} />
            의사결정 포인트
          </label>
          {item.complexity && (
            <span className="text-xs text-gray-500">
              복잡도 <span className={`px-1.5 py-0.5 border rounded ${COMPLEXITY_COLOR[item.complexity] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>{item.complexity}</span>
            </span>
          )}
        </div>

        {item.reasoning && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">근거</label>
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-3 py-2">{item.reasoning}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={remove} disabled={deleting}
            className="border border-red-200 text-red-500 rounded py-2 px-3 text-sm hover:bg-red-50 transition disabled:opacity-50 cursor-pointer">삭제</button>
          <button onClick={onClose}
            className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">취소</button>
          <button onClick={save} disabled={saving}
            className="flex-1 bg-brand-500 text-white rounded py-2 text-sm hover:bg-brand-600 transition disabled:opacity-50 cursor-pointer">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
