"""
core/config.py

Konfigurasi dari environment variable (boleh lewat file backend/.env).

NDT_SECRET_KEY    wajib, kunci penanda tangan token login (JWT)
NDT_DATA_DIR      folder data (database, gambar, laporan); default backend/data
NDT_CORS_ORIGINS  daftar origin frontend dipisah koma; default alamat dev Vite
"""

import os

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DATA_DIR = os.path.abspath(os.environ.get("NDT_DATA_DIR") or os.path.join(BASE_DIR, "data"))
IMAGES_DIR = os.path.join(DATA_DIR, "images")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")
DB_PATH = os.path.join(DATA_DIR, "ndt.db")

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("NDT_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

SECRET_KEY = os.environ.get("NDT_SECRET_KEY", "").strip()
if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "NDT_SECRET_KEY belum diisi atau kurang dari 32 karakter. "
        "Isi di backend/.env (lihat .env.example). "
        'Buat kunci acak: python -c "import secrets; print(secrets.token_hex(32))"'
    )
