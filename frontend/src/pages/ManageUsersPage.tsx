import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import { userService } from '../services/userService';
import { useAppSelector } from '../store/hooks';
import type { ManagedUser, UserRole } from '../types/index';

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password minimal 8 karakter.';
  if (pw.length > 72) return 'Password maksimal 72 karakter.';
  return null;
}

/** Halaman /admin/users — hanya untuk role admin (dijaga AdminRoute + backend). */
export default function ManageUsersPage() {
  const me = useAppSelector((s) => s.auth.user);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  async function refresh() {
    setUsers(await userService.list());
  }

  function initialLoad() {
    setLoading(true);
    setLoadError(null);
    refresh()
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar user.');
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
      setError('Username minimal 3 karakter.');
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

  async function handleToggle(u: ManagedUser) {
    setError(null);
    setNotice(null);
    try {
      await userService.setActive(u.id, !u.aktif);
      setNotice(`Akun "${u.username}" ${u.aktif ? 'dinonaktifkan' : 'diaktifkan'}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status akun.');
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
    setBusy(true);
    try {
      await userService.resetPassword(resetTarget.id, resetPassword);
      setNotice(`Password "${resetTarget.username}" berhasil direset.`);
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal reset password.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Memuat daftar user..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={initialLoad} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Manage User</h1>
        <p className="text-sm text-[#64748B]">Buat dan kelola akun staff. Tidak ada registrasi mandiri.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-[#DC2626]/10 px-3 py-2 text-sm text-[#DC2626]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-[#16A34A]/10 px-3 py-2 text-sm text-[#16A34A]">
          {notice}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-lg border border-[#E2E8F0] bg-white p-4"
          >
            <h2 className="text-[15px] font-semibold">Buat Akun Baru</h2>
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. budi.qc"
              autoComplete="off"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="8 sampai 72 karakter."
              autoComplete="new-password"
            />
            <div>
              <label htmlFor="role" className="mb-1 block text-[13px] font-medium">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#0072CE] focus:outline-none"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              Buat Akun
            </Button>
          </form>

          {resetTarget && (
            <form
              onSubmit={handleReset}
              className="space-y-3 rounded-lg border border-[#0072CE]/40 bg-white p-4"
            >
              <h2 className="text-[15px] font-semibold">Reset Password: {resetTarget.username}</h2>
              <Input
                label="Password baru"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                hint="8 sampai 72 karakter."
                autoComplete="new-password"
              />
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
                  Simpan Password
                </Button>
              </div>
            </form>
          )}
        </div>

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-[15px] font-semibold">Daftar Akun</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2 pr-4 font-medium">Username</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="py-2 pr-4 font-medium">
                      {u.username}
                      {u.id === me?.id && <span className="ml-2 text-xs text-[#64748B]">(Anda)</span>}
                    </td>
                    <td className="py-2 pr-4 capitalize">{u.role}</td>
                    <td className="py-2 pr-4">
                      <span className={u.aktif ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                        {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleToggle(u)}
                          disabled={u.id === me?.id}
                        >
                          {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button variant="secondary" onClick={() => setResetTarget(u)}>
                          Reset Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}