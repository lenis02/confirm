import client from './client';
import type { CalendarWeek, DashboardOverview } from '../types';

export const dashboardApi = {
  getCalendar: (week?: string) =>
    client.get<CalendarWeek>('/dashboard/calendar', { params: week ? { week } : {} }).then(r => r.data),

  getOverview: (year: number, month: number) =>
    client.get<DashboardOverview>('/dashboard/overview', { params: { year, month } }).then(r => r.data),
};
