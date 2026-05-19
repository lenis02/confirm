import client from './client';
import type { User } from '../types';

export const usersApi = {
  getMe: () =>
    client.get<User>('/users/me').then(r => r.data),

  updateMe: (data: { name?: string; jobTitle?: string }) =>
    client.patch<User>('/users/me', data).then(r => r.data),
};
