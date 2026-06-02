import client from './client';
import type { Meeting, MeetingChecklist, MeetingMetrics, MeetingBriefing } from '../types';

export const meetingsApi = {
  list: (projectId: string, status?: string) =>
    client.get<Meeting[]>(`/projects/${projectId}/meetings`, { params: status ? { status } : {} }).then(r => r.data),

  create: (projectId: string, data: { title: string; type: string; scheduledAt: string; departments?: string[] }) =>
    client.post<Meeting>(`/projects/${projectId}/meetings`, data).then(r => r.data),

  get: (meetingId: string) =>
    client.get<Meeting>(`/meetings/${meetingId}`).then(r => r.data),

  update: (meetingId: string, data: { title?: string; scheduledAt?: string }) =>
    client.patch<Meeting>(`/meetings/${meetingId}`, data).then(r => r.data),

  delete: (meetingId: string) =>
    client.delete(`/meetings/${meetingId}`),

  getChecklists: (meetingId: string) =>
    client.get<MeetingChecklist[]>(`/meetings/${meetingId}/checklists`).then(r => r.data),

  updateChecklists: (meetingId: string, items: { id?: string; content: string; isDone?: boolean; order?: number }[]) =>
    client.patch<MeetingChecklist[]>(`/meetings/${meetingId}/checklists`, {
      // 백엔드 DTO 화이트리스트 필드만 전송 (엔티티 여분 필드 meetingId/createdAt 등은 forbidNonWhitelisted로 400 유발)
      items: items.map((i, idx) => ({
        ...(i.id ? { id: i.id } : {}), // 빈 id는 생략 (신규 항목 @IsUUID 통과)
        content: i.content,
        isDone: i.isDone ?? false,
        order: i.order ?? idx,
      })),
    }).then(r => r.data),

  getBriefing: (meetingId: string) =>
    client.get<MeetingBriefing>(`/meetings/${meetingId}/briefing`).then(r => r.data),

  uploadMinutes: (meetingId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<Meeting>(`/meetings/${meetingId}/minutes`, form).then(r => r.data);
  },

  downloadMinutes: (meetingId: string) =>
    client.get<Blob>(`/meetings/${meetingId}/minutes`, { responseType: 'blob' }).then(r => r.data),

  complete: (meetingId: string) =>
    client.post<Meeting>(`/meetings/${meetingId}/completion`).then(r => r.data),

  reopen: (meetingId: string) =>
    client.post<Meeting>(`/meetings/${meetingId}/reopen`).then(r => r.data),

  getMetrics: (meetingId: string) =>
    client.get<MeetingMetrics>(`/meetings/${meetingId}/metrics`).then(r => r.data),
};
