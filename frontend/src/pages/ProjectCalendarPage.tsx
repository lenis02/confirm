import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { meetingsApi } from '../api/meetings';
import { actionItemsApi } from '../api/actionItems';
import { getProjectColor } from '../utils/projectColors';
import type { Project, Meeting, ActionItem, ProjectWbs } from '../types';

const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];
const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};

type CalendarEvent = {
  id: string;
  type: 'meeting' | 'action' | 'milestone' | 'task' | 'project-start' | 'project-end';
  label: string;
};
type EventMap = Record<string, CalendarEvent[]>;

function getMonthCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  const dow = first.getDay();
  start.setDate(first.getDate() + (dow === 0 ? -6 : 1 - dow));
  const end = new Date(last);
  const edow = last.getDay();
  end.setDate(last.getDate() + (edow === 0 ? 0 : 7 - edow));
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}

function buildEventMap(
  project: Project,
  meetings: Meeting[],
  items: ActionItem[],
  wbs: ProjectWbs | null,
  deptFilter: string,
): EventMap {
  const map: EventMap = {};
  const push = (date: string, ev: CalendarEvent) => { (map[date] ??= []).push(ev); };

  if (project.startDate) push(project.startDate, { id: 'proj-start', type: 'project-start', label: '▶ 프로젝트 시작' });
  if (project.endDate)   push(project.endDate,   { id: 'proj-end',   type: 'project-end',   label: '■ 프로젝트 마감' });

  meetings.forEach(m => {
    push(m.scheduledAt.split('T')[0], {
      id: m.id, type: 'meeting',
      label: `${MEETING_TYPE_LABEL[m.type] ?? m.type} · ${m.title}`,
    });
  });

  items.forEach(a => {
    push(a.dueDate, {
      id: a.id, type: 'action',
      label: a.title + (a.assignee ? ` · ${a.assignee.name}` : ''),
    });
  });

  // WBS 항목: 부서 필터 적용, 마일스톤과 일반 태스크 모두 표시
  wbs?.items
    .filter(i => i.endDate && (deptFilter === '전체' || i.assignedRole === deptFilter))
    .forEach(i => {
      if (i.isDecisionPoint) {
        push(i.endDate!, { id: `wbs-${i.id}`, type: 'milestone', label: `◆ ${i.title}` });
      } else {
        push(i.endDate!, { id: `wbs-task-${i.id}`, type: 'task', label: `→ ${i.title}` });
      }
    });

  return map;
}

const EVENT_STYLE: Record<string, string> = {
  'project-start': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'project-end':   'bg-red-50 text-red-600 border border-red-200',
  'meeting':       'bg-orange-50 text-orange-700 border border-orange-200',
  'action':        'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'milestone':     'bg-purple-50 text-purple-700 border border-purple-200',
  'task':          'bg-blue-50 text-blue-700 border border-blue-200',
};

export default function ProjectCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const now = new Date();
  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [wbs, setWbs] = useState<ProjectWbs | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('전체');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      projectsApi.get(id),
      meetingsApi.list(id),
      actionItemsApi.list(id),
      projectsApi.getWbs(id).catch(() => null),
    ]).then(([p, ms, ais, w]) => {
      setProject(p);
      setMeetings(ms);
      setActionItems(ais);
      setWbs(w);
      if (p.startDate) {
        const d = new Date(p.startDate);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading || !project) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const color = getProjectColor(project.id);

  // D-Day 계산
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const daysLeft = endDate
    ? Math.ceil((endDate.getTime() - todayMidnight.getTime()) / 86400000)
    : null;

  // 부서 필터 옵션: 날짜가 있는 모든 WBS 항목의 담당 역할
  const deptOptions = ['전체', ...Array.from(new Set(
    (wbs?.items ?? []).filter(i => i.endDate && i.assignedRole).map(i => i.assignedRole)
  ))];

  const eventMap = buildEventMap(project, meetings, actionItems, wbs, deptFilter);
  const calDays = getMonthCalendarDays(year, month);
  const today = now.toISOString().split('T')[0];

  const moveMonth = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const jumpToStart = () => {
    if (!project.startDate) return;
    const d = new Date(project.startDate);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < calDays.length; i += 7) weeks.push(calDays.slice(i, i + 7));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 프로젝트 헤더 */}
      <div className="mb-5 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: color }} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <h2 className="text-base font-semibold text-gray-900 truncate">{project.name}</h2>
                <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${project.status === 'ACTIVE' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {project.status === 'ACTIVE' ? '진행 중' : '완료'}
                </span>
              </div>
              {project.description && <p className="text-xs text-gray-400 ml-5">{project.description}</p>}
              <div className="flex items-center gap-3 mt-2 ml-5 text-xs text-gray-400">
                <span>{project.startDate ?? '시작일 미정'}</span>
                <span>~</span>
                <span>{project.endDate ?? '종료일 미정'}</span>
              </div>
            </div>

            {/* D-Day */}
            {daysLeft !== null && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400 mb-0.5">종료까지</p>
                <p className={`text-2xl font-bold leading-none ${
                  daysLeft < 0 ? 'text-gray-400' :
                  daysLeft === 0 ? 'text-red-500' :
                  daysLeft <= 7 ? 'text-red-500' :
                  'text-orange-500'
                }`}>
                  {daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? 'D-Day' : `D-${daysLeft}`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{project.endDate}</p>
              </div>
            )}

            <Link
              to={`/projects/${project.id}`}
              className="shrink-0 text-xs border border-gray-300 text-gray-500 px-2.5 py-1.5 rounded hover:bg-gray-50 transition self-start"
            >
              상세 보기
            </Link>
          </div>
        </div>
      </div>

      {/* 부서 필터 */}
      {deptOptions.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 shrink-0 font-medium">부서 필터</span>
          {deptOptions.map(dept => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
                deptFilter === dept
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
              style={deptFilter === dept ? { backgroundColor: color, borderColor: color } : {}}
            >
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* 캘린더 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mr-1">{year}년 {month + 1}월</h3>
        <button onClick={() => moveMonth(-1)} className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer">‹</button>
        <button onClick={() => moveMonth(1)}  className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer">›</button>
        {project.startDate && (
          <button onClick={jumpToStart} className="text-xs border border-gray-300 px-2.5 py-1 rounded text-gray-500 hover:bg-gray-50 transition cursor-pointer">시작월로</button>
        )}
        <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }} className="ml-auto text-xs border border-gray-300 px-2.5 py-1 rounded text-gray-600 hover:bg-gray-100 transition cursor-pointer">이번 달</button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS_KO.map((d, i) => (
            <div key={d} className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-gray-200 ${i >= 5 ? 'text-red-400 bg-red-50/40' : 'text-gray-500 bg-gray-50'}`}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 border-gray-100">
            {week.map((date, di) => {
              const dateStr = date.toISOString().split('T')[0];
              const inMonth = date.getMonth() === month;
              const isToday = dateStr === today;
              const isWeekend = di >= 5;

              const inRange = project.startDate && project.endDate
                ? dateStr >= project.startDate && dateStr <= project.endDate
                : project.startDate ? dateStr >= project.startDate : false;

              const events = eventMap[dateStr] ?? [];
              const visible = events.slice(0, 4);
              const extra = events.length - 4;

              return (
                <div
                  key={di}
                  className={[
                    'min-h-32 p-1.5 border-r last:border-r-0 border-gray-100 transition',
                    isWeekend ? 'bg-gray-50/50' : '',
                    isToday ? 'bg-orange-50/40' : '',
                    !inMonth ? 'opacity-35' : '',
                    inRange && inMonth ? 'ring-inset ring-1' : '',
                  ].join(' ')}
                  style={inRange && inMonth ? { '--tw-ring-color': color + '40' } as React.CSSProperties : {}}
                >
                  <div className={[
                    'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                    isToday ? 'bg-orange-500 text-white' : isWeekend ? 'text-red-400' : 'text-gray-600',
                  ].join(' ')}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-0.5">
                    {visible.map(ev => (
                      <div
                        key={ev.id}
                        title={ev.label}
                        className={`text-xs px-1 py-0.5 rounded-sm truncate leading-snug ${EVENT_STYLE[ev.type] ?? 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                      >
                        {ev.label}
                      </div>
                    ))}
                    {extra > 0 && <p className="text-xs text-gray-400 pl-0.5">+{extra}개 더</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
        <span className="text-gray-400">범례</span>
        {[
          { cls: EVENT_STYLE['project-start'], label: '프로젝트 시작' },
          { cls: EVENT_STYLE['project-end'],   label: '프로젝트 마감' },
          { cls: EVENT_STYLE['meeting'],        label: '회의' },
          { cls: EVENT_STYLE['action'],         label: 'Action Item' },
          { cls: EVENT_STYLE['milestone'],      label: 'WBS 마일스톤' },
          { cls: EVENT_STYLE['task'],           label: 'WBS 태스크' },
        ].map(({ cls, label }) => (
          <span key={label} className={`px-1.5 py-0.5 rounded-sm border ${cls}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}
