"""
reports/pdf_report.py

Membuat file laporan PDF untuk satu hasil evaluasi NDT, dengan
Zone A dan Zone C ditampilkan terpisah.

Format mengikuti ketentuan PLN (sama dengan export Excel riwayat):
- Header : kop PLN Pusharlis (tiap halaman) + judul + info laporan
- Isi    : ringkasan hasil, perhitungan, gambar mapping, daftar indikasi
- Footer : kolom tanda tangan (CHECKED BY) + nomor halaman
Konten kop & tanda tangan ada di reports/kop_pln.py.
"""

import os
import tempfile
from datetime import datetime, timedelta

from PIL import Image as PILImage, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    Image as RLImage, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from reports.kop_pln import (
    KOP_BARIS, LOGO_PATH, NAMA_SISTEM, STANDAR_ACUAN, TANDA_TANGAN, format_tanggal_indo,
)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "images")

JUDUL_LAPORAN = "LAPORAN HASIL INSPEKSI NDT"

PAGE_W, PAGE_H = A4
MARGIN_X = 15 * mm
LEBAR_ISI = PAGE_W - 2 * MARGIN_X
KOP_ATAS = 10 * mm      # jarak kop dari tepi atas kertas
KOP_TINGGI = 22 * mm

WARNA_GELAP = colors.HexColor("#1E293B")
WARNA_ABU = colors.HexColor("#64748B")
WARNA_GARIS = colors.HexColor("#CBD5E1")
WARNA_ZEBRA = colors.HexColor("#F1F5F9")
WARNA_ACCEPT = colors.HexColor("#16A34A")
WARNA_REJECT = colors.HexColor("#DC2626")
WARNA_KUNING = colors.HexColor("#FFD100")


# ---------------------------------------------------------------------
# Helper format
# ---------------------------------------------------------------------

def _angka(nilai, digit: int = 2) -> str:
    """Format angka gaya Indonesia (1.234,56). NULL dari database lama -> '-'."""
    if nilai is None:
        return "-"
    teks = f"{nilai:,.{digit}f}"
    return teks.replace(",", "#").replace(".", ",").replace("#", ".")


def _dengan_satuan(nilai, satuan: str) -> str:
    return "-" if nilai is None else f"{_angka(nilai)} {satuan}"


def _warna_status(status):
    if status == "ACCEPT":
        return WARNA_ACCEPT
    if status == "REJECT":
        return WARNA_REJECT
    return WARNA_ABU


def _tanggal_inspeksi(tanggal_input) -> str:
    """tanggal_input disimpan SQLite (CURRENT_TIMESTAMP) dalam UTC -> tampilkan WIB."""
    if not tanggal_input:
        return "-"
    try:
        waktu = datetime.strptime(str(tanggal_input)[:19], "%Y-%m-%d %H:%M:%S") + timedelta(hours=7)
    except ValueError:
        return str(tanggal_input)
    return f"{format_tanggal_indo(waktu)}, {waktu:%H:%M} WIB"


# ---------------------------------------------------------------------
# Kop (tiap halaman) & nomor halaman
# ---------------------------------------------------------------------

def _gambar_kop(c, doc):
    """Kop PLN di bagian atas setiap halaman: logo + 4 baris teks, dalam kotak."""
    c.saveState()
    atas = PAGE_H - KOP_ATAS
    bawah = atas - KOP_TINGGI

    c.setStrokeColor(colors.black)
    c.setLineWidth(0.6)
    c.rect(MARGIN_X, bawah, LEBAR_ISI, KOP_TINGGI)

    teks_x = MARGIN_X + 4 * mm
    if os.path.exists(LOGO_PATH):
        tinggi_logo = KOP_TINGGI - 4 * mm
        with PILImage.open(LOGO_PATH) as im:
            iw, ih = im.size
        lebar_logo = tinggi_logo * iw / ih
        c.drawImage(LOGO_PATH, MARGIN_X + 3 * mm, bawah + 2 * mm,
                    width=lebar_logo, height=tinggi_logo, mask="auto")
        teks_x = MARGIN_X + 3 * mm + lebar_logo + 4 * mm

    y = atas - 6 * mm
    for teks, ukuran, tebal in KOP_BARIS:
        ukuran_pdf = ukuran - 1 if tebal else ukuran - 1.5
        c.setFont("Helvetica-Bold" if tebal else "Helvetica", ukuran_pdf)
        c.setFillColor(colors.black)
        c.drawString(teks_x, y, teks)
        y -= ukuran_pdf + 2.2

    # Aksen kuning PLN di bawah kop
    c.setFillColor(WARNA_KUNING)
    c.rect(MARGIN_X, bawah - 1.2 * mm, LEBAR_ISI, 1.2 * mm, stroke=0, fill=1)
    c.restoreState()


class _CanvasBernomor(rl_canvas.Canvas):
    """Canvas dua tahap supaya bisa menulis 'Halaman x dari y'."""

    teks_kiri = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._halaman = []

    def showPage(self):
        self._halaman.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._halaman)
        for state in self._halaman:
            self.__dict__.update(state)
            self.saveState()
            self.setStrokeColor(WARNA_GARIS)
            self.setLineWidth(0.5)
            self.line(MARGIN_X, 12 * mm, PAGE_W - MARGIN_X, 12 * mm)
            self.setFont("Helvetica", 7.5)
            self.setFillColor(WARNA_ABU)
            self.drawString(MARGIN_X, 8 * mm, self.teks_kiri)
            self.drawRightString(PAGE_W - MARGIN_X, 8 * mm, f"Halaman {self._pageNumber} dari {total}")
            self.restoreState()
            super().showPage()
        super().save()


# ---------------------------------------------------------------------
# Bagian-bagian isi laporan
# ---------------------------------------------------------------------

def _judul_bagian(teks: str, styles) -> Paragraph:
    return Paragraph(teks, styles["judul_bagian"])


def _blok_judul_dan_info(result_id, hasil, dicetak_oleh, waktu_cetak, styles):
    """Judul laporan + info inspeksi (2 kolom), bentuknya sama dengan header Excel."""
    judul = Table([[Paragraph(JUDUL_LAPORAN, styles["judul_laporan"])]], colWidths=[LEBAR_ISI])
    judul.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    diameter = hasil.get("diameter_mm")
    info_kiri = [
        ("No. Inspeksi", f"#{result_id}"),
        ("Tanggal Inspeksi", _tanggal_inspeksi(hasil.get("tanggal_input"))),
        ("Jenis Benda", hasil.get("jenis_benda") or "-"),
        ("Diameter", _dengan_satuan(diameter, "mm") if diameter else "- (P diisi langsung)"),
        ("Zona Komponen", hasil.get("zona") or "-"),
    ]
    info_kanan = [
        ("Inspector", hasil.get("inspector") or "-"),
        ("Unit Asal", hasil.get("unit_asal") or "-"),
        ("Standar Acuan", hasil.get("nama_standard") or STANDAR_ACUAN),
        ("Tanggal Cetak", format_tanggal_indo(waktu_cetak)),
        ("Dicetak Oleh", dicetak_oleh or "-"),
    ]
    baris = [
        [Paragraph(lk, styles["label"]), Paragraph(f": {ik}", styles["isi"]),
         Paragraph(lr, styles["label"]), Paragraph(f": {ir}", styles["isi"])]
        for (lk, ik), (lr, ir) in zip(info_kiri, info_kanan)
    ]
    lebar = [30 * mm, LEBAR_ISI / 2 - 30 * mm, 30 * mm, LEBAR_ISI / 2 - 30 * mm]
    info = Table(baris, colWidths=lebar)
    info.setStyle(TableStyle([
        ("BOX", (0, 0), (1, -1), 0.6, colors.black),
        ("BOX", (2, 0), (3, -1), 0.6, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 5),
    ]))
    return [judul, info, Spacer(1, 6 * mm)]


def _blok_ringkasan(hasil, styles):
    """Tiga kotak status: Zona A, Zona C, Status Akhir."""
    def kotak(label, status, besar=False):
        gaya = styles["status_besar"] if besar else styles["status"]
        return [Paragraph(label, styles["status_label"]), Paragraph(status or "-", gaya)]

    sel = [
        kotak("STATUS ZONA A", hasil.get("status_zone_a")),
        kotak("STATUS ZONA C", hasil.get("status_zone_c")),
        kotak("STATUS AKHIR", hasil.get("status"), besar=True),
    ]
    jarak = 4 * mm
    lebar_kotak = (LEBAR_ISI - 2 * jarak) / 3
    tabel = Table(
        [[sel[0], "", sel[1], "", sel[2]]],
        colWidths=[lebar_kotak, jarak, lebar_kotak, jarak, lebar_kotak],
    )
    gaya = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    for kolom, status in ((0, hasil.get("status_zone_a")), (2, hasil.get("status_zone_c")),
                          (4, hasil.get("status"))):
        gaya.append(("BACKGROUND", (kolom, 0), (kolom, 0), _warna_status(status)))

    tabel.setStyle(TableStyle(gaya))
    keterangan = (
        "Seluruh kriteria terpenuhi, komponen diterima (ACCEPT)."
        if hasil.get("status") == "ACCEPT"
        else "Melebihi batas toleransi, komponen ditolak (REJECT)."
    )
    return [
        _judul_bagian("1. Ringkasan Hasil", styles),
        tabel,
        Spacer(1, 2 * mm),
        Paragraph(keterangan, styles["catatan"]),
        Spacer(1, 6 * mm),
    ]


def _tabel_rapi(data, col_widths, rata_kanan_dari=1, baris_status=None):
    """Tabel standar laporan: header gelap, garis tipis, baris belang."""
    tabel = Table(data, colWidths=col_widths, repeatRows=1)
    gaya = [
        ("BACKGROUND", (0, 0), (-1, 0), WARNA_GELAP),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ALIGN", (rata_kanan_dari, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, WARNA_GARIS),
        ("BOX", (0, 0), (-1, -1), 0.6, WARNA_GELAP),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for r in range(2, len(data), 2):
        gaya.append(("BACKGROUND", (0, r), (-1, r), WARNA_ZEBRA))
    for r, c, status in baris_status or []:
        gaya += [
            ("TEXTCOLOR", (c, r), (c, r), _warna_status(status)),
            ("FONTNAME", (c, r), (c, r), "Helvetica-Bold"),
            ("ALIGN", (c, r), (c, r), "CENTER"),
        ]
    tabel.setStyle(TableStyle(gaya))
    return tabel


def _blok_perhitungan(hasil, styles):
    """Geometri + perbandingan Zona A vs Zona C dalam satu tabel."""
    geometri = _tabel_rapi(
        [
            ["Parameter Geometri", "Nilai"],
            ["Panjang Keliling (P)", _dengan_satuan(hasil.get("p_keliling"), "mm")],
            ["Luas Babbit Total", _dengan_satuan(hasil.get("a_babbit"), "mm²")],
        ],
        [LEBAR_ISI * 0.6, LEBAR_ISI * 0.4],
    )

    toleransi = hasil.get("toleransi_persen")
    batas_persen = "-" if toleransi is None else f"maks. {_angka(toleransi)} %"
    dimensi_a = hasil.get("dimensi_terbesar_zone_a")
    batas_dim_a = hasil.get("batas_dimensi_zone_a")
    luas_c = hasil.get("luas_terbesar_zone_c")
    batas_luas_c = hasil.get("batas_luas_zone_c")

    data = [
        ["Parameter", "Zona A", "Zona C"],
        ["Luas Zona", _dengan_satuan(hasil.get("a_zone_a"), "mm²"), _dengan_satuan(hasil.get("a_zone_c"), "mm²")],
        ["Total Unbond", _dengan_satuan(hasil.get("a_unbond_zone_a"), "mm²"),
         _dengan_satuan(hasil.get("a_unbond_zone_c"), "mm²")],
        ["Luas Bond", _dengan_satuan(hasil.get("a_bond_zone_a"), "mm²"),
         _dengan_satuan(hasil.get("a_bond_zone_c"), "mm²")],
        ["Persentase Unbond", _dengan_satuan(hasil.get("persen_unbond_zone_a"), "%"),
         _dengan_satuan(hasil.get("persen_unbond_zone_c"), "%")],
        ["Batas Toleransi Persentase", batas_persen, batas_persen],
        ["Status Persentase", hasil.get("status_persen_zone_a") or "-", hasil.get("status_persen_zone_c") or "-"],
        ["Indikasi Terbesar", _dengan_satuan(dimensi_a, "mm"), _dengan_satuan(luas_c, "mm²")],
        ["Batas Indikasi Individu",
         "-" if batas_dim_a is None else f"maks. {_angka(batas_dim_a)} mm",
         "-" if batas_luas_c is None else f"maks. {_angka(batas_luas_c)} mm²"],
        ["Status Indikasi Individu", hasil.get("status_dimensi_zone_a") or "-",
         hasil.get("status_luas_zone_c") or "-"],
        ["Status Zona", hasil.get("status_zone_a") or "-", hasil.get("status_zone_c") or "-"],
    ]
    baris_status = []
    for r in (6, 9, 10):
        baris_status += [(r, 1, data[r][1]), (r, 2, data[r][2])]
    zona = _tabel_rapi(data, [LEBAR_ISI * 0.4, LEBAR_ISI * 0.3, LEBAR_ISI * 0.3], baris_status=baris_status)

    return [
        KeepTogether([_judul_bagian("2. Perhitungan", styles), geometri]),
        Spacer(1, 3 * mm),
        KeepTogether(zona),
        Spacer(1, 6 * mm),
    ]


def _blok_mapping(mapping_tmp, gambar_filename, styles):
    if mapping_tmp:
        with PILImage.open(mapping_tmp) as im:
            iw, ih = im.size
        skala = min(LEBAR_ISI / iw, 100 * mm / ih)
        gambar = Table([[RLImage(mapping_tmp, width=iw * skala, height=ih * skala)]], colWidths=[LEBAR_ISI])
        gambar.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.6, WARNA_GARIS),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        isi = [gambar, Spacer(1, 1.5 * mm),
               Paragraph("Elips merah = posisi indikasi; angka di atas = panjang (mm), "
                         "angka di kiri = lebar (mm), angka di tengah = nomor indikasi.", styles["catatan"])]
    elif gambar_filename:
        isi = [Paragraph("File gambar teknik tidak ditemukan.", styles["catatan"])]
    else:
        isi = [Paragraph("Tidak ada gambar teknik untuk inspeksi ini.", styles["catatan"])]
    return [KeepTogether([_judul_bagian("3. Gambar Hasil Mapping", styles), *isi]), Spacer(1, 6 * mm)]


def _foto_bukti(bukti_path):
    if not bukti_path:
        return "-"
    src = os.path.join(IMAGES_DIR, os.path.basename(bukti_path))
    if not os.path.isfile(src):
        return "-"
    try:
        with PILImage.open(src) as im:
            iw, ih = im.size
    except OSError:
        return "-"
    skala = min(28 * mm / iw, 18 * mm / ih)
    return RLImage(src, width=iw * skala, height=ih * skala)


def _blok_indikasi(indikasi_list, styles):
    judul = _judul_bagian("4. Daftar Indikasi", styles)
    if not indikasi_list:
        return [judul, Paragraph("Tidak ada indikasi yang tercatat.", styles["catatan"]), Spacer(1, 6 * mm)]

    data = [["No", "Zona", "Panjang (mm)", "Lebar (mm)", "Luas (mm²)", "Foto Bukti"]]
    total_luas = {"A": 0.0, "C": 0.0}
    for i, ind in enumerate(indikasi_list, start=1):
        luas = ind["panjang_mm"] * ind["lebar_mm"]
        zona = ind.get("zona") or "-"
        if zona in total_luas:
            total_luas[zona] += luas
        data.append([
            str(i), zona, _angka(ind["panjang_mm"]), _angka(ind["lebar_mm"]), _angka(luas),
            _foto_bukti(ind.get("bukti_path")),
        ])

    lebar = [12 * mm, 16 * mm, 32 * mm, 32 * mm, 36 * mm, LEBAR_ISI - 128 * mm]
    tabel = _tabel_rapi(data, lebar, rata_kanan_dari=2)
    tabel.setStyle(TableStyle([
        ("ALIGN", (0, 1), (1, -1), "CENTER"),
        ("ALIGN", (5, 1), (5, -1), "CENTER"),
    ]))

    ringkas = (f"Jumlah indikasi: {len(indikasi_list)}  |  "
               f"Total luas Zona A: {_angka(total_luas['A'])} mm²  |  "
               f"Total luas Zona C: {_angka(total_luas['C'])} mm²")
    return [judul, tabel, Spacer(1, 1.5 * mm), Paragraph(ringkas, styles["catatan"]), Spacer(1, 8 * mm)]


def _blok_tanda_tangan(styles):
    """Kolom tanda tangan, sama dengan footer Excel (CHECKED BY / jabatan / nama)."""
    jarak = 8 * mm
    lebar_kotak = (LEBAR_ISI - 2 * jarak) / 3
    baris = [[], [], [], []]
    for judul, jabatan, nama in TANDA_TANGAN:
        for isi in (baris[0], baris[1], baris[2], baris[3]):
            if isi:
                isi.append("")
        baris[0].append(Paragraph(judul, styles["ttd"]))
        baris[1].append(Paragraph(jabatan, styles["ttd"]))
        baris[2].append("")
        baris[3].append(Paragraph(f"<u><b>{nama}</b></u>", styles["ttd"]))

    lebar = []
    for i in range(len(TANDA_TANGAN)):
        if i:
            lebar.append(jarak)
        lebar.append(lebar_kotak)

    tabel = Table(baris, colWidths=lebar, rowHeights=[None, None, 20 * mm, 9 * mm])
    gaya = [("VALIGN", (0, 0), (-1, -1), "MIDDLE")]
    for i in range(len(TANDA_TANGAN)):
        c = i * 2
        gaya += [
            ("BOX", (c, 0), (c, 1), 0.6, colors.black),
            ("BOX", (c, 2), (c, 2), 0.6, colors.black),
            ("BOX", (c, 3), (c, 3), 0.6, colors.black),
        ]
    tabel.setStyle(TableStyle(gaya))
    return [KeepTogether(tabel)]


def _buat_styles():
    styles = getSampleStyleSheet()
    dasar = dict(fontName="Helvetica", fontSize=9, leading=12)
    styles.add(ParagraphStyle("judul_laporan", fontName="Helvetica-Bold", fontSize=13,
                              leading=16, alignment=TA_CENTER))
    styles.add(ParagraphStyle("judul_bagian", fontName="Helvetica-Bold", fontSize=11, leading=14,
                              textColor=WARNA_GELAP, spaceAfter=3 * mm))
    styles.add(ParagraphStyle("label", **dasar))
    styles.add(ParagraphStyle("isi", **dasar))
    styles.add(ParagraphStyle("catatan", fontName="Helvetica-Oblique", fontSize=8, leading=10,
                              textColor=WARNA_ABU))
    styles.add(ParagraphStyle("status_label", fontName="Helvetica-Bold", fontSize=8, leading=10,
                              alignment=TA_CENTER, textColor=colors.white))
    styles.add(ParagraphStyle("status", fontName="Helvetica-Bold", fontSize=14, leading=17,
                              alignment=TA_CENTER, textColor=colors.white))
    styles.add(ParagraphStyle("status_besar", fontName="Helvetica-Bold", fontSize=17, leading=20,
                              alignment=TA_CENTER, textColor=colors.white))
    styles.add(ParagraphStyle("ttd", fontName="Helvetica", fontSize=9, leading=12, alignment=TA_CENTER))
    return styles


# ---------------------------------------------------------------------
# Gambar mapping (drawing + marker indikasi)
# ---------------------------------------------------------------------

def _font(ukuran: int):
    """Font default Pillow (tanpa file font eksternal)."""
    try:
        return ImageFont.load_default(size=ukuran)
    except TypeError:
        return ImageFont.load_default()


def _gambar_mapping(gambar_filename: str | None, indikasi_list: list) -> str | None:
    """
    Menggambar ulang drawing + marker elips merah (angka Panjang di atas,
    Lebar di kiri, nomor di tengah) seperti tampilan canvas frontend.
    Mengembalikan path file PNG sementara, atau None kalau drawing
    tidak tersedia. Koordinat posisi_x/posisi_y dalam persen 0-100,
    sama seperti yang disimpan frontend.
    """
    if not gambar_filename:
        return None
    src = os.path.join(IMAGES_DIR, os.path.basename(gambar_filename))
    if not os.path.isfile(src):
        return None

    img = PILImage.open(src).convert("RGB")
    w, h = img.size
    overlay = PILImage.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    draw = ImageDraw.Draw(img)

    # Elips lonjong 34:27 seperti marker frontend, proporsional thd gambar
    rx = max(14, int(w * 0.035))
    ry = max(11, int(rx * 27 / 34))
    garis = max(2, w // 400)
    fnum = _font(max(16, ry))
    flab = _font(max(14, int(ry * 0.8)))

    for i, ind in enumerate(indikasi_list, start=1):
        if ind.get("posisi_x") is None or ind.get("posisi_y") is None:
            continue
        cx = ind["posisi_x"] / 100 * w
        cy = ind["posisi_y"] / 100 * h
        odraw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(220, 38, 38, 60))
        draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(220, 38, 38), width=garis)
        draw.text((cx, cy), str(i), font=fnum, fill=(255, 255, 255), anchor="mm")

        # Label Panjang (nilai persis tersimpan) di sisi atas
        atas = str(ind["panjang_mm"])
        draw.text((cx, cy - ry - 4), atas, font=flab, fill=(185, 28, 28), anchor="ms",
                  stroke_width=2, stroke_fill=(255, 255, 255))
        # Label Lebar (nilai persis tersimpan) di sisi kiri
        kiri = str(ind["lebar_mm"])
        draw.text((cx - rx - 4, cy), kiri, font=flab, fill=(185, 28, 28), anchor="rm",
                  stroke_width=2, stroke_fill=(255, 255, 255))

    hasil = PILImage.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    fd, tmp = tempfile.mkstemp(suffix=".png", prefix="mapping_")
    os.close(fd)
    hasil.save(tmp)
    return tmp


# ---------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------

def generate_pdf_report(result_id: int, hasil: dict, indikasi_list: list,
                        gambar_filename: str | None = None, dicetak_oleh: str = "",
                        waktu_cetak: datetime | None = None) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"laporan_{result_id}.pdf")
    waktu_cetak = waktu_cetak or datetime.now()

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=KOP_ATAS + KOP_TINGGI + 6 * mm, bottomMargin=18 * mm,
        title=f"Laporan Hasil Inspeksi NDT #{result_id}", author=NAMA_SISTEM,
    )
    styles = _buat_styles()

    elements = []
    elements += _blok_judul_dan_info(result_id, hasil, dicetak_oleh, waktu_cetak, styles)
    elements += _blok_ringkasan(hasil, styles)
    elements += _blok_perhitungan(hasil, styles)

    mapping_tmp = _gambar_mapping(gambar_filename, indikasi_list)
    try:
        elements += _blok_mapping(mapping_tmp, gambar_filename, styles)
        elements += _blok_indikasi(indikasi_list, styles)
        elements += _blok_tanda_tangan(styles)

        class _Canvas(_CanvasBernomor):
            teks_kiri = (f"{NAMA_SISTEM} - Laporan Inspeksi #{result_id} - "
                         f"dicetak {format_tanggal_indo(waktu_cetak)}")

        doc.build(elements, onFirstPage=_gambar_kop, onLaterPages=_gambar_kop, canvasmaker=_Canvas)
        return path
    finally:
        if mapping_tmp and os.path.isfile(mapping_tmp):
            os.remove(mapping_tmp)
