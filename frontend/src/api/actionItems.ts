import client from './client';
import type { ActionItem } from '../types';

export const actionItemsApi = {
  list: (projectId: string, status?: string) =>
    client.get<ActionItem[]>(`/projects/${projectId}/action-items`, {
      params: status ? { status } : {},
    }).then(r => r.data),

  create: (projectId: string, data: { title: string; assigneeId: string; dueDate: string }) =>
    client.post<ActionItem>(`/projects/${projectId}/action-items`, data).then(r => r.data),

  toggle: (itemId: string) =>
    client.patch<ActionItem>(`/action-items/${itemId}`).then(r => r.data),
};
