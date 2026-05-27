import client from './client';
import type { Project, ProjectMember, Document, ProjectWbs, WbsItem } from '../types';

export const projectsApi = {
  list: (status?: string) =>
    client.get<Project[]>('/projects', { params: status ? { status } : {} }).then(r => r.data),

  create: (data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
    client.post<Project>('/projects', data).then(r => r.data),

  get: (id: string) =>
    client.get<Project>(`/projects/${id}`).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; description: string; startDate: string; endDate: string; status: string }>) =>
    client.patch<Project>(`/projects/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    client.delete(`/projects/${id}`),

  // members
  getMembers: (projectId: string) =>
    client.get<ProjectMember[]>(`/projects/${projectId}/members`).then(r => r.data),

  addMember: (projectId: string, data: { userId: string; role: string }) =>
    client.post<ProjectMember>(`/projects/${projectId}/members`, data).then(r => r.data),

  updateMember: (projectId: string, memberId: string, data: { role: string }) =>
    client.patch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, data).then(r => r.data),

  removeMember: (projectId: string, memberId: string) =>
    client.delete(`/projects/${projectId}/members/${memberId}`),

  // documents
  uploadDocument: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.post<Document>(`/projects/${projectId}/documents`, form).then(r => r.data);
  },

  listDocuments: (projectId: string) =>
    client.get<Document[]>(`/projects/${projectId}/documents`).then(r => r.data),

  getDocument: (projectId: string, documentId: string) =>
    client.get<Document>(`/projects/${projectId}/documents/${documentId}`).then(r => r.data),

  deleteDocument: (projectId: string, documentId: string) =>
    client.delete(`/projects/${projectId}/documents/${documentId}`),

  // wbs
  getWbs: (projectId: string) =>
    client.get<ProjectWbs>(`/projects/${projectId}/wbs`).then(r => r.data),

  confirmWbs: (projectId: string) =>
    client.patch<ProjectWbs>(`/projects/${projectId}/wbs`).then(r => r.data),

  updateWbsItem: (projectId: string, milestoneId: string, data: Partial<WbsItem>) =>
    client.patch<WbsItem>(`/projects/${projectId}/wbs/${milestoneId}`, data).then(r => r.data),

  deleteWbsItem: (projectId: string, itemId: string) =>
    client.delete(`/projects/${projectId}/wbs/${itemId}`),

  deleteWbs: (projectId: string) =>
    client.delete(`/projects/${projectId}/wbs`),

  getMeetingRecommendations: (projectId: string) =>
    client.get(`/projects/${projectId}/meeting-recommendations`).then(r => r.data),
};
