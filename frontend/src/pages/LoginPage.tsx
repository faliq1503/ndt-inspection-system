import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { authService } from '../services/authService';
import { useAppDispatch } from '../store/hooks';
import { loginError, loginStart, loginSuccess } from '../store/slices/authSlice';

/** Halaman /login — split layout branding + form (spec §8). */
export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    dispatch(loginStart());
    setLoading(true);
    try {
      const user = await authService.login({ username, password });
      dispatch(loginSuccess(user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal.';
      setError(message);
      dispatch(loginError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <div className="hidden w-1/2 flex-col justify-center bg-[#0072CE] p-12 text-white lg:flex">
        <span aria-hidden className="mb-6 inline-block h-3 w-16 rounded-sm bg-[#FFD100]" />
        <h1 className="text-3xl font-bold">NDT Inspection System</h1>
        <p className="mt-2 max-w-md text-white/80">
          Digitalisasi inspeksi Non-Destructive Testing: mapping indikasi 2D, perhitungan
          % Unbound, dan evaluasi Acceptance Criteria.
        </p>
      </div>
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-lg border border-[#E2E8F0] bg-white p-6"
        >
          <h2 className="text-xl font-semibold">Login</h2>
          <p className="mb-4 text-sm text-[#64748B]">Masuk untuk mengakses dashboard inspeksi.</p>
          <div className="space-y-3">
            <Input
              label="Username / Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nama.pengguna"
              autoComplete="username"
            />
            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="mt-1 text-xs font-medium text-[#0072CE] hover:underline"
              >
                {showPassword ? 'Sembunyikan' : 'Tampilkan'} password
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
              {error}
            </p>
          )}
          <div className="mt-4">
            <Button type="submit" loading={loading} className="w-full">
              Login
            </Button>
          </div>
          <p className="mt-3 text-xs text-[#64748B]">
            Backend auth belum tersedia — login sementara memakai sesi lokal dan siap
            diganti API asli tanpa mengubah UI.
          </p>
        </form>
      </div>
    </div>
  );
}
