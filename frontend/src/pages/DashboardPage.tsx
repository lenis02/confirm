import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import type { CalendarWeek, Meeting, ActionItem } from '../types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};

type DayEvent =
  | { kind: 'meeting'; id: string; title: string; type: string; status: string; projectName: string }
  | { kind: 'action'; id: string; title: string; status: string; projectName: string };

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
        (map[date] ??= []).push({ kind: 'meeting', id: m.id, title: m.title, type: m.type, status: m.status, projectName: p.name });
      }
      for (const a of p.actionItems) {
        if (seenActions.has(a.id)) continue;
        seenActions.add(a.id);
        (map[a.dueDate] ??= []).push({ kind: 'action', id: a.id, title: a.title, status: a.status, projectName: p.name });
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

  useEffect(() => {
    setLoading(true);
    const grid = getMonthGrid(year, month);
    const mondayStrs = Array.from({ length: 6 }, (_, i) =>
      grid[i * 7].toISOString().split('T')[0]
    );
    Promise.all(mondayStrs.map(w => dashboardApi.getCalendar(w)))
      .then(weeks => setEventMap(buildEventMap(weeks)))
      .finally(() => setLoading(false));
  }, [year, month]);

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

  return (
    <div className="p-6 flex flex-col gap-4 h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-800 mr-1">{monthLabel}</h2>
        <button
          onClick={() => moveMonth(-1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer"
        >‹</button>
        <button
          onClick={() => moveMonth(1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer"
        >›</button>
        <button
          onClick={goToday}
          className="ml-auto text-xs border border-gray-300 px-2.5 py-1 rounded text-gray-600 hover:bg-gray-100 transition cursor-pointer"
        >오늘</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden flex-1">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-medium border-r last:border-r-0 border-gray-200 ${i >= 5 ? 'text-red-400 bg-red-50/40' : 'text-gray-500 bg-gray-50'}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 (6주) */}
          <div className="grid grid-cols-7" style={{ gridTemplateRows: 'repeat(6, minmax(0, 1fr))' }}>
            {grid.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === todayStr;
              const isCurrentMonth = date.getMonth() === month;
              const isWeekend = i % 7 >= 5;
              const events = eventMap[dateStr] ?? [];
              const row = Math.floor(i / 7);

              return (
                <div
                  key={i}
                  className={[
                    'min-h-24 p-1.5 border-r border-b last:border-r-0 border-gray-100 overflow-hidden',
                    row === 5 ? 'border-b-0' : '',
                    isWeekend ? 'bg-gray-50/50' : '',
                    isToday ? 'bg-orange-50/40' : '',
                    !isCurrentMonth ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <div className="mb-1 flex justify-end">
                    <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : isWeekend ? 'text-red-400' : 'text-gray-500'}`}>
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((ev, j) =>
                      ev.kind === 'meeting' ? (
                        <button
                          key={j}
                          onClick={() => navigate(`/meetings/${ev.id}`)}
                          className="w-full text-left text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 truncate rounded-sm hover:bg-orange-100 transition cursor-pointer block"
                          title={`${ev.projectName} · ${ev.title}`}
                        >
                          {MEETING_TYPE_LABEL[ev.type]} {ev.title}
                        </button>
                      ) : (
                        <div
                          key={j}
                          className={`text-xs px-1.5 py-0.5 truncate rounded-sm border ${ev.status === 'COMPLETED' ? 'bg-gray-50 text-gray-400 border-gray-200 line-through' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                          title={`${ev.projectName} · ${ev.title}`}
                        >
                          · {ev.title}
                        </div>
                      )
                    )}
                    {events.length > 3 && (
                      <div className="text-xs text-gray-400 px-1.5">+{events.length - 3}개</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
