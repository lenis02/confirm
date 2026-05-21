import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { meetingsApi } from '../api/meetings';
import { actionItemsApi } from '../api/actionItems';
import { useToast } from '../context/ToastContext';
import type { Project, Document, ProjectWbs, Meeting, ActionItem, MeetingRecommendation } from '../types';

type Tab = 'wbs' | 'meetings' | 'members' | 'actions';

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
  COMPLETED: { label: '완료', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};
const COMPLEXITY_COLOR: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border-red-200',
  Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
};

// ── 진행 현황 요약 ─────────────────────────────────────────────────────────────
const REC_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};
const REC_TYPE_COLOR: Record<string, string> = {
  KICKOFF: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PROGRESS_CHECK: 'bg-orange-50 text-orange-600 border-orange-200',
  ISSUE_CHECK: 'bg-red-50 text-red-600 border-red-200',
  CONSENSUS: 'bg-green-50 text-green-700 border-green-200',
};

function ProgressSummary({ projectId, project }: { projectId: string; project: Project }) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);

  useEffect(() => {
    actionItemsApi.list(projectId).then(setActionItems).catch(() => {});
    meetingsApi.list(projectId).then(setMeetings).catch(() => {});
    projectsApi.getWbs(projectId).then(setWbs).catch(() => {});
  }, [projectId]);

  const totalItems = actionItems.length;
  const doneItems = actionItems.filter(a => a.status === 'COMPLETED').length;
  const actionPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : null;

  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED' && m.achievementRate !== undefined);
  const avgAchievement = completedMeetings.length > 0
    ? Math.round(completedMeetings.reduce((s, m) => s + (m.achievementRate ?? 0), 0) / completedMeetings.length)
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextMilestone = wbs?.items
    .filter(i => i.isDecisionPoint && i.endDate)
    .map(i => ({ ...i, daysLeft: Math.ceil((new Date(i.endDate!).getTime() - today.getTime()) / 86400000) }))
    .filter(i => i.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null;

  return (
    <div className="mb-5 bg-white border border-gray-200 rounded p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">프로젝트 현황</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Action Item 완료율 */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Action Item</p>
          {actionPct !== null ? (
            <>
              <p className="text-lg font-bold text-gray-800">{actionPct}%</p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${actionPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{doneItems}/{totalItems} 완료</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-1">데이터 없음</p>}
        </div>

        {/* 회의 달성률 */}
        <div>
          <p className="text-xs text-gray-400 mb-1">평균 회의 달성률</p>
          {avgAchievement !== null ? (
            <>
              <p className="text-lg font-bold text-gray-800">{avgAchievement}%</p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${avgAchievement}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{completedMeetings.length}회 완료</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-1">데이터 없음</p>}
        </div>

        {/* WBS 상태 */}
        <div>
          <p className="text-xs text-gray-400 mb-1">WBS 상태</p>
          {wbs ? (
            <>
              <span className={`inline-block text-xs px-2 py-0.5 border rounded mt-1 ${wbs.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                {wbs.status === 'CONFIRMED' ? '확정' : '초안'}
              </span>
              <p className="text-xs text-gray-400 mt-1">{wbs.items.length}개 태스크</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-1">생성 전</p>}
        </div>

        {/* 다음 마일스톤 */}
        <div>
          <p className="text-xs text-gray-400 mb-1">다음 마일스톤</p>
          {nextMilestone ? (
            <>
              <p className="text-sm font-semibold text-gray-800 truncate">{nextMilestone.title}</p>
              <p className={`text-lg font-bold mt-0.5 ${nextMilestone.daysLeft <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                D-{nextMilestone.daysLeft}
              </p>
              <p className="text-xs text-gray-400">{nextMilestone.endDate}</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-1">없음</p>}
        </div>
      </div>
    </div>
  );
}

// ── WBS 탭 ────────────────────────────────────────────────────────────────────
function WbsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);
  const [wbsError, setWbsError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const loadDocs = () => projectsApi.listDocuments(projectId).then(setDocs);
  const loadWbs = () =>
    projectsApi.getWbs(projectId).then(setWbs).catch(() => setWbsError(true));

  useEffect(() => {
    loadDocs();
    loadWbs();
    return () => clearInterval(pollRef.current);
  }, [projectId]);

  useEffect(() => {
    const processing = docs.some(d => d.status === 'PENDING' || d.status === 'IN_PROGRESS');
    clearInterval(pollRef.current);
    if (processing) {
      pollRef.current = setInterval(async () => {
        await loadDocs();
        await loadWbs();
        const latest = await projectsApi.listDocuments(projectId);
        if (latest.every(d => d.status === 'COMPLETED' || d.status === 'FAILED')) {
          clearInterval(pollRef.current);
        }
      }, 3000);
    }
  }, [docs, projectId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setWbsError(false);
    try {
      await projectsApi.uploadDocument(projectId, file);
      await loadDocs();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
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

  const isProcessing = docs.some(d => d.status === 'PENDING' || d.status === 'IN_PROGRESS');

  return (
    <div className="space-y-4">
      {/* 업로드 */}
      <div className="border-2 border-dashed border-gray-200 rounded p-5 text-center bg-gray-50">
        <p className="text-xs text-gray-400 mb-3">수행계획서(PDF)를 업로드하면 AI가 WBS를 자동 생성합니다</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={upload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || isProcessing}
          className="border border-orange-400 text-orange-600 px-4 py-1.5 rounded text-sm hover:bg-orange-50 transition disabled:opacity-50 cursor-pointer"
        >
          {uploading ? '업로드 중...' : '파일 선택'}
        </button>
      </div>

      {/* 문서 목록 */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded px-4 py-2.5 text-sm">
              <span className="flex-1 truncate text-gray-700">{d.fileName}</span>
              {(d.status === 'PENDING' || d.status === 'IN_PROGRESS') ? (
                <span className="flex items-center gap-1.5 text-xs text-orange-500">
                  <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />
                  분석 중
                </span>
              ) : d.status === 'COMPLETED' ? (
                <span className="text-xs text-green-600">완료</span>
              ) : (
                <span className="text-xs text-red-500">실패</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WBS */}
      {wbs && !wbsError && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">WBS</span>
              <span className={`text-xs px-1.5 py-0.5 border rounded ${wbs.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                {wbs.status === 'CONFIRMED' ? '확정' : '초안'}
              </span>
            </div>
            {wbs.status === 'DRAFT' && (
              <button
                onClick={confirm}
                disabled={confirming}
                className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
              >
                {confirming ? '확정 중...' : 'WBS 확정'}
              </button>
            )}
          </div>

          {wbs.projectSummary && (
            <p className="text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded px-3 py-2 mb-3">{wbs.projectSummary}</p>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['ID', '태스크명', '부서', '복잡도', '기간', '시작일', '종료일', '의사결정'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wbs.items.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.isDecisionPoint ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{item.taskId ?? `T${String(item.order).padStart(2, '0')}`}</td>
                    <td className="px-3 py-2 max-w-xs">
                      <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                      {item.reasoning && <div className="text-xs text-gray-400 truncate">{item.reasoning}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.assignedRole}</td>
                    <td className="px-3 py-2">
                      {item.complexity && (
                        <span className={`text-xs px-1.5 py-0.5 border rounded ${COMPLEXITY_COLOR[item.complexity] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {item.complexity}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.durationDays}일</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{item.startDate ?? '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{item.endDate ?? '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleDecision(item.id, item.isDecisionPoint)}
                        className={`w-4 h-4 border flex items-center justify-center transition cursor-pointer rounded-sm ${item.isDecisionPoint ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}
                      >
                        {item.isDecisionPoint && <span className="text-xs leading-none">✓</span>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 회의 추천 섹션 ─────────────────────────────────────────────────────────────
function RecommendationsSection({ projectId }: { projectId: string }) {
  const [recs, setRecs] = useState<MeetingRecommendation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getMeetingRecommendations(projectId);
      setRecs(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch {
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-700">AI 회의 추천 일정</span>
          <span className="text-xs text-blue-400">WBS 마일스톤 기반</span>
        </div>
        <button
          onClick={open ? () => setOpen(false) : load}
          disabled={loading}
          className="text-xs border border-blue-300 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? '조회 중...' : open ? '접기' : '추천 보기'}
        </button>
      </div>

      {open && (
        recs.length === 0 ? (
          <p className="text-xs text-blue-400 mt-2">WBS가 확정되어야 추천을 받을 수 있습니다</p>
        ) : (
          <div className="space-y-2 mt-3">
            {recs.map((rec, idx) => (
              <div key={rec.milestoneId ?? idx} className="bg-white border border-blue-100 rounded px-3 py-2.5">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 border rounded shrink-0 ${REC_TYPE_COLOR[rec.meetingType]}`}>
                    {REC_TYPE_LABEL[rec.meetingType]}
                  </span>
                  <span className="text-sm font-medium text-gray-800 leading-tight">{rec.milestoneTitle}</span>
                  {rec.suggestedDate && (
                    <span className="ml-auto text-xs text-gray-400 shrink-0">{rec.suggestedDate}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 ml-0 mt-1">{rec.reason}</p>
                {rec.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rec.participants.map(p => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── 회의 탭 ───────────────────────────────────────────────────────────────────
function MeetingsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'KICKOFF', scheduledAt: '' });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => meetingsApi.list(projectId).then(setMeetings);
  useEffect(() => { load(); }, [projectId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    try {
      await meetingsApi.create(projectId, form);
      toast('회의가 생성되었습니다', 'success');
      await load();
      setShowForm(false);
      setForm({ title: '', type: 'KICKOFF', scheduledAt: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '서버에 연결할 수 없습니다.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally { setLoading(false); }
  };

  const complete = async (meetingId: string) => {
    try {
      await meetingsApi.complete(meetingId);
      toast('회의가 완료 처리되었습니다', 'success');
      load();
    } catch {
      toast('완료 처리에 실패했습니다', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <RecommendationsSection projectId={projectId} />

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer"
        >+ 회의 생성</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            placeholder="회의 제목 *"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {Object.entries(MEETING_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
              type="datetime-local"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              required
              value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '생성 중...' : '생성'}
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
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{m.title}</span>
                <span className="text-xs text-gray-400">{new Date(m.scheduledAt).toLocaleDateString('ko-KR')}</span>
                <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
                {m.status === 'COMPLETED' && m.achievementRate !== undefined && (
                  <span className="text-xs text-gray-400">{m.achievementRate}%</span>
                )}
                <Link
                  to={`/meetings/${m.id}`}
                  className="text-xs border border-orange-300 text-orange-600 px-2 py-0.5 rounded hover:bg-orange-50 transition"
                >
                  상세
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 팀원 탭 ───────────────────────────────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  PM: 'bg-orange-50 text-orange-600 border-orange-200',
  DEVELOPER: 'bg-blue-50 text-blue-700 border-blue-200',
  DESIGNER: 'bg-pink-50 text-pink-700 border-pink-200',
  QA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DEVOPS: 'bg-red-50 text-red-600 border-red-200',
  OTHER: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ROLE_LABEL: Record<string, string> = {
  PM: 'PM', DEVELOPER: '개발자', DESIGNER: '디자이너',
  QA: 'QA', DEVOPS: 'DevOps', OTHER: '기타',
};

const ROLES = ['PM', 'DEVELOPER', 'DESIGNER', 'QA', 'DEVOPS', 'OTHER'];

function MembersTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ userId: '', role: 'DEVELOPER' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const load = () => projectsApi.getMembers(projectId).then(setMembers);
  useEffect(() => { load(); }, [projectId]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInviteError('');
    try {
      await projectsApi.addMember(projectId, inviteForm);
      toast('팀원이 추가되었습니다', 'success');
      await load();
      setShowInvite(false);
      setInviteForm({ userId: '', role: 'DEVELOPER' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '팀원 추가에 실패했습니다.';
      setInviteError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally { setLoading(false); }
  };

  const saveRole = async (memberId: string) => {
    try {
      await projectsApi.updateMember(projectId, memberId, { role: editRole });
      toast('역할이 변경되었습니다', 'success');
      setEditingId(null);
      load();
    } catch {
      toast('역할 변경에 실패했습니다', 'error');
    }
  };

  const remove = async (memberId: string, name: string) => {
    if (!confirm(`${name} 님을 프로젝트에서 제거하시겠습니까?`)) return;
    try {
      await projectsApi.removeMember(projectId, memberId);
      toast('팀원이 제거되었습니다', 'success');
      load();
    } catch {
      toast('팀원 제거에 실패했습니다', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowInvite(p => !p); setInviteError(''); }}
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer"
        >+ 팀원 추가</button>
      </div>

      {/* 초대 폼 */}
      {showInvite && (
        <form onSubmit={invite} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">사용자 ID (UUID)</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              placeholder="초대할 사용자의 ID를 입력하세요"
              required
              value={inviteForm.userId}
              onChange={e => setInviteForm(f => ({ ...f, userId: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">역할</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              value={inviteForm.role}
              onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          {inviteError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{inviteError}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowInvite(false); setInviteError(''); }}
              className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-white transition cursor-pointer">취소</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded py-2 text-sm hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer">
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      {/* 팀원 목록 */}
      {members.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">팀원이 없습니다</p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => (
            <div key={m.id} className="bg-white border border-gray-200 rounded px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                {m.user?.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{m.user?.name ?? '알 수 없음'}</p>
                <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
              </div>

              {/* 역할 — 편집 중이면 드롭다운, 아니면 뱃지 */}
              {editingId === m.id ? (
                <div className="flex items-center gap-1.5">
                  <select
                    className="border border-orange-300 rounded px-2 py-1 text-xs bg-white focus:outline-none cursor-pointer"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  <button onClick={() => saveRole(m.id)}
                    className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition cursor-pointer">저장</button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs border border-gray-300 text-gray-500 px-2 py-1 rounded hover:bg-gray-50 transition cursor-pointer">취소</button>
                </div>
              ) : (
                <span className={`text-xs px-1.5 py-0.5 border rounded ${ROLE_COLOR[m.role]}`}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              )}

              {/* 역할 수정 / 제거 버튼 */}
              {editingId !== m.id && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                    className="text-xs text-gray-400 hover:text-orange-500 transition cursor-pointer"
                    title="역할 수정"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414A2 2 0 019.586 13z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(m.id, m.user?.name ?? '팀원')}
                    className="text-xs text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="제거"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action Items 탭 ───────────────────────────────────────────────────────────
function ActionItemsTab({ projectId, members }: { projectId: string; members: Project['members'] }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', assigneeId: '', dueDate: '' });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => actionItemsApi.list(projectId).then(setItems);
  useEffect(() => { load(); }, [projectId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    try {
      await actionItemsApi.create(projectId, form);
      toast('Action Item이 추가되었습니다', 'success');
      await load();
      setShowForm(false);
      setForm({ title: '', assigneeId: '', dueDate: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '서버에 연결할 수 없습니다.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally { setLoading(false); }
  };

  const toggle = async (id: string) => {
    try {
      await actionItemsApi.toggle(id);
      load();
    } catch {
      toast('상태 변경에 실패했습니다', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="border border-orange-400 text-orange-600 px-3 py-1.5 rounded text-sm hover:bg-orange-50 transition cursor-pointer"
        >+ Action Item</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3">
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            placeholder="제목 *"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400 cursor-pointer"
              required
              value={form.assigneeId}
              onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
            >
              <option value="">담당자 선택 *</option>
              {members.map(m => <option key={m.userId} value={m.userId}>{m.user?.name}</option>)}
            </select>
            <input
              type="date"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
              required
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
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
              <button
                onClick={() => toggle(item.id)}
                className={`w-4 h-4 border flex items-center justify-center shrink-0 transition cursor-pointer rounded-sm ${item.status === 'COMPLETED' ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}
              >
                {item.status === 'COMPLETED' && <span className="text-xs leading-none">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${item.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.title}
              </span>
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

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
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
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>('wbs');

  useEffect(() => {
    if (id) projectsApi.get(id).then(setProject);
  }, [id]);

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const st = PROJECT_STATUS[project.status];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="mb-5 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5 mb-0.5">
          <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
          <span className={`text-xs px-1.5 py-0.5 border rounded ${st.cls}`}>{st.label}</span>
        </div>
        {project.description && (
          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
        )}
        {project.startDate && (
          <p className="text-xs text-gray-400 mt-1">{project.startDate} ~ {project.endDate ?? '미정'}</p>
        )}
      </div>

      {/* 진행 현황 요약 */}
      <ProgressSummary projectId={project.id} project={project} />

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition cursor-pointer ${
              tab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'wbs' && <WbsTab projectId={project.id} />}
      {tab === 'meetings' && <MeetingsTab projectId={project.id} />}
      {tab === 'members' && <MembersTab projectId={project.id} />}
      {tab === 'actions' && <ActionItemsTab projectId={project.id} members={project.members} />}
    </div>
  );
}
