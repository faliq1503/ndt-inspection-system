/**
 * services/authService.ts
 *
 * Login ke backend (POST /auth/login). Token JWT dan data user
 * disimpan di localStorage; token dikirim otomatis oleh services/api.ts.
 */

import { TOKEN_KEY, USER_KEY, apiPost } from './api';
import type { AuthUser } from '../types/index';

export interface LoginPayload {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const username = payload.username.trim();
    if (!username || !payload.password) {
      throw new Error('Username dan password wajib diisi.');
    }
    // Buang token lama supaya kegagalan login tidak dianggap sesi berakhir
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    const res = await apiPost<LoginResponse>('/auth/login', {
      username,
      password: payload.password,
    });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw || !localStorage.getItem(TOKEN_KEY)) return null;
      const user = JSON.parse(raw) as AuthUser;
      // Sesi placeholder lama (tanpa role) dianggap tidak valid
      return user.role ? user : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};