/**
 * services/authService.ts
 *
 * PLACEHOLDER — backend NDT saat ini BELUM memiliki endpoint
 * login/auth (hasil audit Prompt 1: tidak ada tabel user/token).
 *
 * Struktur ini siap diintegrasikan: saat POST /login tersedia,
 * cukup ganti isi login() tanpa mengubah UI/store.
 */

import type { AuthUser } from '../types/index';

const TOKEN_KEY = 'ndt_auth_token';
const USER_KEY = 'ndt_auth_user';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authService = {
  /**
   * TODO(backend): ganti dengan `apiPost<{token,user}>('/login', payload)`.
   * Sementara menerima username+password non-kosong agar alur UI
   * (login -> protected route -> logout) dapat diverifikasi.
   */
  async login(payload: LoginPayload): Promise<AuthUser> {
    const username = payload.username.trim();
    if (!username || !payload.password) {
      throw new Error('Username atau password tidak valid.');
    }
    const user: AuthUser = { username };
    localStorage.setItem(TOKEN_KEY, `local-placeholder:${username}`);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw || !localStorage.getItem(TOKEN_KEY)) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
