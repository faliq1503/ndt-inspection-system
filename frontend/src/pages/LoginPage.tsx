import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import plnLogo from '../assets/PLN_logo_QC.png';
import { authService } from '../services/authService';
import { useAppDispatch } from '../store/hooks';
import { loginError, loginStart, loginSuccess } from '../store/slices/authSlice';

/** Blueprint grid untuk panel branding desktop. */
const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
  backgroundSize: '36px 36px',
} as const;

/** Varian lebih samar untuk header mobile. */
const GRID_BG_SOFT = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
} as const;

/** Sketsa teknis: penampang bearing + marker indikasi (dekoratif). */
function InspectionSketch() {
  return (
    <svg viewBox="0 0 320 150" role="presentation" aria-hidden="true" className="h-auto w-full">
      <rect x="30" y="30" width="260" height="90" rx="10" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="14" y1="75" x2="306" y2="75" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6 5" />
      <line x1="160" y1="14" x2="160" y2="136" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6 5" />
      <circle cx="160" cy="75" r="30" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="160" cy="75" r="8" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="30" y1="134" x2="290" y2="134" stroke="#FFD100" strokeWidth="1" />
      <line x1="30" y1="129" x2="30" y2="139" stroke="#FFD100" strokeWidth="1" />
      <line x1="290" y1="129" x2="290" y2="139" stroke="#FFD100" strokeWidth="1" />
      <g fontFamily="Inter, sans-serif" fontSize="10" fontWeight="bold" textAnchor="middle">
        <circle cx="96" cy="52" r="10" fill="#FFD100" />
        <text x="96" y="56" fill="#172033">1</text>
        <circle cx="216" cy="52" r="10" fill="#FFD100" />
        <text x="216" y="56" fill="#172033">2</text>
        <circle cx="248" cy="100" r="10" fill="none" stroke="#FFD100" strokeWidth="1.5" />
        <text x="248" y="104" fill="#FFD100">3</text>
      </g>
    </svg>
  );
}

/** Ikon inline yang dipakai bersama: stroke seragam. */
function Icon({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const UserIcon = () => (
  <Icon>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

const LockIcon = () => (
  <Icon>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const EyeIcon = () => (
  <Icon size={19}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOffIcon = () => (
  <Icon size={19}>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </Icon>
);

/** Halaman /login — logic auth tidak diubah. */
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
    <div className="flex min-h-dvh flex-col bg-[#F5F7FA] min-[900px]:flex-row">
      {/* ── Header mobile (<900px) ──
          Tinggi mengikuti layar (clamp), konten dipusatkan di area biru yang terlihat:
          pb-16 = ruang yang nanti ditimpa kartu (-mt-10) + jarak napas 24px. */}
      <header className="relative flex min-h-[clamp(220px,28dvh,300px)] items-center justify-center overflow-hidden rounded-b-[28px] bg-[#0072CE] px-5 pb-16 pt-[max(1.75rem,env(safe-area-inset-top))] text-center text-white min-[900px]:hidden">
        <div aria-hidden="true" className="absolute inset-0" style={GRID_BG_SOFT} />
        <div className="relative">
          <img
            src={plnLogo}
            alt="PLN Pusharlis"
            className="mx-auto h-[68px] w-auto rounded-xl bg-white px-4 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
          />
          <h1 className="mt-3.5 text-[22px] font-bold leading-tight tracking-tight">
            NDT Inspection System
          </h1>
          <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-12 rounded-full bg-[#FFD100]" />
        </div>
      </header>

      {/* ── Panel branding desktop (≥900px) ── */}
      <aside
        className="relative hidden items-center justify-center overflow-hidden bg-[#0072CE] text-white min-[900px]:flex min-[900px]:w-[38%] min-[900px]:px-6 lg:w-[42%]"
        aria-label="Branding NDT Inspection System"
      >
        <div aria-hidden="true" className="absolute inset-0" style={GRID_BG} />
        <div className="relative w-full max-w-[400px] py-12">
          <img
            src={plnLogo}
            alt="PLN Pusharlis"
            className="h-20 w-auto rounded-xl bg-white px-5 py-3"
          />
          <span aria-hidden="true" className="mb-4 mt-8 block h-1 w-12 rounded-full bg-[#FFD100]" />
          <h1 className="text-[28px] font-bold leading-tight">NDT Inspection System</h1>
          <p className="mt-3 max-w-[38ch] text-[14px] leading-[1.6] text-white">
            Digitalisasi inspeksi Non-Destructive Testing: mapping indikasi 2D, perhitungan
            % Unbound, dan evaluasi Kriteria Penerimaan.
          </p>
          <div className="mt-6 rounded-xl border border-white/20 bg-white/[0.07] p-4">
            <InspectionSketch />
            <p className="mt-2 text-[13px] tracking-wide text-white/85">
              Mapping &middot; % Unbound &middot; Kriteria Penerimaan
            </p>
          </div>
        </div>
      </aside>

      {/* ── Sisi kanan: main + footer dibungkus satu kolom (footer tidak lagi jadi kolom sendiri di desktop) ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-[#F5F7FA] to-[#E6EFF9] min-[900px]:bg-none">
        <main className="flex flex-1 flex-col items-center px-4 pb-4 min-[900px]:justify-center min-[900px]:px-5 min-[900px]:py-10">
          {/* Kartu menimpa header di mobile (-mt-10), normal di desktop */}
          <div className="relative z-10 -mt-10 w-full max-w-[480px] min-[900px]:mt-0">
            <form
              onSubmit={handleSubmit}
              className="animate-login-rise rounded-[22px] border border-[#E2E8F0]/70 bg-white p-6 shadow-[0_16px_44px_rgba(23,32,51,0.12)] min-[900px]:rounded-2xl min-[900px]:p-10 min-[900px]:shadow-[0_10px_36px_rgba(23,32,51,0.07)]"
            >
              <h2 className="text-[28px] font-bold leading-tight text-[#172033]">Masuk</h2>
              <p className="mb-6 mt-1.5 text-[15px] text-[#475569]">Masuk ke dasbor inspeksi</p>

              <div className="space-y-5">
                <Input
                  label="Nama Pengguna"
                  controlSize="lg"
                  leftIcon={<UserIcon />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nama.pengguna"
                  autoComplete="username"
                  autoCapitalize="none"
                />
                <div className="relative">
                  <Input
                    label="Kata Sandi"
                    controlSize="lg"
                    leftIcon={<LockIcon />}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute bottom-0 right-0 top-[26px] flex w-11 cursor-pointer items-center justify-center rounded-md text-[#64748B] hover:text-[#0072CE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0072CE]"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-[#DC2626]/25 bg-[#DC2626]/[0.07] px-3.5 py-2.5 text-sm font-medium text-[#DC2626]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DC2626] text-xs font-bold text-white"
                  >
                    !
                  </span>
                  {error}
                </p>
              )}

              <div className="mt-6">
                <Button
                  type="submit"
                  loading={loading}
                  loadingText="Masuk..."
                  className="h-[52px] w-full rounded-[12px] text-[15px] font-semibold shadow-[0_6px_16px_rgba(0,114,206,0.28)] transition-transform active:scale-[0.98] min-[900px]:h-[48px] min-[900px]:rounded-[10px] min-[900px]:shadow-none"
                >
                  Masuk
                </Button>
              </div>
            </form>
          </div>
        </main>

        <footer className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center text-xs tracking-wide text-[#64748B]">
          © 2026 PLN Pusharlis
        </footer>
      </div>
    </div>
  );
}
