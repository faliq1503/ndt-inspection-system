"""
backend/reset_inspeksi.py

Mengosongkan semua data inspeksi (komponen, indikasi, hasil evaluasi, foto,
dan laporan) dan mengembalikan penomoran ke 1. Akun user dan standard TIDAK
disentuh. Database dicadangkan dulu ke folder data sebelum apa pun dihapus.

Jalankan dari folder backend, backend dimatikan lebih dulu, venv aktif:
    python reset_inspeksi.py
"""

import os
import sqlite3
import sys
from datetime import datetime

from core.config import DATA_DIR, DB_PATH, IMAGES_DIR, REPORTS_DIR

TABEL_INSPEKSI = ["indication", "evaluation_result", "component"]  # urutan: anak dulu


def _hitung(conn, tabel):
    return conn.execute(f"SELECT COUNT(*) FROM {tabel}").fetchone()[0]


def _kosongkan_folder(folder):
    n = 0
    if os.path.isdir(folder):
        for nama in os.listdir(folder):
            path = os.path.join(folder, nama)
            if os.path.isfile(path):
                os.remove(path)
                n += 1
    return n


def main():
    if not os.path.isfile(DB_PATH):
        print(f"Database tidak ditemukan di {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    print(f"Database : {DB_PATH}")
    for t in TABEL_INSPEKSI + ["standard", "users"]:
        print(f"  {t:<18} {_hitung(conn, t)} baris")
    print("\nYang DIHAPUS : indication, evaluation_result, component, isi folder images dan reports")
    print("Yang DIPERTAHANKAN : users dan standard\n")

    if input("Ketik HAPUS untuk melanjutkan: ").strip() != "HAPUS":
        print("Dibatalkan.")
        sys.exit(0)

    cadangan = os.path.join(DATA_DIR, f"ndt_sebelum_reset_{datetime.now():%Y%m%d_%H%M%S}.db")
    dst = sqlite3.connect(cadangan)
    conn.backup(dst)
    dst.close()
    print(f"Cadangan database: {cadangan}")

    with conn:
        for t in TABEL_INSPEKSI:
            conn.execute(f"DELETE FROM {t}")
        marks = ",".join("?" * len(TABEL_INSPEKSI))
        conn.execute(f"DELETE FROM sqlite_sequence WHERE name IN ({marks})", TABEL_INSPEKSI)
    conn.execute("VACUUM")
    conn.close()

    foto = _kosongkan_folder(IMAGES_DIR)
    laporan = _kosongkan_folder(REPORTS_DIR)
    print(f"Selesai. {foto} foto dan {laporan} laporan dihapus; penomoran kembali ke 1.")
    print("Foto di folder images tidak tercakup cadangan database; salin folder data bila perlu.")


if __name__ == "__main__":
    main()
