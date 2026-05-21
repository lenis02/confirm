import client from './client';
import type { Meeting, ChecklistItem, MeetingBriefing, MeetingMetrics } from '../types';

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
    client.get<ChecklistItem[]>(`/meetings/${meetingId}/checklists`).then(r => r.data),

  updateChecklists: (meetingId: string, items: Array<{ id?: string; content: string; isDone?: boolean; order?: number }>) =>
    client.patch<ChecklistItem[]>(`/meetings/${meetingId}/checklists`, { items }).then(r => r.data),

  getBriefing: (meetingId: string) =>
    client.get<MeetingBriefing>(`/meetings/${meetingId}/briefing`).then(r => r.data),

  uploadStt: (meetingId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/meetings/${meetingId}/stt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  getTranscript: (meetingId: string) =>
    client.get<{ transcriptText: string; sttStatus: string }>(`/meetings/${meetingId}/transcript`).then(r => r.data),

  complete: (meetingId: string) =>
    client.post<Meeting>(`/meetings/${meetingId}/completion`).then(r => r.data),

  getMetrics: (meetingId: string) =>
    client.get<MeetingMetrics>(`/meetings/${meetingId}/metrics`).then(r => r.data),
};
