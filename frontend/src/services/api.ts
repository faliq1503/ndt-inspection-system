/**
 * services/api.ts
 *
 * Lapisan HTTP terpusat. Seluruh pemanggilan backend lewat sini,
 * UI tidak boleh hardcode fetch ke URL di dalam component/page.
 */

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export const TOKEN_KEY = 'ndt_auth_token';
export const USER_KEY = 'ndt_auth_user';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      // Sesi berakhir atau tidak valid: bersihkan dan kembali ke halaman login
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login';
    }
    let detail = `Request gagal (status ${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* abaikan, pakai pesan default */
    }
    throw new ApiError(res.status, detail);
  }
  // 204 / body kosong
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/** Unduh file dari endpoint yang butuh login (link <a href> biasa tidak bisa kirim token). */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) await handleResponse<void>(res); // melempar ApiError
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: form, headers: authHeaders() });
  return handleResponse<T>(res);
}
