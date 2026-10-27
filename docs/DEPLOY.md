# Deploy (Linux + Nginx)

Konfigurasi contoh ada di folder `deploy/`. Data (database, foto, laporan) ada di
`NDT_DATA_DIR`; backup folder itu secara rutin.

1. Pasang paket: `python3`, `python3-venv`, `nginx`, `nodejs` (untuk build frontend).
2. `git clone` ke `/var/www/ndt`, lalu checkout branch yang akan dipakai.
3. Backend:
   ```bash
   cd /var/www/ndt/backend
   python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   cp .env.example .env     # isi NDT_SECRET_KEY (dan NDT_DATA_DIR bila perlu)
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
