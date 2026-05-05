import client from './client';
import type { Meeting } from '../types';

export const meetingsApi = {
  list: (projectId: string, status?: string) =>
    client.get<Meeting[]>(`/projects/${projectId}/meetings`, { params: status ? { status } : {} }).then(r => r.data),

  create: (projectId: string, data: { title: string; type: string; scheduledAt: string }) =>
    client.post<Meeting>(`/projects/${projectId}/meetings`, data).then(r => r.data),

  get: (meetingId: string) =>
    client.get<Meeting>(`/meetings/${meetingId}`).then(r => r.data),

  update: (meetingId: string, data: { title?: string; scheduledAt?: string }) =>
    client.patch<Meeting>(`/meetings/${meetingId}`, data).then(r => r.data),

  delete: (meetingId: string) =>
    client.delete(`/meetings/${meetingId}`),

  getChecklists: (meetingId: string) =>
    client.get(`/meetings/${meetingId}/checklists`).then(r => r.data),

  complete: (meetingId: string) =>
    client.post<Meeting>(`/meetings/${meetingId}/completion`).then(r => r.data),

  getMetrics: (meetingId: string) =>
    client.get(`/meetings/${meetingId}/metrics`).then(r => r.data),
};
