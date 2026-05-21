import client from './client';

export const agentApi = {
  chat: (message: string, projectId?: string) =>
    client.post<{ reply: string }>('/agent/chat', { message, ...(projectId && { projectId }) }).then(r => r.data),
};
