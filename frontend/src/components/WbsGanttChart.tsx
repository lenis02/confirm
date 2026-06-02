import type { WbsItem } from '../types';

export type BarColor = { bg: string; text: string; border: string };

export const ROLE_BAR_PALETTE: BarColor[] = [
  { bg: '#FECACA', text: '#991B1B', border: '#F87171' }, // 🔴 red
  { bg: '#FDE68A', text: '#92400E', border: '#FBBF24' }, // 🟡 amber
  { bg: '#A7F3D0', text: '#065F46', border: '#34D399' }, // 🟢 emerald
  { bg: '#BAE6FD', text: '#075985', border: '#38BDF8' }, // 🔵 sky
  { bg: '#DDD6FE', text: '#5B21B6', border: '#A78BFA' }, // 🟣 violet
  { bg: '#FBCFE8', text: '#9D174D', border: '#F472B6' }, // 🌸 pink
];

export const FALLBACK_BAR_COLOR: BarColor = { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF' };

export default function WbsGanttChart({
  items,
  onItemClick,
}: {
  items: WbsItem[];
  onItemClick?: (item: WbsItem) => void;
}) {
  const DAY_MS = 86_400_000;
  const PX_PER_DAY = 10;
  const ROW_HEIGHT = 32;
  const NAME_WIDTH = 220;

  const validItems = items.filter(i => i.startDate && i.endDate);
  const omitted = items.length - validItems.length;

  if (validItems.length === 0) {
    return (
      <div className="border border-gray-200 rounded p-8 text-center text-sm text-gray-400">
        일정이 있는 태스크가 없어 차트를 표시할 수 없습니다
      </div>
    );
  }

  const sorted = [...validItems].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const uniqueRoles = Array.from(new Set(sorted.map(i => i.assignedRole).filter((r): r is string => !!r)));
  const roleColorMap = new Map<string, BarColor>();
  uniqueRoles.forEach((role, i) => {
    roleColorMap.set(role, ROLE_BAR_PALETTE[i % ROLE_BAR_PALETTE.length]);
  });
  const getRoleColor = (role?: string | null): BarColor =>
    (role && roleColorMap.get(role)) || FALLBACK_BAR_COLOR;
  const startTimes = sorted.map(i => new Date(i.startDate!).getTime());
  const endTimes = sorted.map(i => new Date(i.endDate!).getTime());
  const minTime = Math.min(...startTimes);
  const maxTime = Math.max(...endTimes);
  const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / DAY_MS) + 1);
  const chartWidth = totalDays * PX_PER_DAY;

  const tickStart = new Date(minTime);
  tickStart.setDate(1);
  const monthTicks: { left: number; label: string }[] = [];
  for (const cursor = new Date(tickStart); cursor.getTime() <= maxTime; cursor.setMonth(cursor.getMonth() + 1)) {
    const offsetDays = (cursor.getTime() - minTime) / DAY_MS;
    monthTicks.push({
      left: Math.max(0, offsetDays * PX_PER_DAY),
      label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  return (
    <div className="border border-gray-200 rounded">
      {(omitted > 0 || uniqueRoles.length > 0) && (
        <div className="flex items-center justify-between gap-4 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            {omitted > 0 ? `일정 미정 ${omitted}건은 차트에서 제외되었습니다` : ''}
          </p>
          {uniqueRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-end">
              {uniqueRoles.map(role => {
                const c = getRoleColor(role);
                return (
                  <div key={role} className="flex items-center gap-1.5 text-xs">
                    <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: c.bg, borderColor: c.border }} />
                    <span className="text-gray-600">{role}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <div style={{ width: NAME_WIDTH + chartWidth }}>
          <div className="flex border-b border-gray-200 bg-gray-50" style={{ height: 28 }}>
            <div style={{ width: NAME_WIDTH }} className="flex items-center px-3 text-xs font-medium text-gray-500 border-r border-gray-200">
              태스크
            </div>
            <div className="relative" style={{ width: chartWidth }}>
              {monthTicks.map((t, i) => (
                <div key={i} className="absolute top-0 bottom-0 flex items-center pl-1 text-xs text-gray-500 border-l border-gray-200" style={{ left: t.left }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
          {sorted.map(item => {
            const startTime = new Date(item.startDate!).getTime();
            const endTime = new Date(item.endDate!).getTime();
            const left = ((startTime - minTime) / DAY_MS) * PX_PER_DAY;
            const width = Math.max(PX_PER_DAY, ((endTime - startTime) / DAY_MS + 1) * PX_PER_DAY);
            const barColor = getRoleColor(item.assignedRole);
            return (
              <div key={item.id} className="flex border-b border-gray-100 hover:bg-gray-50/60" style={{ height: ROW_HEIGHT }}>
                <div style={{ width: NAME_WIDTH }} className="flex items-center px-3 text-xs border-r border-gray-200 overflow-hidden">
                  <span className="text-gray-400 font-mono mr-2 shrink-0">{item.taskId ?? `T${String(item.order).padStart(2, '0')}`}</span>
                  <span className="text-gray-700 truncate">{item.title}</span>
                </div>
                <div className="relative" style={{ width: chartWidth }}>
                  {monthTicks.map((t, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: t.left }} />
                  ))}
                  {item.isDecisionPoint ? (
                    <button onClick={() => onItemClick?.(item)}
                      className="absolute cursor-pointer hover:opacity-80 transition"
                      style={{ left: left - 8, top: ROW_HEIGHT / 2 - 8, width: 16, height: 16 }}
                      title={item.title}>
                      <svg viewBox="0 0 16 16" className="w-full h-full">
                        <polygon points="8,1 15,8 8,15 1,8" className="fill-brand-500" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={() => onItemClick?.(item)}
                      className="absolute border rounded px-1.5 text-xs truncate hover:shadow transition cursor-pointer text-left"
                      style={{ left, width, top: ROW_HEIGHT / 2 - 10, height: 20, lineHeight: '18px', backgroundColor: barColor.bg, color: barColor.text, borderColor: barColor.border }}
                      title={item.title}>
                      {item.title}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
