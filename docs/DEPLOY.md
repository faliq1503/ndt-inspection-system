# Deploy (Linux + Nginx)

Konfigurasi contoh ada di folder `deploy/`. Data (database, foto, laporan) ada di
`NDT_DATA_DIR`; backup folder itu secara rutin.

1. Pasang paket: `python3`, `python3-venv`, `nginx`, `nodejs` (untuk build frontend).
2. `git clone` ke `/var/www/ndt`, lalu checkout branch yang akan dipakai.
3. Backend:
   ```bash
   cd /var/www/ndt/backend
   python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   cp .env.example .env     # isi NDT_SECRET_KEY baru (jangan pakai kunci dev) dan
                            # NDT_DATA_DIR=/var/lib/ndt (di luar folder repo)
   .venv/bin/python create_admin.py
   ```
4. Frontend:
   ```bash
   cd /var/www/ndt/frontend
   cp .env.example .env.production   # VITE_API_URL=/api
   npm ci && npm run build
   ```
5. Salin `deploy/ndt-backend.service` ke `/etc/systemd/system/`, lalu
   `systemctl enable --now ndt-backend`.
6. Salin `deploy/nginx.conf` ke `/etc/nginx/sites-available/ndt`, aktifkan
   (`ln -s` ke `sites-enabled`), `nginx -t && systemctl reload nginx`.
7. HTTPS bila diakses lewat internet: `certbot --nginx -d ndt.example.id`.

Pengembangan lokal: buat `backend/.env` berisi `NDT_SECRET_KEY` (backend menolak
start tanpa itu), lalu `uvicorn api.main:app --reload` dari folder `backend`.

## Memindahkan data dari komputer lokal (sekali, saat pertama deploy)

Dari PowerShell, folder `data` hasil backup lokal dikirim ke server, lalu
dimiliki user `ndt`:

```powershell
scp -r D:\backup-ndt\data\* root@IP_SERVER:/var/lib/ndt/
```
```bash
chown -R ndt:ndt /var/lib/ndt
```

## Backup otomatis

```bash
sudo apt install sqlite3
sudo cp /var/www/ndt/deploy/backup.sh /usr/local/bin/ndt-backup && sudo chmod +x /usr/local/bin/ndt-backup
sudo crontab -e      # tambahkan baris berikut (backup tiap pukul 02.30):
30 2 * * * NDT_DATA_DIR=/var/lib/ndt /usr/local/bin/ndt-backup >> /var/log/ndt-backup.log 2>&1
```

Backup di server yang sama ikut hilang bila server rusak, jadi unduh juga
sesekali ke komputer lain:

```powershell
scp -r root@IP_SERVER:/var/backups/ndt D:\backup-ndt\dari-server
```

Pulihkan: hentikan `ndt-backend`, salin `ndt.db` dan isi `images.tar.gz`
(`tar xzf`) kembali ke `NDT_DATA_DIR`, lalu jalankan lagi service-nya.
