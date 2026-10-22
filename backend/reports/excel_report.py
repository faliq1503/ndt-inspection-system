"""
reports/excel_report.py

Membuat file Excel (.xlsx) berisi riwayat seluruh hasil evaluasi,
dengan Zone A dan Zone C terpisah.

Format mengikuti ketentuan PLN:
- Header : kop PLN Pusharlis + judul laporan + info laporan (termasuk tanggal cetak)
- Tabel  : riwayat hasil inspeksi
- Footer : kolom tanda tangan (CHECKED BY)
Konten kop & tanda tangan ada di reports/kop_pln.py.
"""

import os
from datetime import datetime

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

from reports.kop_pln import (
    KOP_BARIS, LOGO_PATH, NAMA_SISTEM, PELAKSANA, STANDAR_ACUAN, TANDA_TANGAN,
    format_tanggal_indo, label_status,
)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports")

JUDUL_LAPORAN = "LAPORAN RIWAYAT INSPEKSI NDT"

HEADERS = [
    "ID", "Jenis Benda", "Diameter (mm)", "Zona",
    "Luas Babbit (mm2)", "Luas Zone A (mm2)", "Luas Zone C (mm2)",
    "Unbond Zone A (mm2)", "% Unbond Zone A", "Status Zone A",
    "Unbond Zone C (mm2)", "% Unbond Zone C", "Status Zone C",
    "Status Akhir", "Inspektur", "Unit Asal",
]

# Lebar kolom A..P sesuai format PLN
LEBAR_KOLOM = [10.09, 15, 17, 10, 16.82, 17.09, 16.91, 20.09, 19, 17, 23, 19, 17, 16, 13, 17]

JUMLAH_KOLOM = len(HEADERS)  # 16 -> kolom A..P
BARIS_JUDUL = 5
BARIS_INFO_AWAL = 6
BARIS_HEADER_TABEL = 11

THIN = Side(style="thin")
FILL_HEADER = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
FILL_ACCEPT = PatternFill(start_color="16A34A", end_color="16A34A", fill_type="solid")
FILL_REJECT = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")


def _kotak(ws, baris_awal: int, kolom_awal: int, baris_akhir: int, kolom_akhir: int):
    """Beri garis tepi luar (thin) di sekeliling sebuah area sel."""
    for r in range(baris_awal, baris_akhir + 1):
        for c in range(kolom_awal, kolom_akhir + 1):
            cell = ws.cell(row=r, column=c)
            b = cell.border
            cell.border = Border(
                left=THIN if c == kolom_awal else b.left,
                right=THIN if c == kolom_akhir else b.right,
                top=THIN if r == baris_awal else b.top,
                bottom=THIN if r == baris_akhir else b.bottom,
            )


def _tulis_header(ws, data: list, dicetak_oleh: str, waktu_cetak: datetime):
    # --- Kop PLN (baris 1-4): logo di kolom A, teks di B..P ---
    for i, (teks, ukuran, tebal) in enumerate(KOP_BARIS, start=1):
        ws.row_dimensions[i].height = 18
        ws.merge_cells(start_row=i, start_column=2, end_row=i, end_column=JUMLAH_KOLOM)
        cell = ws.cell(row=i, column=2, value=teks)
        cell.font = Font(size=ukuran, bold=tebal)
        cell.alignment = Alignment(vertical="center")

    if os.path.exists(LOGO_PATH):
        logo = XLImage(LOGO_PATH)
        # Skala agar pas setinggi 4 baris kop (4 x 18pt = 96px)
        skala = 90 / logo.height
        logo.width, logo.height = logo.width * skala, logo.height * skala
        ws.add_image(logo, "A1")

    _kotak(ws, 1, 1, 4, JUMLAH_KOLOM)

    # --- Judul laporan (baris 5) ---
    ws.row_dimensions[BARIS_JUDUL].height = 20
    ws.merge_cells(start_row=BARIS_JUDUL, start_column=1, end_row=BARIS_JUDUL, end_column=JUMLAH_KOLOM)
    judul = ws.cell(row=BARIS_JUDUL, column=1, value=JUDUL_LAPORAN)
    judul.font = Font(size=14, bold=True)
    judul.alignment = Alignment(horizontal="center", vertical="center")
    _kotak(ws, BARIS_JUDUL, 1, BARIS_JUDUL, JUMLAH_KOLOM)

    # --- Info laporan (baris 6-9): kiri A..H, kanan I..P ---
    jumlah_accept = sum(1 for row in data if row.get("status") == "ACCEPT")
    jumlah_reject = sum(1 for row in data if row.get("status") == "REJECT")

    info_kiri = [
        ("Nama Sistem", NAMA_SISTEM),
        ("Jenis Laporan", "Riwayat Inspeksi"),
        ("Standar Acuan", STANDAR_ACUAN),
        ("Pelaksana", PELAKSANA),
    ]
    info_kanan = [
        ("Tanggal Cetak", format_tanggal_indo(waktu_cetak)),
        ("Dicetak Oleh", dicetak_oleh or "-"),
        ("Jumlah Inspeksi", f"{len(data)} data"),
        ("Ringkasan Status", f"ACC: {jumlah_accept}  |  REJECT: {jumlah_reject}"),
    ]

    for i, ((label_kiri, isi_kiri), (label_kanan, isi_kanan)) in enumerate(zip(info_kiri, info_kanan)):
        r = BARIS_INFO_AWAL + i
        # Kiri: label A:B, isi C:H
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=8)
        ws.cell(row=r, column=1, value=label_kiri)
        ws.cell(row=r, column=3, value=f": {isi_kiri}")
        # Kanan: label I:J, isi K:P
        ws.merge_cells(start_row=r, start_column=9, end_row=r, end_column=10)
        ws.merge_cells(start_row=r, start_column=11, end_row=r, end_column=JUMLAH_KOLOM)
        ws.cell(row=r, column=9, value=label_kanan)
        ws.cell(row=r, column=11, value=f": {isi_kanan}")

    baris_info_akhir = BARIS_INFO_AWAL + len(info_kiri) - 1
    _kotak(ws, BARIS_INFO_AWAL, 1, baris_info_akhir, 8)
    _kotak(ws, BARIS_INFO_AWAL, 9, baris_info_akhir, JUMLAH_KOLOM)


def _tulis_tabel(ws, data: list) -> int:
    """Tulis header tabel + baris data. Return: nomor baris data terakhir."""
    for col_idx, judul in enumerate(HEADERS, start=1):
        cell = ws.cell(row=BARIS_HEADER_TABEL, column=col_idx, value=judul)
        cell.fill = FILL_HEADER
        cell.font = Font(color="FFFFFF", bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

    r = BARIS_HEADER_TABEL
    for row in data:
        r += 1
        nilai = [
            row["id"], row["jenis_benda"], row["diameter_mm"], row["zona"],
            row["a_babbit"], row["a_zone_a"], row["a_zone_c"],
            row["a_unbond_zone_a"], row["persen_unbond_zone_a"], label_status(row["status_zone_a"]),
            row["a_unbond_zone_c"], row["persen_unbond_zone_c"], label_status(row["status_zone_c"]),
            label_status(row["status"]), row.get("inspector") or "-", row.get("unit_asal") or "-",
        ]
        for col_idx, isi in enumerate(nilai, start=1):
            cell = ws.cell(row=r, column=col_idx, value=isi)
            cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
            if col_idx == 1:
                cell.alignment = Alignment(horizontal="center")

        for col_idx in (10, 13, 14):  # Status Zone A, Status Zone C, Status Akhir
            cell = ws.cell(row=r, column=col_idx)
            if cell.value is None:
                continue
            cell.fill = FILL_ACCEPT if cell.value == "ACC" else FILL_REJECT
            cell.font = Font(color="FFFFFF", bold=True)
            cell.alignment = Alignment(horizontal="center")

    return r


# Posisi kotak tanda tangan (kolom awal, kolom akhir): kiri A:D, tengah G:J, kanan M:P
KOLOM_TANDA_TANGAN = [(1, 4), (7, 10), (13, 16)]


def _tulis_footer(ws, baris_awal: int):
    """Kolom tanda tangan PREPARED / CHECKED / APPROVED (sesuai format PLN)."""
    tengah = Alignment(horizontal="center", vertical="center")
    for (judul, jabatan, nama), (kolom_awal, kolom_akhir) in zip(TANDA_TANGAN, KOLOM_TANDA_TANGAN):
        # Baris 1: judul, baris 2: jabatan, baris 3-6: ruang tanda tangan, baris 7-8: nama
        bagian = [
            (baris_awal, baris_awal, judul),
            (baris_awal + 1, baris_awal + 1, jabatan),
            (baris_awal + 2, baris_awal + 5, None),
            (baris_awal + 6, baris_awal + 7, nama),
        ]
        for r_awal, r_akhir, teks in bagian:
            ws.merge_cells(start_row=r_awal, start_column=kolom_awal, end_row=r_akhir, end_column=kolom_akhir)
            cell = ws.cell(row=r_awal, column=kolom_awal, value=teks or None)
            cell.alignment = tengah
            if r_awal == baris_awal + 6 and nama:
                cell.font = Font(bold=True, underline="single")

        # Judul + jabatan satu kotak, ruang tanda tangan satu kotak, nama satu kotak
        _kotak(ws, baris_awal, kolom_awal, baris_awal + 1, kolom_akhir)
        _kotak(ws, baris_awal + 2, kolom_awal, baris_awal + 5, kolom_akhir)
        _kotak(ws, baris_awal + 6, kolom_awal, baris_awal + 7, kolom_akhir)


def generate_excel_riwayat(data: list, dicetak_oleh: str = "", waktu_cetak: datetime | None = None) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, "riwayat_hasil_ndt.xlsx")
    waktu_cetak = waktu_cetak or datetime.now()

    wb = Workbook()
    ws = wb.active
    ws.title = "Riwayat Hasil NDT"

    for idx, lebar in enumerate(LEBAR_KOLOM, start=1):
        ws.column_dimensions[ws.cell(row=1, column=idx).column_letter].width = lebar

    _tulis_header(ws, data, dicetak_oleh, waktu_cetak)
    baris_terakhir = _tulis_tabel(ws, data)
    _tulis_footer(ws, baris_terakhir + 2)

    # Pengaturan cetak: landscape, muat 1 halaman lebar, header tabel diulang tiap halaman
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = f"{BARIS_HEADER_TABEL}:{BARIS_HEADER_TABEL}"
    ws.oddFooter.right.text = "Halaman &P dari &N"

    wb.save(path)
    return path
