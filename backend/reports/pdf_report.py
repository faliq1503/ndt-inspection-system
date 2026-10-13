"""
reports/pdf_report.py

Membuat file laporan PDF untuk satu hasil evaluasi NDT, dengan
Zone A dan Zone C ditampilkan terpisah.
"""

import os
import tempfile
from PIL import Image as PILImage, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus import Image as RLImage

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports")
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "images")


def _tabel_zona(judul, prefix, hasil, styles):
    elements = [Paragraph(judul, styles["Heading2"])]
    data = [
        ["Parameter", "Nilai"],
        ["Total Unbond", f'{hasil[f"a_unbond_{prefix}"]} mm2'],
        ["Luas Bond", f'{hasil[f"a_bond_{prefix}"]} mm2'],
        ["Persentase Unbond", f'{hasil[f"persen_unbond_{prefix}"]} %'],
        ["Status", hasil[f"status_{prefix}"]],
    ]
    table = Table(data, colWidths=[80 * mm, 70 * mm])
    status_color = colors.green if hasil[f"status_{prefix}"] == "ACCEPT" else colors.red
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("TEXTCOLOR", (1, 4), (1, 4), status_color),
        ("FONTNAME", (1, 4), (1, 4), "Helvetica-Bold"),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))
    return elements


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


def generate_pdf_report(result_id: int, hasil: dict, indikasi_list: list,
                         gambar_filename: str | None = None) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"laporan_{result_id}.pdf")

    doc = SimpleDocTemplate(path, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Laporan Hasil NDT Mapping", styles["Title"]))
    elements.append(Paragraph("Standar: DOD-STD-2183 (SH)", styles["Normal"]))
    elements.append(Spacer(1, 6 * mm))

    info_data = [
        ["Jenis Benda", hasil.get("jenis_benda", "-")],
        ["Diameter", f'{hasil["diameter_mm"]} mm' if hasil.get("diameter_mm") else "- (P diisi langsung)"],
        ["Panjang (P)", f'{hasil["p_keliling"]} mm'],
        ["Zona", hasil.get("zona", "-")],
        ["ID Hasil", f'#{result_id}'],
        ["Inspector", hasil.get("inspector") or "-"],
        ["Luas Babbit Total", f'{hasil["a_babbit"]} mm2'],
        ["Luas Zone A", f'{hasil["a_zone_a"]} mm2'],
        ["Luas Zone C", f'{hasil["a_zone_c"]} mm2'],
    ]
    info_table = Table(info_data, colWidths=[50 * mm, 100 * mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8 * mm))

    elements.extend(_tabel_zona("Hasil Zone A", "zone_a", hasil, styles))
    elements.extend(_tabel_zona("Hasil Zone C", "zone_c", hasil, styles))

    status = hasil["status"]
    status_color = colors.green if status == "ACCEPT" else colors.red
    status_style = styles["Heading1"].clone("status")
    status_style.textColor = status_color
    elements.append(Paragraph(f"Status Akhir: {status}", status_style))
    elements.append(Spacer(1, 8 * mm))

    mapping_tmp = _gambar_mapping(gambar_filename, indikasi_list)
    try:
        if mapping_tmp:
            elements.append(Paragraph("Gambar Hasil Mapping", styles["Heading2"]))
            with PILImage.open(mapping_tmp) as im:
                iw, ih = im.size
            max_w, max_h = 150 * mm, 95 * mm
            skala = min(max_w / iw, max_h / ih)
            elements.append(RLImage(mapping_tmp, width=iw * skala, height=ih * skala))
            elements.append(Spacer(1, 6 * mm))
        elif gambar_filename:
            elements.append(Paragraph("Gambar Hasil Mapping: file drawing tidak ditemukan.", styles["Normal"]))
            elements.append(Spacer(1, 6 * mm))

        if indikasi_list:
            elements.append(Paragraph("Daftar Indikasi / Cacat", styles["Heading2"]))
            indikasi_data = [["No", "Zona", "Panjang (mm)", "Lebar (mm)", "Luas (mm2)"]]
            for i, ind in enumerate(indikasi_list, start=1):
                luas = ind["panjang_mm"] * ind["lebar_mm"]
                indikasi_data.append([
                    str(i), ind.get("zona", "-"), str(ind["panjang_mm"]), str(ind["lebar_mm"]), str(luas)
                ])

            indikasi_table = Table(indikasi_data, colWidths=[15 * mm, 20 * mm, 40 * mm, 40 * mm, 35 * mm])
            indikasi_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(indikasi_table)

        doc.build(elements)
        return path
    finally:
        if mapping_tmp and os.path.isfile(mapping_tmp):
            os.remove(mapping_tmp)