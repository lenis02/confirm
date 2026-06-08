import { useState } from 'react';
import { ROLE_BAR_PALETTE, FALLBACK_BAR_COLOR, type BarColor } from './WbsGanttChart';
import type { WbsItem, Meeting } from '../types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프',
  PROGRESS_CHECK: '진도점검',
  ISSUE_CHECK: '이슈체크',
  CONSENSUS: '합의',
};

const MAX_LANES = 4;
const BAR_H = 18;
const BAR_GAP = 3;
const DATE_ROW_H = 30;
const DECISION_COLOR: BarColor = { bg: '#EDE9FE', text: '#5B21B6', border: '#A78BFA' };
const DAY_MS = 86_400_000;

type CalMeeting = Pick<Meeting, 'id' | 'title' | 'type' | 'scheduledAt' | 'departments'>;

type LaidBar = {
  key: string;
  title: string;
  isDecisionPoint: boolean;
  color: BarColor;
  segStartCol: number;
  span: number;
  lane: number;
};

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

function midnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function parseYmd(s: string) {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function layoutWeek(weekStart: Date, items: WbsItem[], colorOf: (t: WbsItem) => BarColor) {
  const weekStartT = midnight(weekStart);
  const weekEndT = weekStartT + 6 * DAY_MS;
  const inWeek = items
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
      key: x.t.id,
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

export default function WbsCalendar({
  items,
  meetings = [],
  onItemClick,
  onMeetingClick,
}: {
  items: WbsItem[];
  meetings?: CalMeeting[];
  onItemClick?: (item: WbsItem) => void;
  onMeetingClick?: (meetingId: string) => void;
}) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [{ year, month }, setYm] = useState(() => {
    const dated = items.map(i => i.startDate).filter((s): s is string => !!s).sort();
    const base = dated.length ? new Date(parseYmd(dated[0])) : today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const moveMonth = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYm({ year: d.getFullYear(), month: d.getMonth() });
  };

  const grid = getMonthGrid(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const roles = Array.from(new Set(items.map(t => t.assignedRole).filter((r): r is string => !!r)));
  const roleColor = new Map<string, BarColor>();
  roles.forEach((r, i) => roleColor.set(r, ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length]));
  const colorOf = (t: WbsItem): BarColor =>
    t.isDecisionPoint ? DECISION_COLOR : (t.assignedRole && roleColor.get(t.assignedRole)) || FALLBACK_BAR_COLOR;

  const meetingsByDate: Record<string, CalMeeting[]> = {};
  for (const m of meetings) {
    const date = m.scheduledAt.split('T')[0];
    (meetingsByDate[date] ??= []).push(m);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-works-border flex items-center gap-2">
        <h2 className="text-base font-semibold text-works-text mr-1">{monthLabel}</h2>
        <button onClick={() => moveMonth(-1)} className="btn-secondary !px-2.5 !py-1.5 text-lg leading-none">‹</button>
        <button onClick={() => moveMonth(1)} className="btn-secondary !px-2.5 !py-1.5 text-lg leading-none">›</button>
        <button
          onClick={() => setYm({ year: today.getFullYear(), month: today.getMonth() })}
          className="ml-auto btn-ghost !py-1.5 !px-3 text-xs"
        >
          오늘
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-works-border bg-works-bg/50">
        {DAYS.map((day, i) => (
          <div key={day} className={`py-2.5 text-center text-xs font-semibold ${i >= 5 ? 'text-red-400' : 'text-works-muted'}`}>
            {day}
          </div>
        ))}
      </div>

      {[0, 1, 2, 3, 4, 5].map(w => {
        const weekDays = grid.slice(w * 7, w * 7 + 7);
        const { bars, laneCount, overflow } = layoutWeek(weekDays[0], items, colorOf);
        const bandH = laneCount * (BAR_H + BAR_GAP);

        return (
          <div key={w} className="relative">
            <div className="grid grid-cols-7">
              {weekDays.map((date, di) => {
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const isCurrentMonth = date.getMonth() === month;
                const isWeekend = di >= 5;
                const dayMeetings = meetingsByDate[dateStr] ?? [];

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
                    style={{ minHeight: DATE_ROW_H + bandH + 40 }}
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
                      {dayMeetings.slice(0, 2).map(m => {
                        const deptColors = (m.departments ?? [])
                          .map(d => roleColor.get(d))
                          .filter((c): c is BarColor => !!c);
                        return (
                          <button
                            key={m.id}
                            onClick={() => onMeetingClick?.(m.id)}
                            className="w-full flex items-center gap-1 text-left text-[11px] px-1.5 py-0.5 rounded-md border bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE] hover:opacity-80 transition cursor-pointer"
                            title={m.departments?.length ? `[${m.departments.join(', ')}] ${m.title}` : m.title}
                          >
                            {deptColors.length > 0 && (
                              <span className="flex items-center gap-0.5 shrink-0">
                                {deptColors.map((c, di) => (
                                  <span key={di} className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                                ))}
                              </span>
                            )}
                            <span className="truncate">{MEETING_TYPE_LABEL[m.type]} {m.title}</span>
                          </button>
                        );
                      })}
                      {dayMeetings.length > 2 && (
                        <div className="text-[10px] text-works-subtle px-1">+{dayMeetings.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WBS 태스크 기간 막대 */}
            {bars.map(b => (
              <button
                key={b.key}
                onClick={() => {
                  const item = items.find(i => i.id === b.key);
                  if (item) onItemClick?.(item);
                }}
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
                title={b.title}
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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />WBS 태스크 (부서별 색상)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-200 border border-violet-300" />◆ 의사결정 마일스톤</span>
      </div>
    </div>
  );
}
