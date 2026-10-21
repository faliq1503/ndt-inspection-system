"""
reports/kop_pln.py

Konten header (kop) & footer (tanda tangan) format PLN yang dipakai
bersama oleh laporan Excel riwayat dan laporan PDF per inspeksi.
Ubah di sini kalau ada perubahan dari PLN, keduanya ikut berubah.
"""

import os
from datetime import datetime

LOGO_PATH = os.path.join(os.path.dirname(__file__), "assets", "logo_pln.png")

# (teks, ukuran font, tebal)
KOP_BARIS = [
    ("PT PLN (PERSERO) PUSHARLIS", 12, True),
    ("UNIT PELAKSANA PRODUKSI DAN WORKSHOP III", 11, True),
    ("Jl. Banten No. 10 Bandung 40272", 9, False),
    ("Telp (022) 7236791, 7236792, 7236793 Faks (022) 7236794 | e-mail: pusharlis@pln.co.id", 9, False),
]

NAMA_SISTEM = "NDT Inspection System"
STANDAR_ACUAN = "DOD-STD-2183 (SH)"
PELAKSANA = "Workshop PLN Pusharlis"

# (judul, jabatan, nama) untuk tiap kolom tanda tangan di footer, urut kiri -> kanan.
# String kosong = dibiarkan kosong untuk diisi tangan.
TANDA_TANGAN = [
    ("PREPARED BY", "STAFF QUALITY CONTROL", ""),
    ("CHECKED BY", "TL QUALITY CONTROL", "BAGUS SANJAYA PUTRA"),
    ("APPROVED BY", "", ""),
]

NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def format_tanggal_indo(waktu: datetime) -> str:
    return f"{waktu.day} {NAMA_BULAN[waktu.month - 1]} {waktu.year}"


def label_status(status):
    """Label status sama dengan website: ACCEPT ditampilkan 'ACC', REJECT tetap."""
    return "ACC" if status == "ACCEPT" else status
