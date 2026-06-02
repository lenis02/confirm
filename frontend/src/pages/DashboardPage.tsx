import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { projectsApi } from '../api/projects';
import Spinner from '../components/ui/Spinner';
import { ROLE_BAR_PALETTE, FALLBACK_BAR_COLOR, type BarColor } from '../components/WbsGanttChart';
import type { CalendarWeek, WbsItem } from '../types';

type ProjectGantt = { projectId: string; name: string; items: WbsItem[] };

// 캘린더 위에 그릴 WBS 태스크 막대
const MAX_LANES = 3;
const BAR_H = 18;
const BAR_GAP = 3;
const DATE_ROW_H = 30;
const DECISION_COLOR: BarColor = { bg: '#EDE9FE', text: '#5B21B6', border: '#A78BFA' };

type GanttTask = WbsItem & { projectId: string; projectName: string };
type LaidBar = {
  key: string;
  projectId: string;
  projectName: string;
  title: string;
  isDecisionPoint: boolean;
  color: BarColor;
  segStartCol: number;
  span: number;
  lane: number;
};

function midnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function parseYmd(s: string) {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function layoutWeek(weekStart: Date, tasks: GanttTask[], colorOf: (t: GanttTask) => BarColor) {
  const DAY_MS = 86_400_000;
  const weekStartT = midnight(weekStart);
  const weekEndT = weekStartT + 6 * DAY_MS;
  const inWeek = tasks
    .filter(t => t.startDate && t.endDate)
    .map(t => ({ t, s: parseYmd(t.startDate!), e: parseYmd(t.endDate!) }))
    .filter(x => x.s <= weekEndT && x.e >= weekStartT)
    .sort((a, b) => a.s - b.s || b.e - b.s - (a.e - a.s));

  const lanesEnd: number[] = [];
  const bars: LaidBar[] = [];
  let overflow = 0;
  for (const x of inWeek) {
    const segStartCol = Math.max(0, Math.round((x.s - weekStartT) / DAY_MS));
    const segEndCol = Math.min(6, Math.round((x.e - weekStartT) / DAY_MS));
    let lane = lanesEnd.findIndex(end => end < segStartCol);
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(segEndCol);
    } else {
      lanesEnd[lane] = segEndCol;
    }
    if (lane >= MAX_LANES) {
      overflow++;
      continue;
    }
    bars.push({
      key: `${x.t.projectId}-${x.t.id}`,
      projectId: x.t.projectId,
      projectName: x.t.projectName,
      title: x.t.title,
      isDecisionPoint: !!x.t.isDecisionPoint,
      color: colorOf(x.t),
      segStartCol,
      span: segEndCol - segStartCol + 1,
      lane,
    });
  }
  return { bars, laneCount: Math.min(MAX_LANES, lanesEnd.length), overflow };
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프',
  PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크',
  CONSENSUS: '합의',
};

type DayEvent =
  | { kind: 'meeting'; id: string; title: string; type: string; status: string; projectName: string }
  | { kind: 'action'; id: string; title: string; status: string; projectName: string }
  | { kind: 'milestone'; id: string; title: string; phase: string; isDecisionPoint: boolean; projectName: string };

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const dow = firstDay.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() + offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildEventMap(weeks: CalendarWeek[]): Record<string, DayEvent[]> {
  const map: Record<string, DayEvent[]> = {};
  const seenMeetings = new Set<string>();
  const seenActions = new Set<string>();
  const seenMilestones = new Set<string>();

  for (const week of weeks) {
    for (const p of week.projects) {
      for (const m of p.meetings) {
        if (seenMeetings.has(m.id)) continue;
        seenMeetings.add(m.id);
        const date = m.scheduledAt.split('T')[0];
        (map[date] ??= []).push({
          kind: 'meeting', id: m.id, title: m.title, type: m.type,
          status: m.status, projectName: p.name,
        });
      }
      for (const a of p.actionItems) {
        if (seenActions.has(a.id)) continue;
        seenActions.add(a.id);
        (map[a.dueDate] ??= []).push({
          kind: 'action', id: a.id, title: a.title,
          status: a.status, projectName: p.name,
        });
      }
      for (const ms of p.milestones) {
        if (seenMilestones.has(ms.id)) continue;
        // 종료일(마감) 기준으로 표시, 없으면 시작일
        const dateValue = ms.endDate ?? ms.startDate;
        if (!dateValue) continue;
        seenMilestones.add(ms.id);
        const date = dateValue.split('T')[0];
        (map[date] ??= []).push({
          kind: 'milestone', id: ms.id, title: ms.title,
          phase: ms.phase, isDecisionPoint: ms.isDecisionPoint, projectName: p.name,
        });
      }
    }
  }
  return map;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [eventMap, setEventMap] = useState<Record<string, DayEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [gantts, setGantts] = useState<ProjectGantt[]>([]);

  useEffect(() => {
    setLoading(true);
    const grid = getMonthGrid(year, month);
    const mondayStrs = Array.from({ length: 6 }, (_, i) => grid[i * 7].toISOString().split('T')[0]);
    Promise.all(mondayStrs.map(w => dashboardApi.getCalendar(w)))
      .then(weeks => setEventMap(buildEventMap(weeks)))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    projectsApi.list().then(async projects => {
      const results = await Promise.all(
        projects.map(async p => {
          try {
            const wbs = await projectsApi.getWbs(p.id);
            return { projectId: p.id, name: p.name, items: wbs.items ?? [] } as ProjectGantt;
          } catch {
            return null;
          }
        }),
      );
      setGantts(results.filter((g): g is ProjectGantt => !!g && g.items.length > 0));
    });
  }, []);

  const moveMonth = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const grid = getMonthGrid(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  // WBS 태스크 → 부서(역할)별 색상 매핑
  const ganttTasks: GanttTask[] = gantts.flatMap(g =>
    g.items.map(it => ({ ...it, projectId: g.projectId, projectName: g.name })),
  );
  const roles = Array.from(new Set(ganttTasks.map(t => t.assignedRole).filter((r): r is string => !!r)));
  const roleColor = new Map<string, BarColor>();
  roles.forEach((r, i) => roleColor.set(r, ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length]));
  const colorOf = (t: GanttTask): BarColor =>
    t.isDecisionPoint ? DECISION_COLOR : (t.assignedRole && roleColor.get(t.assignedRole)) || FALLBACK_BAR_COLOR;

  const todayEvents = eventMap[todayStr] ?? [];
  const upcomingMeetings = Object.entries(eventMap)
    .flatMap(([date, evs]) => evs.filter(e => e.kind === 'meeting').map(e => ({ ...e, date })))
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="page-shell">
      <div className="mb-6">
        <h1 className="page-title">대시보드</h1>
        <p className="page-subtitle">프로젝트 일정과 의사결정 마일스톤을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* 캘린더 */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-works-border flex items-center gap-2">
            <h2 className="text-base font-semibold text-works-text mr-1">{monthLabel}</h2>
            <button onClick={() => moveMonth(-1)} className="btn-secondary !px-2.5 !py-1.5 text-lg leading-none">‹</button>
            <button onClick={() => moveMonth(1)} className="btn-secondary !px-2.5 !py-1.5 text-lg leading-none">›</button>
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
              className="ml-auto btn-ghost !py-1.5 !px-3 text-xs"
            >
              오늘
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-works-border bg-works-bg/50">
                {DAYS.map((day, i) => (
                  <div key={day} className={`py-2.5 text-center text-xs font-semibold ${i >= 5 ? 'text-red-400' : 'text-works-muted'}`}>
                    {day}
                  </div>
                ))}
              </div>

              {[0, 1, 2, 3, 4, 5].map(w => {
                const weekDays = grid.slice(w * 7, w * 7 + 7);
                const { bars, laneCount, overflow } = layoutWeek(weekDays[0], ganttTasks, colorOf);
                const bandH = laneCount * (BAR_H + BAR_GAP);

                return (
                  <div key={w} className="relative">
                    <div className="grid grid-cols-7">
                      {weekDays.map((date, di) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isToday = dateStr === todayStr;
                        const isCurrentMonth = date.getMonth() === month;
                        const isWeekend = di >= 5;
                        const chips = (eventMap[dateStr] ?? []).filter(
                          e => e.kind === 'meeting' || e.kind === 'action',
                        );

                        return (
                          <div
                            key={di}
                            className={[
                              'p-1.5 border-b border-works-border/60',
                              di < 6 ? 'border-r' : '',
                              isWeekend ? 'bg-works-bg/30' : 'bg-white',
                              isToday ? 'bg-brand-50/40 ring-1 ring-inset ring-brand-200' : '',
                              !isCurrentMonth ? 'opacity-35' : '',
                            ].join(' ')}
                            style={{ minHeight: DATE_ROW_H + bandH + 44 }}
                          >
                            <div className="flex justify-end" style={{ height: DATE_ROW_H }}>
                              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                                isToday ? 'bg-brand-500 text-white' : isWeekend ? 'text-red-400' : 'text-works-muted'
                              }`}>
                                {date.getDate()}
                              </span>
                            </div>
                            {/* WBS 막대 영역 확보 */}
                            <div style={{ height: bandH }} />
                            <div className="space-y-0.5 mt-1">
                              {chips.slice(0, 2).map((ev, j) =>
                                ev.kind === 'meeting' ? (
                                  <button
                                    key={j}
                                    onClick={() => navigate(`/meetings/${ev.id}`)}
                                    className="w-full text-left text-[11px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 truncate rounded-md hover:bg-brand-100 transition cursor-pointer"
                                    title={`${ev.projectName} · ${ev.title}`}
                                  >
                                    {MEETING_TYPE_LABEL[ev.type]} {ev.title}
                                  </button>
                                ) : (
                                  <div
                                    key={j}
                                    className={`text-[11px] px-1.5 py-0.5 truncate rounded-md border ${
                                      ev.status === 'COMPLETED'
                                        ? 'bg-works-hover text-works-subtle line-through'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}
                                    title={`${ev.projectName} · ${ev.title}`}
                                  >
                                    · {ev.title}
                                  </div>
                                ),
                              )}
                              {chips.length > 2 && (
                                <div className="text-[10px] text-works-subtle px-1">+{chips.length - 2}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* WBS 태스크 기간 막대 (주 전체에 걸쳐 표시) */}
                    {bars.map(b => (
                      <button
                        key={b.key}
                        onClick={() => navigate(`/projects/${b.projectId}`)}
                        className="absolute text-[11px] truncate rounded border px-1.5 text-left hover:shadow transition cursor-pointer"
                        style={{
                          left: `calc(${(b.segStartCol / 7) * 100}% + 3px)`,
                          width: `calc(${(b.span / 7) * 100}% - 6px)`,
                          top: DATE_ROW_H + b.lane * (BAR_H + BAR_GAP),
                          height: BAR_H,
                          lineHeight: `${BAR_H - 2}px`,
                          backgroundColor: b.color.bg,
                          color: b.color.text,
                          borderColor: b.color.border,
                        }}
                        title={`${b.projectName} · ${b.title}`}
                      >
                        {b.isDecisionPoint ? '◆ ' : ''}{b.title}
                      </button>
                    ))}
                    {overflow > 0 && (
                      <div
                        className="absolute right-1.5 text-[10px] text-works-subtle"
                        style={{ top: DATE_ROW_H + laneCount * (BAR_H + BAR_GAP) }}
                      >
                        +{overflow}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 border-t border-works-border text-[11px] text-works-muted">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-100 border border-brand-200" />회의</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200" />Action Item</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />WBS 태스크 (부서별 색상)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-200 border border-violet-300" />◆ 의사결정 마일스톤</span>
              </div>
            </>
          )}
        </div>

        {/* 사이드 위젯 */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-works-text mb-3">오늘의 일정</h3>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-works-subtle">오늘 예정된 일정이 없습니다</p>
            ) : (
              <div className="space-y-2.5">
                {todayEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      ev.kind === 'meeting' ? 'bg-brand-500' : ev.kind === 'milestone' ? 'bg-violet-500' : 'bg-amber-400'
                    }`} />
                    <div>
                      <p className="text-works-text font-medium">{ev.title}</p>
                      <p className="text-works-subtle">{ev.projectName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-works-text mb-3">다가오는 회의</h3>
            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-works-subtle">예정된 회의가 없습니다</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingMeetings.map((ev, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/meetings/${ev.id}`)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <p className="text-xs font-medium text-works-text group-hover:text-brand-600 transition truncate">{ev.title}</p>
                    <p className="text-[11px] text-works-subtle">{ev.date} · {ev.projectName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
