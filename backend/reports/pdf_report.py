"""
reports/pdf_report.py

Membuat file laporan PDF untuk satu hasil evaluasi NDT, dengan
Zone A dan Zone C ditampilkan terpisah.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports")


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


def generate_pdf_report(result_id: int, hasil: dict, indikasi_list: list) -> str:
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
        ["Diameter", f'{hasil.get("diameter_mm", "-")} mm'],
        ["Zona", hasil.get("zona", "-")],
        ["ID Hasil", f'#{result_id}'],
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