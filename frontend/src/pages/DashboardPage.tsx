import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { getProjectColor } from '../utils/projectColors';
import type { CalendarWeek, DashboardProject } from '../types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프',
  PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크',
  CONSENSUS: '합의',
};
const MEETING_STATUS_CLS: Record<string, string> = {
  SCHEDULED: 'bg-gray-50 text-gray-500',
  IN_PROGRESS: 'bg-orange-50 text-orange-600',
  COMPLETED: 'bg-green-50 text-green-600',
};
const MEETING_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '예정', IN_PROGRESS: '진행 중', COMPLETED: '완료',
};

type DayEvent =
  | { kind: 'meeting'; id: string; title: string; type: string; status: string; projectName: string; projectId: string }
  | { kind: 'action'; id: string; title: string; status: string; projectName: string; projectId: string };

function calcChartRange(projects: DashboardProject[]): { start: Date; end: Date } {
  const dated = projects.filter(p => p.startDate && p.endDate);
  if (dated.length === 0) {
    const now = new Date();
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
  }
  const starts = dated.map(p => new Date(p.startDate!).getTime());
  const ends   = dated.map(p => new Date(p.endDate!).getTime());
  const s = new Date(Math.min(...starts)); s.setDate(1); s.setMonth(s.getMonth() - 1);
  const e = new Date(Math.max(...ends));   e.setDate(1); e.setMonth(e.getMonth() + 2);
  return { start: s, end: e };
}

function toPct(date: Date | string, start: Date, totalMs: number): number {
  const t = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  return Math.max(0, Math.min(100, ((t - start.getTime()) / totalMs) * 100));
}

function genMonthMarkers(start: Date, end: Date, totalMs: number) {
  const marks: { label: string; pct: number }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    marks.push({ label: `${cur.getMonth() + 1}월`, pct: toPct(cur, start, totalMs) });
    cur.setMonth(cur.getMonth() + 1);
  }
  return marks;
}

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
  for (const week of weeks) {
    for (const p of week.projects) {
      for (const m of p.meetings) {
        if (seenMeetings.has(m.id)) continue;
        seenMeetings.add(m.id);
        const date = m.scheduledAt.split('T')[0];
        (map[date] ??= []).push({ kind: 'meeting', id: m.id, title: m.title, type: m.type, status: m.status, projectName: p.name, projectId: p.id });
      }
      for (const a of p.actionItems) {
        if (seenActions.has(a.id)) continue;
        seenActions.add(a.id);
        (map[a.dueDate] ??= []).push({ kind: 'action', id: a.id, title: a.title, status: a.status, projectName: p.name, projectId: p.id });
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
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const grid = getMonthGrid(year, month);
    const mondayStrs = Array.from({ length: 6 }, (_, i) => grid[i * 7].toISOString().split('T')[0]);
    Promise.all(mondayStrs.map(w => dashboardApi.getCalendar(w)))
      .then(weeks => setEventMap(buildEventMap(weeks)))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    dashboardApi.getOverview(today.getFullYear(), today.getMonth())
      .then(d => setProjects(d.projects))
      .catch(() => setProjects([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveMonth = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const grid = getMonthGrid(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const datedProjects   = projects.filter(p => p.startDate && p.endDate);
  const undatedProjects = projects.filter(p => !p.startDate || !p.endDate);

  const { start: chartStart, end: chartEnd } = calcChartRange(projects);
  const totalMs  = chartEnd.getTime() - chartStart.getTime();
  const pct      = (d: Date | string) => toPct(d, chartStart, totalMs);
  const months   = genMonthMarkers(chartStart, chartEnd, totalMs);
  const todayPct = pct(today);

  const allMeetings = projects
    .flatMap(p => p.meetings.map(m => ({ ...m, projectId: p.id, projectName: p.name })))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // 날짜별 프로젝트 바 맵
  const projectBarMap: Record<string, { projectId: string; isStart: boolean; isEnd: boolean }[]> = {};
  for (const p of projects) {
    if (!p.startDate || !p.endDate) continue;
    const startStr = p.startDate.slice(0, 10);
    const endStr = p.endDate.slice(0, 10);
    grid.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr >= startStr && dateStr <= endStr) {
        (projectBarMap[dateStr] ??= []).push({
          projectId: p.id,
          isStart: dateStr === startStr,
          isEnd: dateStr === endStr,
        });
      }
    });
  }

  // 프로젝트 바가 있는 projectId 목록 (날짜 기반)
  const datedProjectIds = new Set(datedProjects.map(p => p.id));

  return (
    <div className="p-4 flex flex-col gap-3 h-full overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 shrink-0">
        <h2 className="text-base font-semibold text-gray-800 mr-1">{monthLabel}</h2>
        <button onClick={() => moveMonth(-1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer">
          ‹
        </button>
        <button onClick={() => moveMonth(1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer">
          ›
        </button>
        <button onClick={goToday}
          className="ml-auto text-xs border border-gray-300 px-2.5 py-1 rounded text-gray-600 hover:bg-gray-100 transition cursor-pointer">
          오늘
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 프로젝트 요약 카드 ── */}
          {projects.length > 0 && (
            <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
              {projects.map(p => {
                const color = getProjectColor(p.id);
                return (
                  <Link key={p.id} to={`/projects/${p.id}/calendar`}
                    className="shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition w-36">
                    <div className="h-1" style={{ backgroundColor: color }} />
                    <div className="p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{p.startDate ?? '시작일 미정'} ~</p>
                      {p.meetings.length > 0 && (
                        <p className="text-[10px] text-orange-500 font-medium">회의 {p.meetings.length}건</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── 월 캘린더 (화면 채움) ── */}
          <div className="bg-white border border-gray-200 rounded overflow-hidden flex-1 min-h-0 flex flex-col">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
              {DAYS.map((day, i) => (
                <div key={day}
                  className={`py-1.5 text-center text-xs font-medium border-r last:border-r-0 border-gray-200 ${i >= 5 ? 'text-red-400 bg-red-50/40' : 'text-gray-500 bg-gray-50'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 (6주, flex-1로 남은 공간 채움) */}
            <div className="flex-1 min-h-0 grid grid-cols-7" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
              {grid.map((date, i) => {
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const isCurrentMonth = date.getMonth() === month;
                const isWeekend = i % 7 >= 5;
                const events = eventMap[dateStr] ?? [];
                const bars = projectBarMap[dateStr] ?? [];
                const row = Math.floor(i / 7);

                // 프로젝트 바가 없는 이벤트만 별도 표시
                const orphanEvents = events.filter(ev => !datedProjectIds.has(ev.projectId));

                return (
                  <div key={i}
                    className={[
                      'p-1 border-r border-b last:border-r-0 border-gray-100 overflow-hidden flex flex-col',
                      row === 5 ? 'border-b-0' : '',
                      isWeekend ? 'bg-gray-50/50' : '',
                      isToday ? 'bg-orange-50/40' : '',
                      !isCurrentMonth ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {/* 날짜 숫자 */}
                    <div className="flex justify-end mb-0.5 shrink-0">
                      <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-orange-500 text-white' : isWeekend ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* 프로젝트 바 (이벤트 포함) */}
                    <div className="space-y-px flex-1 min-h-0">
                      {bars.map(({ projectId, isStart, isEnd }) => {
                        const color = getProjectColor(projectId);
                        const proj = projects.find(p => p.id === projectId);
                        const projEvents = events.filter(ev => ev.projectId === projectId);

                        return (
                          <div
                            key={projectId}
                            className={`-mx-1 flex items-center gap-1 overflow-hidden px-1 ${
                              isStart && isEnd ? 'rounded mx-0.5' :
                              isStart ? 'rounded-l ml-0.5' :
                              isEnd   ? 'rounded-r mr-0.5' : ''
                            }`}
                            style={{
                              height: '20px',
                              backgroundColor: color + '25',
                              borderTop: `2px solid ${color}90`,
                            }}
                            title={proj?.name ?? ''}
                          >
                            {/* 프로젝트명 (시작일만) */}
                            {isStart && proj && (
                              <span className="text-[9px] font-semibold shrink-0 leading-none" style={{ color }}>
                                {proj.name}
                              </span>
                            )}
                            {/* 이벤트 텍스트 (바 내부) */}
                            {projEvents.map(ev => (
                              ev.kind === 'meeting' ? (
                                <button
                                  key={ev.id}
                                  onClick={() => navigate(`/meetings/${ev.id}`)}
                                  className="text-[9px] shrink-0 px-1 rounded-sm leading-none cursor-pointer hover:opacity-80 transition"
                                  style={{ backgroundColor: color + '40', color }}
                                  title={ev.title}
                                >
                                  {MEETING_TYPE_LABEL[ev.type] ?? ev.type}
                                </button>
                              ) : (
                                <span
                                  key={ev.id}
                                  className="text-[9px] shrink-0 px-0.5 leading-none"
                                  style={{ color }}
                                  title={ev.title}
                                >
                                  ·{ev.title}
                                </span>
                              )
                            ))}
                          </div>
                        );
                      })}

                      {/* 날짜 없는 프로젝트의 이벤트 (별도 표시) */}
                      {orphanEvents.map(ev =>
                        ev.kind === 'meeting' ? (
                          <button key={ev.id} onClick={() => navigate(`/meetings/${ev.id}`)}
                            className="w-full text-left text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1 leading-tight truncate rounded-sm hover:bg-orange-100 transition cursor-pointer block"
                            title={`${ev.projectName} · ${ev.title}`}>
                            {MEETING_TYPE_LABEL[ev.type]} {ev.title}
                          </button>
                        ) : (
                          <div key={ev.id}
                            className={`text-[10px] px-1 leading-tight truncate rounded-sm border ${
                              ev.status === 'COMPLETED'
                                ? 'bg-gray-50 text-gray-400 border-gray-200 line-through'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                            title={`${ev.projectName} · ${ev.title}`}>
                            · {ev.title}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 이번 달 주요 이슈 ── */}
          {allMeetings.length > 0 && (
            <div className="shrink-0">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">이번 달 주요 이슈</h3>
              <div className="space-y-1">
                {allMeetings.slice(0, 5).map(m => {
                  const color = getProjectColor(m.projectId);
                  return (
                    <div key={m.id}
                      className="bg-white border border-gray-200 rounded px-3 py-1.5 flex items-center gap-2.5"
                      style={{ borderLeft: `3px solid ${color}` }}>
                      <span className="text-[10px] font-medium text-gray-500 w-12 shrink-0">
                        {new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                        {MEETING_TYPE_LABEL[m.type] ?? m.type}
                      </span>
                      <span className="text-xs text-gray-800 flex-1 truncate">{m.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0 truncate max-w-24">{m.projectName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${MEETING_STATUS_CLS[m.status] ?? ''}`}>
                        {MEETING_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </div>
                  );
                })}
                {allMeetings.length > 5 && (
                  <p className="text-[10px] text-gray-400 pl-2">+{allMeetings.length - 5}개 더</p>
                )}
              </div>
            </div>
          )}

          {/* ── 프로젝트 타임라인 ── */}
          {datedProjects.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shrink-0">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">프로젝트 타임라인</h3>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />TODAY
                  </span>
                </div>
              </div>

              <div className="flex">
                <div className="w-32 shrink-0 border-r border-gray-100 bg-gray-50/30">
                  <div className="h-6 border-b border-gray-100" />
                  {datedProjects.map(p => (
                    <div key={p.id} className="h-8 border-b border-gray-50 last:border-b-0 flex items-center px-2.5">
                      <Link to={`/projects/${p.id}/calendar`} className="flex items-center gap-1.5 min-w-0 group">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(p.id) }} />
                        <span className="text-xs text-gray-700 truncate group-hover:text-orange-600 transition">{p.name}</span>
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-w-0 relative overflow-x-auto">
                  <div className="relative h-6 border-b border-gray-100 bg-gray-50/50 select-none">
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full flex flex-col" style={{ left: `${m.pct}%` }}>
                        <div className="w-px h-full bg-gray-200" />
                        <span className="absolute top-1 left-1 text-[10px] text-gray-400 whitespace-nowrap">{m.label}</span>
                      </div>
                    ))}
                  </div>

                  {datedProjects.map(p => {
                    const color    = getProjectColor(p.id);
                    const leftPct  = pct(p.startDate!);
                    const widthPct = Math.max(pct(p.endDate!) - leftPct, 0.5);
                    return (
                      <div key={p.id} className="relative h-8 border-b border-gray-50 last:border-b-0">
                        {months.map((m, i) => (
                          <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${m.pct}%` }} />
                        ))}
                        <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${todayPct}%`, backgroundColor: '#fb923c80' }} />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-full"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: '14px', backgroundColor: color + '28', border: `1.5px solid ${color}60` }}
                        />
                        {p.meetings.map(m => (
                          <div key={m.id}
                            title={`${MEETING_TYPE_LABEL[m.type] ?? m.type}: ${m.title}`}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-20 cursor-pointer hover:scale-150 transition-transform ring-1 ring-white"
                            style={{ left: `calc(${pct(m.scheduledAt)}% - 4px)`, backgroundColor: color }}
                          />
                        ))}
                      </div>
                    );
                  })}

                  <div className="absolute bottom-0 pb-0.5 text-[9px] font-semibold text-orange-400"
                    style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}>
                    TODAY
                  </div>
                </div>
              </div>

              {undatedProjects.length > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 shrink-0">날짜 미설정:</span>
                  {undatedProjects.map(p => (
                    <Link key={p.id} to={`/projects/${p.id}/calendar`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(p.id) }} />
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
