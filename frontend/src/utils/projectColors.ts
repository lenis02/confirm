const STORAGE_KEY = 'confirm_project_colors';

export const PROJECT_PALETTE = [
  '#f97316', // 주황
  '#3b82f6', // 파랑
  '#22c55e', // 초록
  '#a855f7', // 보라
  '#ec4899', // 핑크
  '#ef4444', // 빨강
  '#eab308', // 노랑
  '#14b8a6', // 청록
  '#6366f1', // 남색
  '#64748b', // 회색
];

export function getProjectColor(projectId: string): string {
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return map[projectId] ?? '#94a3b8';
  } catch {
    return '#94a3b8';
  }
}

export function setProjectColor(projectId: string, color: string): void {
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    map[projectId] = color;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}
