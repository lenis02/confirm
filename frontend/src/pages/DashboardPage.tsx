import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { getProjectColor } from '../utils/projectColors';
import type { DashboardProject } from '../types';

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};
const MEETING_STATUS_CLS: Record<string, string> = {
  SCHEDULED: 'bg-gray-50 text-gray-500',
  IN_PROGRESS: 'bg-orange-50 text-orange-600',
  COMPLETED: 'bg-green-50 text-green-600',
};
const MEETING_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '예정', IN_PROGRESS: '진행 중', COMPLETED: '완료',
};

// 차트 범위 계산 유틸
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

export default function DashboardPage() {
  const now = new Date();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getOverview(now.getFullYear(), now.getMonth())
      .then(d => setProjects(d.projects))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const datedProjects   = projects.filter(p => p.startDate && p.endDate);
  const undatedProjects = projects.filter(p => !p.startDate || !p.endDate);

  const { start: chartStart, end: chartEnd } = calcChartRange(projects);
  const totalMs  = chartEnd.getTime() - chartStart.getTime();
  const pct      = (d: Date | string) => toPct(d, chartStart, totalMs);
  const months   = genMonthMarkers(chartStart, chartEnd, totalMs);
  const todayPct = pct(now);

  const allMeetings = projects
    .flatMap(p => p.meetings.map(m => ({ ...m, projectId: p.id, projectName: p.name })))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-800">전체 대시보드</h2>
        <span className="text-xs text-gray-400">{now.getFullYear()}년 {now.getMonth() + 1}월 기준</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-sm mb-1">프로젝트가 없습니다</p>
          <p className="text-xs">좌측 사이드바에서 프로젝트를 생성해보세요</p>
        </div>
      ) : (
        <>
          {/* ── 프로젝트 요약 카드 ── */}
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
            {projects.map(p => {
              const color = getProjectColor(p.id);
              return (
                <Link key={p.id} to={`/projects/${p.id}/calendar`}
                  className="shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition w-44">
                  <div className="h-1" style={{ backgroundColor: color }} />
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-gray-400">{p.startDate ?? '시작일 미정'}</p>
                    <p className="text-[10px] text-gray-400">~ {p.endDate ?? '종료일 미정'}</p>
                    {p.meetings.length > 0 && (
                      <p className="text-[10px] text-orange-500 mt-1.5 font-medium">
                        이번 달 회의 {p.meetings.length}건
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── 간트 차트 ── */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">프로젝트 타임라인</h3>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />TODAY
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 rounded-full bg-gray-300 inline-block" />회의
                </span>
              </div>
            </div>

            {datedProjects.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                날짜가 설정된 프로젝트가 없습니다. 프로젝트에 시작일과 종료일을 설정해주세요.
              </div>
            ) : (
              <div className="flex">
                {/* 프로젝트명 열 */}
                <div className="w-36 shrink-0 border-r border-gray-100 bg-gray-50/30">
                  <div className="h-8 border-b border-gray-100" />
                  {datedProjects.map(p => (
                    <div key={p.id} className="h-11 border-b border-gray-50 last:border-b-0 flex items-center px-3">
                      <Link to={`/projects/${p.id}/calendar`} className="flex items-center gap-1.5 min-w-0 group">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(p.id) }} />
                        <span className="text-xs text-gray-700 truncate group-hover:text-orange-600 transition">{p.name}</span>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* 타임라인 영역 */}
                <div className="flex-1 min-w-0 relative overflow-x-auto">
                  {/* 월 헤더 */}
                  <div className="relative h-8 border-b border-gray-100 bg-gray-50/50 select-none">
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full flex flex-col" style={{ left: `${m.pct}%` }}>
                        <div className="w-px h-full bg-gray-200" />
                        <span className="absolute top-1.5 left-1 text-[10px] text-gray-400 whitespace-nowrap">{m.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 프로젝트 바 */}
                  {datedProjects.map(p => {
                    const color     = getProjectColor(p.id);
                    const leftPct   = pct(p.startDate!);
                    const widthPct  = Math.max(pct(p.endDate!) - leftPct, 0.5);

                    return (
                      <div key={p.id} className="relative h-11 border-b border-gray-50 last:border-b-0">
                        {/* 그리드 라인 */}
                        {months.map((m, i) => (
                          <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${m.pct}%` }} />
                        ))}

                        {/* 오늘 선 */}
                        <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${todayPct}%`, backgroundColor: '#fb923c80' }} />

                        {/* 프로젝트 바 */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-full"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            height: '18px',
                            backgroundColor: color + '28',
                            border: `1.5px solid ${color}60`,
                          }}
                        />

                        {/* 회의 마커 */}
                        {p.meetings.map(m => (
                          <div
                            key={m.id}
                            title={`${MEETING_TYPE_LABEL[m.type] ?? m.type}: ${m.title}`}
                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-20 cursor-pointer hover:scale-150 transition-transform ring-2 ring-white"
                            style={{ left: `calc(${pct(m.scheduledAt)}% - 5px)`, backgroundColor: color }}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {/* TODAY 레이블 */}
                  <div className="absolute bottom-0 pb-0.5 text-[9px] font-semibold text-orange-400"
                    style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}>
                    TODAY
                  </div>
                </div>
              </div>
            )}

            {/* 날짜 미설정 */}
            {undatedProjects.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-gray-400 shrink-0">날짜 미설정:</span>
                {undatedProjects.map(p => (
                  <Link key={p.id} to={`/projects/${p.id}/calendar`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getProjectColor(p.id) }} />
                    {p.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── 이번 달 주요 회의 ── */}
          {allMeetings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">이번 달 주요 회의</h3>
              <div className="space-y-1.5">
                {allMeetings.map(m => {
                  const color = getProjectColor(m.projectId);
                  return (
                    <div key={m.id}
                      className="bg-white border border-gray-200 rounded px-3 py-2.5 flex items-center gap-3"
                      style={{ borderLeft: `3px solid ${color}` }}>
                      <span className="text-xs font-medium text-gray-500 w-14 shrink-0">
                        {new Date(m.scheduledAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                        {MEETING_TYPE_LABEL[m.type] ?? m.type}
                      </span>
                      <span className="text-sm text-gray-800 flex-1 truncate">{m.title}</span>
                      <span className="text-xs text-gray-400 shrink-0 truncate max-w-28">{m.projectName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${MEETING_STATUS_CLS[m.status] ?? ''}`}>
                        {MEETING_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
