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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => moveWeek(-1)} className="px-3 py-1 border rounded hover:bg-gray-50">‹</button>
        <h2 className="text-lg font-semibold">
          {weekDates[0].toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} &nbsp;
          {fmt(weekDates[0])} ~ {fmt(weekDates[6])}
        </h2>
        <button onClick={() => moveWeek(1)} className="px-3 py-1 border rounded hover:bg-gray-50">›</button>
        <button onClick={() => setBaseDate(new Date())} className="ml-auto text-sm text-blue-600 hover:underline">오늘</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
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
              <div key={i} className="min-h-40 bg-white border rounded-lg p-2">
                <div className={`text-xs font-semibold mb-2 ${i >= 5 ? 'text-red-400' : 'text-gray-500'}`}>
                  {DAYS[i]} {fmt(date)}
                </div>
                {meetings.map(m => (
                  <div key={m.id} className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 mb-1 truncate">
                    {MEETING_TYPE_LABEL[m.type]} · {m.title}
                  </div>
                ))}
                {actions.map(a => (
                  <div key={a.id} className="text-xs bg-orange-50 text-orange-600 rounded px-2 py-1 mb-1 truncate">
                    ✓ {a.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
