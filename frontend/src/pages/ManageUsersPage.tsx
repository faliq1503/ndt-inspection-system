import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import { Badge } from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import { userService } from '../services/userService';
import { useAppSelector } from '../store/hooks';
import type { ManagedUser, UserRole } from '../types/index';

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (pw.length > 72) return 'Kata sandi maksimal 72 karakter.';
  return null;
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      title={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      className="absolute bottom-0 right-0 top-[26px] flex w-11 cursor-pointer items-center justify-center rounded-md text-ndt-muted hover:text-ndt-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ndt-primary"
    >
      <EyeIcon off={show} />
    </button>
  );
}

/** Indikator langsung aturan 8–72 karakter (aturan backend tidak diubah). */
function PasswordRule({ value }: { value: string }) {
  if (value.length === 0) {
    return <p className="mt-1 text-xs text-ndt-muted">8 sampai 72 karakter.</p>;
  }
  const ok = validatePassword(value) === null;
  return (
    <p className={`mt-1 text-xs font-medium ${ok ? 'text-ndt-success' : 'text-ndt-danger'}`}>
      {ok ? '✓ Memenuhi ketentuan 8–72 karakter.' : '✗ Belum memenuhi ketentuan 8–72 karakter.'}
    </p>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '-';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Halaman /admin/users — hanya untuk role admin (dijaga AdminRoute + backend). */
export default function ManageUsersPage() {
  const me = useAppSelector((s) => s.auth.user);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('staff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [pendingReset, setPendingReset] = useState<ManagedUser | null>(null);

  const [toggleTarget, setToggleTarget] = useState<ManagedUser | null>(null);
  const [toggling, setToggling] = useState(false);

  async function refresh() {
    setUsers(await userService.list());
  }

  function initialLoad() {
    setLoading(true);
    setLoadError(null);
    refresh()
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    initialLoad();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const name = username.trim();
    if (name.length < 3) {
      setError('Nama pengguna minimal 3 karakter.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setBusy(true);
    try {
      await userService.create({ username: name, password, role });
      setUsername('');
      setPassword('');
      setRole('staff');
      setNotice(`Akun "${name}" berhasil dibuat.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    const u = toggleTarget;
    setError(null);
    setNotice(null);
    setToggling(true);
    try {
      await userService.setActive(u.id, !u.aktif);
      setNotice(`Akun "${u.username}" ${u.aktif ? 'dinonaktifkan' : 'diaktifkan'}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status akun.');
    } finally {
      setToggling(false);
      setToggleTarget(null);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setError(null);
    setNotice(null);
    const pwError = validatePassword(resetPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    // Konfirmasi eksplisit sebelum eksekusi reset
    setPendingReset(resetTarget);
  }

  async function confirmReset() {
    if (!pendingReset) return;
    const u = pendingReset;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await userService.resetPassword(u.id, resetPassword);
      setNotice(`Kata sandi "${u.username}" berhasil direset.`);
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset kata sandi.');
    } finally {
      setBusy(false);
      setPendingReset(null);
    }
  }

  if (loading) return <Loading label="Memuat daftar pengguna..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={initialLoad} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Pengguna</h1>
        <p className="text-sm text-ndt-muted">Buat dan kelola akun pengguna.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-ndt-danger/10 px-3 py-2 text-sm text-ndt-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-ndt-success/10 px-3 py-2 text-sm text-ndt-success">
          {notice}
        </p>
      )}

      <ConfirmDialog
        open={toggleTarget !== null}
        title={`${toggleTarget?.aktif ? 'Nonaktifkan' : 'Aktifkan'} akun "${toggleTarget?.username ?? ''}"?`}
        message={
          toggleTarget?.aktif
            ? `Akun "${toggleTarget?.username ?? ''}" tidak akan bisa login sampai diaktifkan kembali.`
            : `Akun "${toggleTarget?.username ?? ''}" akan bisa login kembali.`
        }
        confirmLabel={toggleTarget?.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        loading={toggling}
        onConfirm={confirmToggle}
        onCancel={() => setToggleTarget(null)}
      />
      <ConfirmDialog
        open={pendingReset !== null}
        title={`Reset kata sandi "${pendingReset?.username ?? ''}"?`}
        message="Kata sandi lama langsung tidak berlaku dan diganti dengan yang baru. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Reset"
        loading={busy}
        onConfirm={confirmReset}
        onCancel={() => setPendingReset(null)}
      />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-4">
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-lg border border-ndt-border bg-white p-4"
          >
            <h2 className="text-[15px] font-semibold">Buat Akun Baru</h2>
            <Input
              label="Nama Pengguna"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. budi.qc"
              autoComplete="off"
            />
            <div className="relative">
              <Input
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-12"
              />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            <PasswordRule value={password} />
            <div>
              <label htmlFor="role" className="mb-1 block text-[13px] font-medium">
                Peran
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-ndt-border bg-white px-3 py-2 text-sm focus:border-ndt-primary focus:outline-none"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              Buat Akun
            </Button>
          </form>

          <div className="flex items-start gap-2 rounded-md border border-ndt-primary/25 bg-ndt-primary-light px-3 py-2.5" role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0 text-ndt-primary-dark">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[13px] leading-relaxed text-ndt-primary-dark">
              Tidak ada registrasi mandiri — akun hanya dibuat oleh admin.
            </p>
          </div>

          {resetTarget && (
            <form
              onSubmit={handleReset}
              className="space-y-3 rounded-lg border border-ndt-primary/40 bg-white p-4"
            >
              <h2 className="text-[15px] font-semibold">Reset Kata Sandi: {resetTarget.username}</h2>
              <div className="relative">
                <Input
                  label="Kata sandi baru"
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-12"
                />
                <EyeToggle show={showResetPassword} onToggle={() => setShowResetPassword((v) => !v)} />
              </div>
              <PasswordRule value={resetPassword} />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResetTarget(null);
                    setResetPassword('');
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" loading={busy}>
                  Simpan Kata Sandi
                </Button>
              </div>
            </form>
          )}
        </div>

        <section className="min-w-0 rounded-lg border border-ndt-border bg-white p-4">
          <h2 className="text-[15px] font-semibold">Daftar Akun</h2>
          {users.length === 0 ? (
            <p className="py-6 text-center text-sm text-ndt-muted">Belum ada akun.</p>
          ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-ndt-border text-xs text-ndt-muted">
                  <th className="py-2 pr-4 font-medium">Nama Pengguna</th>
                  <th className="py-2 pr-4 font-medium">Peran</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                  <tr key={u.id} className="border-b border-ndt-border last:border-0 hover:bg-ndt-primary-light">
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ndt-primary-light text-xs font-bold text-ndt-primary"
                        >
                          {initials(u.username)}
                        </span>
                        <span className="font-semibold text-ndt-text">{u.username}</span>
                        {isSelf && <Badge tone="neutral" label="Anda" />}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone="neutral" label={u.role.charAt(0).toUpperCase() + u.role.slice(1)} />
                    </td>
                    <td className="py-2 pr-4">
                      {u.aktif ? (
                        <Badge tone="success" label="Aktif" />
                      ) : (
                        <Badge tone="neutral" label="Nonaktif" />
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        <IconButton
                          label={u.aktif ? `Nonaktifkan akun ${u.username}` : `Aktifkan akun ${u.username}`}
                          title={isSelf ? 'Anda tidak dapat menonaktifkan akun sendiri.' : undefined}
                          tone={u.aktif ? 'danger' : 'success'}
                          onClick={() => setToggleTarget(u)}
                          disabled={isSelf}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                            <line x1="12" y1="2" x2="12" y2="12" />
                          </svg>
                        </IconButton>
                        <IconButton
                          label={`Reset kata sandi ${u.username}`}
                          tone="primary"
                          onClick={() => {
                            setResetTarget(u);
                            setResetPassword('');
                            setShowResetPassword(false);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </section>
      </div>
    </div>
  );
}