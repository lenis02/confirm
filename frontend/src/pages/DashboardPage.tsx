import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import type { CalendarWeek } from '../types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MEETING_TYPE_LABEL: Record<string, string> = {
  KICKOFF: '킥오프', PROGRESS_CHECK: '진도점검', ISSUE_CHECK: '이슈체크', CONSENSUS: '합의',
};

function getWeekDates(baseDate: Date) {
  const day = baseDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + diff + i);
    return d;
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<CalendarWeek | null>(null);
  const [baseDate, setBaseDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(baseDate);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    dashboardApi.getCalendar(baseDate.toISOString().split('T')[0])
      .then(setData)
      .finally(() => setLoading(false));
  }, [baseDate]);

  const moveWeek = (dir: number) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dir * 7);
    setBaseDate(d);
  };

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-base font-semibold text-gray-800 mr-1">
          {weekDates[0].toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}&nbsp;
          {fmt(weekDates[0])} – {fmt(weekDates[6])}
        </h2>
        <button
          onClick={() => moveWeek(-1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer"
        >‹</button>
        <button
          onClick={() => moveWeek(1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-100 transition cursor-pointer"
        >›</button>
        <button
          onClick={() => setBaseDate(new Date())}
          className="ml-auto text-xs border border-gray-300 px-2.5 py-1 rounded text-gray-600 hover:bg-gray-100 transition cursor-pointer"
        >오늘</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              return (
                <div
                  key={`h-${i}`}
                  className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-gray-200 ${i >= 5 ? 'text-red-400 bg-red-50/40' : 'text-gray-500 bg-gray-50'}`}
                >
                  <span>{DAYS[i]}</span>
                  <span className={`ml-1 ${isToday ? 'bg-orange-500 text-white px-1 rounded' : ''}`}>
                    {fmt(date)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const meetings = data?.projects.flatMap(p =>
                p.meetings
                  .filter(m => m.scheduledAt.startsWith(dateStr))
                  .map(m => ({ ...m, projectName: p.name }))
              ) ?? [];
              const actions = data?.projects.flatMap(p =>
                p.actionItems
                  .filter(a => a.dueDate === dateStr)
                  .map(a => ({ ...a, projectName: p.name }))
              ) ?? [];

              return (
                <div
                  key={i}
                  className={`min-h-36 p-2 border-r last:border-r-0 border-gray-100 ${i >= 5 ? 'bg-gray-50/50' : ''} ${isToday ? 'bg-orange-50/30' : ''}`}
                >
                  {meetings.map(m => (
                    <div key={m.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 mb-1 truncate rounded-sm">
                      {MEETING_TYPE_LABEL[m.type]} · {m.title}
                    </div>
                  ))}
                  {actions.map(a => (
                    <div key={a.id} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 mb-1 truncate rounded-sm">
                      · {a.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
