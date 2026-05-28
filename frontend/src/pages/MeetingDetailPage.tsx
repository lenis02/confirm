import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { meetingsApi } from '../api/meetings';
import type { Meeting, MeetingChecklist, MeetingMetrics, MeetingBriefing } from '../types';

type Tab = 'overview' | 'checklist' | 'minutes' | 'metrics';

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};
const MEETING_TYPE_COLOR: Record<string, string> = {
  KICKOFF: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROGRESS_CHECK: 'bg-orange-50 text-orange-600 border-orange-200',
  ISSUE_CHECK: 'bg-red-50 text-red-600 border-red-200',
  CONSENSUS: 'bg-green-50 text-green-700 border-green-200',
};
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: '예정', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  IN_PROGRESS: { label: '진행 중', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  COMPLETED: { label: '완료', cls: 'bg-green-50 text-green-700 border-green-200' },
};

// ── 개요 탭 ───────────────────────────────────────────────────────────────────
function OverviewTab({ meeting, onMeetingChange }: { meeting: Meeting; onMeetingChange: (m: Meeting) => void }) {
  const [briefing, setBriefing] = useState<MeetingBriefing | null>(null);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    meetingsApi.getBriefing(meeting.id).then(setBriefing).catch(() => {});
  }, [meeting.id]);

  const complete = async () => {
    if (!confirm('회의를 완료 처리하시겠습니까?')) return;
    setCompleting(true);
    try {
      onMeetingChange(await meetingsApi.complete(meeting.id));
    } finally { setCompleting(false); }
  };

  const reopen = async () => {
    if (!confirm('회의를 진행 중 상태로 되돌리시겠습니까?\n완료 시 이월된 미완료 체크리스트 항목이 취소됩니다.')) return;
    setReopening(true);
    try {
      onMeetingChange(await meetingsApi.reopen(meeting.id));
    } finally { setReopening(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded p-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기본 정보</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-400">일시</span>
          <span className="text-gray-800">{new Date(meeting.scheduledAt).toLocaleString('ko-KR')}</span>
          <span className="text-gray-400">유형</span>
          <span className={`inline-flex w-fit text-xs px-1.5 py-0.5 border rounded ${MEETING_TYPE_COLOR[meeting.type]}`}>
            {MEETING_TYPE_LABEL[meeting.type]}
          </span>
          <span className="text-gray-400">상태</span>
          <span className={`inline-flex w-fit text-xs px-1.5 py-0.5 border rounded ${STATUS_LABEL[meeting.status].cls}`}>
            {STATUS_LABEL[meeting.status].label}
          </span>
          {meeting.achievementRate != null && (
            <>
              <span className="text-gray-400">체크리스트 달성률</span>
              <span className="text-gray-800 font-medium">{meeting.achievementRate}%</span>
            </>
          )}
        </div>
      </div>

      {briefing && briefing.carriedOverItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">이월된 Action Items</h3>
          <div className="space-y-1.5">
            {briefing.carriedOverItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded shrink-0">이월</span>
                <span>{item.title}</span>
                <span className="text-xs text-gray-400 ml-auto">{item.dueDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {meeting.status !== 'COMPLETED' ? (
          <button
            onClick={complete}
            disabled={completing}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
          >
            {completing ? '처리 중...' : '회의 완료 처리'}
          </button>
        ) : (
          <button
            onClick={reopen}
            disabled={reopening}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
          >
            {reopening ? '처리 중...' : '진행 중으로 되돌리기'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 체크리스트 탭 ─────────────────────────────────────────────────────────────
function ChecklistTab({ meeting }: { meeting: Meeting }) {
  const [items, setItems] = useState<MeetingChecklist[]>([]);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    meetingsApi.getChecklists(meeting.id).then(setItems).catch(() => {});
  }, [meeting.id]);

  const save = async (updated: MeetingChecklist[]) => {
    setSaving(true);
    try {
      const result = await meetingsApi.updateChecklists(meeting.id, updated);
      setItems(result);
    } finally { setSaving(false); }
  };

  const toggle = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, isDone: !i.isDone } : i);
    setItems(updated);
    save(updated);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const updated = [...items, { id: '', content: newContent.trim(), isDone: false, order: items.length + 1 }];
    await save(updated);
    setNewContent('');
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }));
    save(updated);
  };

  const isEditable = meeting.status !== 'COMPLETED';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{items.filter(i => i.isDone).length}/{items.length} 완료</span>
        {saving && <span className="text-xs text-gray-400">저장 중...</span>}
      </div>

      <div className="bg-white border border-gray-200 rounded divide-y divide-gray-100">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">체크리스트 항목이 없습니다</p>
        ) : (
          items.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center gap-3 px-4 py-2.5">
              <button
                onClick={() => toggle(item.id)}
                disabled={!isEditable}
                className={`w-4 h-4 border flex items-center justify-center shrink-0 transition rounded-sm ${item.isDone ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'} ${isEditable ? 'cursor-pointer hover:border-orange-400' : 'cursor-default'}`}
              >
                {item.isDone && <span className="text-xs leading-none">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${item.isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.content}
              </span>
              {isEditable && (
                <button
                  onClick={() => removeItem(idx)}
                  className="text-gray-300 hover:text-red-400 transition cursor-pointer text-base leading-none"
                >×</button>
              )}
            </div>
          ))
        )}
      </div>

      {isEditable && (
        <form onSubmit={addItem} className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="항목 추가..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <button
            type="submit"
            className="border border-orange-400 text-orange-600 px-3 py-2 rounded text-sm hover:bg-orange-50 transition cursor-pointer"
          >추가</button>
        </form>
      )}
    </div>
  );
}

// ── 회의록 업로드 탭 ──────────────────────────────────────────────────────────
const MINUTES_ACCEPT = '.hwp,.doc,.docx,.pdf';
const MINUTES_EXT = ['hwp', 'doc', 'docx', 'pdf'];

function MinutesUploadTab({ meeting, onMeetingChange }: { meeting: Meeting; onMeetingChange: (m: Meeting) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!MINUTES_EXT.includes(ext)) {
      alert('hwp, doc, docx, pdf 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploading(true);
    try {
      onMeetingChange(await meetingsApi.uploadMinutes(meeting.id, file));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition ${
          dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-300'
        }`}
      >
        <p className="text-sm text-gray-500 mb-1">회의록 파일을 여기로 드래그하거나 클릭해서 업로드</p>
        <p className="text-xs text-gray-400 mb-3">hwp · doc · docx · pdf 지원</p>
        <input ref={fileRef} type="file" accept={MINUTES_ACCEPT} className="hidden" onChange={onSelect} />
        <button
          type="button"
          disabled={uploading}
          className="border border-orange-400 text-orange-600 px-4 py-1.5 rounded text-sm hover:bg-orange-50 transition disabled:opacity-50 cursor-pointer"
        >
          {uploading ? '업로드 중...' : '파일 선택'}
        </button>
      </div>

      {meeting.minutesFileName && (
        <div className="bg-white border border-gray-200 rounded p-4 flex items-center gap-2 text-sm">
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded shrink-0">업로드됨</span>
          <span className="text-gray-700 truncate">{meeting.minutesFileName}</span>
          <span className="text-xs text-gray-400 ml-auto shrink-0">회의 요약 탭에서 다운로드</span>
        </div>
      )}
    </div>
  );
}

// ── 회의 요약 탭 ──────────────────────────────────────────────────────────────
function MetricsTab({ meeting }: { meeting: Meeting }) {
  const [metrics, setMetrics] = useState<MeetingMetrics | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    meetingsApi.getMetrics(meeting.id).then(setMetrics).catch(() => {});
  }, [meeting.id]);

  const downloadMinutes = async () => {
    setDownloading(true);
    try {
      const blob = await meetingsApi.downloadMinutes(meeting.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meeting.minutesFileName ?? 'meeting-minutes';
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  if (!metrics) {
    return <p className="text-sm text-gray-400 text-center py-10">회의 요약 데이터가 없습니다</p>;
  }

  const done = metrics.checklists.filter(c => c.isDone).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">체크리스트 달성률</p>
          <p className="text-3xl font-bold text-orange-500">{metrics.achievementRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{done}/{metrics.checklists.length} 완료</p>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">완료 시각</p>
          <p className="text-sm font-medium text-gray-800 mt-2">
            {new Date(metrics.completedAt).toLocaleString('ko-KR')}
          </p>
        </div>
      </div>

      {metrics.summary && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI 요약</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{metrics.summary}</p>
        </div>
      )}

      {meeting.minutesFileName && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">업로드된 회의록</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 truncate">{meeting.minutesFileName}</span>
            <button
              onClick={downloadMinutes}
              disabled={downloading}
              className="ml-auto shrink-0 border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition disabled:opacity-50 cursor-pointer"
            >
              {downloading ? '다운로드 중...' : '다운로드'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">체크리스트 결과</h3>
        <div className="space-y-1.5">
          {metrics.checklists.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className={`w-4 h-4 border flex items-center justify-center shrink-0 rounded-sm text-xs ${item.isDone ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-transparent'}`}>
                ✓
              </span>
              <span className={item.isDone ? 'line-through text-gray-400' : 'text-gray-700'}>{item.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; onlyCompleted?: boolean }[] = [
  { key: 'overview', label: '개요' },
  { key: 'checklist', label: '체크리스트' },
  { key: 'minutes', label: '회의록 업로드' },
  { key: 'metrics', label: '회의 요약', onlyCompleted: true },
];

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', scheduledAt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) meetingsApi.get(id).then(setMeeting);
  }, [id]);

  if (!meeting) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openEdit = () => {
    setEditForm({
      title: meeting.title,
      scheduledAt: meeting.scheduledAt.slice(0, 16),
    });
    setEditMode(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await meetingsApi.update(meeting.id, editForm);
      setMeeting(updated);
      setEditMode(false);
    } finally { setSaving(false); }
  };

  const deleteMeeting = async () => {
    if (!confirm('회의를 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await meetingsApi.delete(meeting.id);
      navigate(`/projects/${meeting.projectId}`, { replace: true });
    } finally { setDeleting(false); }
  };

  const availableTabs = TABS.filter(t => !t.onlyCompleted || meeting.status === 'COMPLETED');
  const st = STATUS_LABEL[meeting.status];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5">
        <Link to={`/projects/${meeting.projectId}`} className="text-xs text-gray-400 hover:text-orange-500 transition cursor-pointer">
          ← 프로젝트로 돌아가기
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900">{meeting.title}</h2>
              <span className={`text-xs px-1.5 py-0.5 border rounded ${MEETING_TYPE_COLOR[meeting.type]}`}>
                {MEETING_TYPE_LABEL[meeting.type]}
              </span>
              <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-xs text-gray-400">{new Date(meeting.scheduledAt).toLocaleString('ko-KR')}</p>
          </div>

          {meeting.status === 'SCHEDULED' && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={openEdit}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition cursor-pointer"
              >수정</button>
              <button
                onClick={deleteMeeting}
                disabled={deleting}
                className="border border-red-300 text-red-500 px-3 py-1.5 rounded text-sm hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
              >삭제</button>
            </div>
          )}
        </div>
      </div>

      {/* 수정 폼 */}
      {editMode && (
        <form onSubmit={saveEdit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">제목</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">일시</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              value={editForm.scheduledAt}
              onChange={e => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditMode(false)}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-5">
        {availableTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition cursor-pointer ${
              tab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab meeting={meeting} onMeetingChange={setMeeting} />}
      {tab === 'checklist' && <ChecklistTab meeting={meeting} />}
      {tab === 'minutes' && <MinutesUploadTab meeting={meeting} onMeetingChange={setMeeting} />}
      {tab === 'metrics' && meeting.status === 'COMPLETED' && <MetricsTab meeting={meeting} />}
    </div>
  );
}
