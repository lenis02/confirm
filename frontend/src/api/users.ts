import client from './client';
import type { User, UserIntegration } from '../types';

export const usersApi = {
  getMe: () =>
    client.get<User>('/users/me').then(r => r.data),

  updateMe: (data: { name?: string; jobTitle?: string }) =>
    client.patch<User>('/users/me', data).then(r => r.data),

  getIntegrations: () =>
    client.get<UserIntegration[]>('/users/integrations').then(r => r.data),

  addIntegration: (data: { serviceType: string; accessToken: string }) =>
    client.post<UserIntegration>('/users/integrations', data).then(r => r.data),

  removeIntegration: (integrationId: string) =>
    client.delete(`/users/integrations/${integrationId}`),
};
