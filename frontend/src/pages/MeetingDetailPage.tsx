import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { meetingsApi } from '../api/meetings';
import type { ChecklistItem, Meeting, MeetingBriefing, MeetingMetrics } from '../types';

type Tab = 'overview' | 'checklist' | 'stt' | 'metrics';

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프',
  PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크',
  CONSENSUS: '합의',
};
const MEETING_TYPE_COLOR: Record<string, string> = {
  KICKOFF: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROGRESS_CHECK: 'bg-orange-50 text-orange-600 border-orange-200',
  ISSUE_CHECK: 'bg-red-50 text-red-600 border-red-200',
  CONSENSUS: 'bg-green-50 text-green-700 border-green-200',
};
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: '예정', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  IN_PROGRESS: { label: '진행 중', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  COMPLETED: { label: '완료', cls: 'bg-green-50 text-green-700 border-green-200' },
};

// ── 브리핑 섹션 ───────────────────────────────────────────────────────────────
function BriefingSection({ briefing }: { briefing: MeetingBriefing }) {
  if (!briefing.previousMeetingId && briefing.carriedOverItems.length === 0) return null;

  return (
    <section className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-3">
      <h3 className="text-sm font-semibold text-yellow-800 flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        이전 회의 맥락
      </h3>

      {briefing.previousMeetingTitle && (
        <p className="text-xs text-yellow-700">
          이전 회의: <span className="font-medium">{briefing.previousMeetingTitle}</span>
          {briefing.previousMeetingDate && ` (${new Date(briefing.previousMeetingDate).toLocaleDateString('ko-KR')})`}
        </p>
      )}

      {briefing.contextSummary && (
        <p className="text-xs text-yellow-700 bg-yellow-100/60 rounded px-3 py-2">{briefing.contextSummary}</p>
      )}

      {briefing.carriedOverItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-yellow-800 mb-1.5">이월된 Action Items</p>
          <div className="space-y-1">
            {briefing.carriedOverItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-yellow-700">
                <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 ${
                  item.status === 'COMPLETED' ? 'bg-yellow-600 border-yellow-600 text-white' : 'border-yellow-400'
                }`}>
                  {item.status === 'COMPLETED' && '✓'}
                </span>
                <span className={item.status === 'COMPLETED' ? 'line-through opacity-60' : ''}>{item.title}</span>
                {item.assignee && <span className="text-yellow-500 ml-auto shrink-0">{item.assignee.name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── 개요 탭 ───────────────────────────────────────────────────────────────────
function OverviewTab({
  meeting,
  briefing,
  onComplete,
  completing,
}: {
  meeting: Meeting;
  briefing: MeetingBriefing | null;
  onComplete: () => void;
  completing: boolean;
}) {
  const typeCls = MEETING_TYPE_COLOR[meeting.type] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  const st = STATUS_MAP[meeting.status];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded p-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기본 정보</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-400">일시</span>
          <span className="text-gray-800">
            {new Date(meeting.scheduledAt).toLocaleString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <span className="text-gray-400">유형</span>
          <span className={`inline-flex w-fit text-xs px-1.5 py-0.5 border rounded ${typeCls}`}>
            {MEETING_TYPE_LABEL[meeting.type]}
          </span>
          <span className="text-gray-400">상태</span>
          <span className={`inline-flex w-fit text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>
            {st.label}
          </span>
          {meeting.achievementRate !== undefined && (
            <>
              <span className="text-gray-400">체크리스트 달성률</span>
              <span className="text-gray-800 font-medium">{meeting.achievementRate}%</span>
            </>
          )}
        </div>
      </div>

      {briefing && (briefing.carriedOverItems.length > 0 || briefing.previousMeetingId) && (
        <BriefingSection briefing={briefing} />
      )}

      {meeting.status !== 'COMPLETED' && (
        <div className="flex justify-end">
          <button
            onClick={onComplete}
            disabled={completing}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
          >
            {completing ? '처리 중...' : '회의 완료 처리'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 체크리스트 탭 ─────────────────────────────────────────────────────────────
function ChecklistTab({
  meetingId,
  items,
  onChange,
  readonly,
}: {
  meetingId: string;
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readonly: boolean;
}) {
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const done = items.filter(i => i.isDone).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  const toggle = async (item: ChecklistItem) => {
    if (readonly) return;
    const updated = items.map(i => i.id === item.id ? { ...i, isDone: !i.isDone } : i);
    onChange(updated);
    await meetingsApi.updateChecklists(meetingId,
      updated.map((i, idx) => ({ id: i.id, content: i.content, isDone: i.isDone, order: idx }))
    ).catch(() => onChange(items));
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i }));
    onChange(updated);
    meetingsApi.updateChecklists(meetingId,
      updated.map((i, idx) => ({ id: i.id, content: i.content, isDone: i.isDone, order: idx }))
    ).catch(() => {});
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const next = [
        ...items.map((i, idx) => ({ id: i.id, content: i.content, isDone: i.isDone, order: idx })),
        { content: newContent.trim(), isDone: false, order: items.length },
      ];
      const result = await meetingsApi.updateChecklists(meetingId, next);
      onChange(result);
      setNewContent('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">체크리스트</h3>
        {items.length > 0 && (
          <span className="text-xs text-gray-500">{done}/{items.length} 완료</span>
        )}
        {saving && <span className="text-xs text-gray-400 ml-2">저장 중...</span>}
      </div>

      {/* 진행률 바 */}
      {items.length > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* 체크리스트 항목 */}
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">체크리스트 항목이 없습니다</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li key={item.id || idx} className="flex items-start gap-2.5">
              <button
                onClick={() => toggle(item)}
                disabled={readonly}
                className={[
                  'mt-0.5 w-4 h-4 border shrink-0 flex items-center justify-center rounded-sm transition',
                  item.isDone
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-300 hover:border-orange-400',
                  readonly ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
              >
                {item.isDone && <span className="text-xs leading-none">✓</span>}
              </button>
              <span className={`text-sm flex-1 ${item.isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.content}
              </span>
              {item.validationReason && (
                <span className="text-xs text-green-600 shrink-0" title={item.validationReason}>AI</span>
              )}
              {!readonly && (
                <button
                  onClick={() => removeItem(idx)}
                  className="text-gray-300 hover:text-red-400 transition cursor-pointer text-base leading-none shrink-0"
                >×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 항목 추가 */}
      {!readonly && (
        <form onSubmit={addItem} className="flex gap-2 pt-1">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
            placeholder="새 항목 추가..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving || !newContent.trim()}
            className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition disabled:opacity-40 cursor-pointer"
          >
            {saving ? '...' : '추가'}
          </button>
        </form>
      )}
    </section>
  );
}

// ── STT 탭 ───────────────────────────────────────────────────────────────────
function SttTab({ meetingId }: { meetingId: string }) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    meetingsApi.getTranscript(meetingId)
      .then(res => {
        if (res.transcriptText) { setTranscript(res.transcriptText); setSttStatus('done'); }
        else if (res.sttStatus === 'PROCESSING') setSttStatus('processing');
      })
      .catch(() => {});

    return () => clearInterval(pollRef.current);
  }, [meetingId]);

  const startPolling = () => {
    setSttStatus('processing');
    pollRef.current = setInterval(async () => {
      try {
        const res = await meetingsApi.getTranscript(meetingId);
        if (res.transcriptText) {
          setTranscript(res.transcriptText);
          setSttStatus('done');
          clearInterval(pollRef.current);
        }
      } catch { /* 아직 처리 중 */ }
    }, 4000);
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSttStatus('uploading');
    try {
      await meetingsApi.uploadStt(meetingId, file);
      startPolling();
    } catch {
      setSttStatus('error');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">음성 기록 (STT)</h3>
        {sttStatus === 'done' && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-xs text-orange-600 hover:underline cursor-pointer"
          >
            {expanded ? '접기' : '전문 보기'}
          </button>
        )}
      </div>

      {sttStatus === 'idle' && (
        <>
          <p className="text-xs text-gray-400">회의 녹음 파일을 업로드하면 자동으로 텍스트 변환 및 체크리스트를 검증합니다</p>
          <input ref={fileRef} type="file" accept="audio/*,video/*" className="hidden" onChange={upload} />
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-orange-400 text-orange-600 px-4 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer"
          >
            파일 업로드
          </button>
        </>
      )}

      {sttStatus === 'uploading' && (
        <div className="flex items-center gap-2 text-sm text-orange-500">
          <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />
          업로드 중...
        </div>
      )}

      {sttStatus === 'processing' && (
        <div className="flex items-center gap-2 text-sm text-orange-500">
          <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />
          텍스트 변환 중... (완료 시 자동 갱신)
        </div>
      )}

      {sttStatus === 'error' && (
        <p className="text-sm text-red-500">업로드에 실패했습니다. 다시 시도해 주세요.</p>
      )}

      {sttStatus === 'done' && transcript && expanded && (
        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2.5 text-xs text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
          {transcript}
        </div>
      )}

      {sttStatus === 'done' && !expanded && (
        <p className="text-xs text-green-600">✓ 변환 완료 — 체크리스트가 자동 검증되었습니다</p>
      )}
    </section>
  );
}

// ── 회의록 탭 ─────────────────────────────────────────────────────────────────
function MetricsTab({ metrics }: { metrics: MeetingMetrics }) {
  return (
    <section className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
      <h3 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        회의 결과 리포트
      </h3>

      {/* 달성률 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-green-700 mb-1">
            <span>체크리스트 달성률</span>
            <span className="font-semibold">{metrics.achievementRate}%</span>
          </div>
          <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${metrics.achievementRate}%` }}
            />
          </div>
        </div>
        <div className="text-2xl font-bold text-green-700">{metrics.achievementRate}%</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white border border-green-200 rounded p-2">
          <p className="text-lg font-bold text-green-700">{metrics.completedChecklists}</p>
          <p className="text-xs text-green-600">완료 항목</p>
        </div>
        <div className="bg-white border border-green-200 rounded p-2">
          <p className="text-lg font-bold text-gray-500">{metrics.totalChecklists}</p>
          <p className="text-xs text-gray-400">전체 항목</p>
        </div>
        <div className="bg-white border border-yellow-200 rounded p-2">
          <p className="text-lg font-bold text-yellow-600">{metrics.carriedOverCount}</p>
          <p className="text-xs text-yellow-500">다음 회의 이월</p>
        </div>
      </div>

      {metrics.summaryReport && (
        <div>
          <p className="text-xs font-medium text-green-800 mb-1">AI 요약</p>
          <p className="text-xs text-green-700 bg-green-100/60 rounded px-3 py-2 leading-relaxed">
            {metrics.summaryReport}
          </p>
        </div>
      )}
    </section>
  );
}

// ── 탭 정의 ──────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; onlyCompleted?: boolean }[] = [
  { key: 'overview', label: '개요' },
  { key: 'checklist', label: '체크리스트' },
  { key: 'stt', label: 'STT' },
  { key: 'metrics', label: '회의록', onlyCompleted: true },
];

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [briefing, setBriefing] = useState<MeetingBriefing | null>(null);
  const [metrics, setMetrics] = useState<MeetingMetrics | null>(null);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', scheduledAt: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);

    Promise.all([
      meetingsApi.get(meetingId),
      meetingsApi.getChecklists(meetingId).catch(() => [] as ChecklistItem[]),
      meetingsApi.getBriefing(meetingId).catch(() => null),
    ]).then(([m, cl, br]) => {
      setMeeting(m);
      setChecklists(cl);
      setBriefing(br);

      if (m.status === 'COMPLETED') {
        meetingsApi.getMetrics(meetingId).then(setMetrics).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [meetingId]);

  const complete = async () => {
    if (!meetingId || !meeting) return;
    setCompleting(true);
    try {
      const updated = await meetingsApi.complete(meetingId);
      setMeeting(updated);
      const m = await meetingsApi.getMetrics(meetingId).catch(() => null);
      if (m) setMetrics(m);
    } finally {
      setCompleting(false);
    }
  };

  const openEdit = () => {
    if (!meeting) return;
    setEditForm({
      title: meeting.title,
      scheduledAt: meeting.scheduledAt.slice(0, 16),
    });
    setEditMode(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId) return;
    setSaving(true);
    try {
      const updated = await meetingsApi.update(meetingId, editForm);
      setMeeting(updated);
      setEditMode(false);
    } finally { setSaving(false); }
  };

  const deleteMeeting = async () => {
    if (!meetingId || !meeting) return;
    if (!confirm('회의를 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await meetingsApi.delete(meetingId);
      navigate(`/projects/${meeting.projectId}`, { replace: true });
    } finally { setDeleting(false); }
  };

  if (loading || !meeting) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeCls = MEETING_TYPE_COLOR[meeting.type] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  const st = STATUS_MAP[meeting.status];
  const isCompleted = meeting.status === 'COMPLETED';
  const availableTabs = TABS.filter(t => !t.onlyCompleted || isCompleted);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* 헤더 */}
      <div>
        <Link
          to={`/projects/${meeting.projectId}`}
          className="text-xs text-gray-400 hover:text-orange-500 transition flex items-center gap-1 mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          프로젝트로 돌아가기
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-1.5 py-0.5 border rounded ${typeCls}`}>
                {MEETING_TYPE_LABEL[meeting.type]}
              </span>
              <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{meeting.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(meeting.scheduledAt).toLocaleString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
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

          {!isCompleted && meeting.status === 'IN_PROGRESS' && (
            <button
              onClick={complete}
              disabled={completing}
              className="shrink-0 bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
            >
              {completing ? '처리 중...' : '회의 종료'}
            </button>
          )}
        </div>
      </div>

      {/* 수정 폼 */}
      {editMode && (
        <form onSubmit={saveEdit} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
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
      <div className="flex border-b border-gray-200">
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

      {tab === 'overview' && (
        <OverviewTab
          meeting={meeting}
          briefing={briefing}
          onComplete={complete}
          completing={completing}
        />
      )}

      {tab === 'checklist' && (
        <ChecklistTab
          meetingId={meeting.id}
          items={checklists}
          onChange={setChecklists}
          readonly={isCompleted}
        />
      )}

      {tab === 'stt' && <SttTab meetingId={meeting.id} />}

      {tab === 'metrics' && isCompleted && metrics && <MetricsTab metrics={metrics} />}
      {tab === 'metrics' && isCompleted && !metrics && (
        <p className="text-sm text-gray-400 text-center py-10">회의록 데이터가 없습니다</p>
      )}
    </div>
  );
}
