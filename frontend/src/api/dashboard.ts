import client from './client';
import type { CalendarWeek } from '../types';

export const dashboardApi = {
  getCalendar: (week?: string) =>
    client.get<CalendarWeek>('/dashboard/calendar', { params: week ? { week } : {} }).then(r => r.data),
};
