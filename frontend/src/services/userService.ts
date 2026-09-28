/**
 * services/userService.ts
 *
 * Endpoint manajemen user (backend: khusus admin).
 */

import { apiGet, apiPost, apiPut } from './api';
import type { AuthUser, ManagedUser, UserRole } from '../types/index';

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
}

export const userService = {
  list(): Promise<ManagedUser[]> {
    return apiGet<ManagedUser[]>('/users');
  },

  create(payload: CreateUserPayload): Promise<AuthUser> {
    return apiPost<AuthUser>('/users', payload);
  },

  setActive(userId: number, aktif: boolean): Promise<AuthUser> {
    return apiPut<AuthUser>(`/users/${userId}/active`, { aktif });
  },

  resetPassword(userId: number, password: string): Promise<{ id: number; detail: string }> {
    return apiPut<{ id: number; detail: string }>(`/users/${userId}/password`, { password });
  },
};