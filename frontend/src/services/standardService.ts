/**
 * services/standardService.ts
 *
 * Endpoint standard. GET boleh semua user login; POST dan PUT khusus admin
 * (dijaga di backend).
 */

import { apiDelete, apiGet, apiPost, apiPut } from './api';
import type { Standard } from '../types/index';

export type StandardPayload = Omit<Standard, 'id'>;

export const standardService = {
  list(): Promise<Standard[]> {
    return apiGet<Standard[]>('/standards');
  },

  create(payload: StandardPayload): Promise<Standard> {
    return apiPost<Standard>('/standards', payload);
  },

  update(standardId: number, payload: StandardPayload): Promise<Standard> {
    return apiPut<Standard>(`/standards/${standardId}`, payload);
  },

  remove(standardId: number): Promise<{ id: number; detail: string }> {
    return apiDelete<{ id: number; detail: string }>(`/standards/${standardId}`);
  },
};