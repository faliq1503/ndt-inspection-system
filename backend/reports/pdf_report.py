"""
reports/pdf_report.py

Membuat file laporan PDF untuk satu hasil evaluasi NDT.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "reports")


def generate_pdf_report(result_id: int, hasil: dict, indikasi_list: list) -> str:
    """
    hasil: dict hasil query dari ambil_hasil_by_id() (gabungan evaluation_result + component)
    indikasi_list: list of dict dari ambil_indikasi_by_component()

    Return: path lengkap ke file PDF yang dibuat.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"laporan_{result_id}.pdf")

    doc = SimpleDocTemplate(path, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Laporan Hasil NDT Mapping", styles["Title"]))
    elements.append(Spacer(1, 6 * mm))

    # --- Info komponen ---
    info_data = [
        ["Jenis Benda", hasil.get("jenis_benda", "-")],
        ["Diameter", f'{hasil.get("diameter_mm", "-")} mm'],
        ["Zona", hasil.get("zona", "-")],
        ["ID Hasil", f'#{result_id}'],
    ]
    info_table = Table(info_data, colWidths=[50 * mm, 100 * mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8 * mm))

    # --- Hasil perhitungan ---
    elements.append(Paragraph("Hasil Perhitungan", styles["Heading2"]))
    calc_data = [
        ["Parameter", "Nilai"],
        ["Keliling (P)", f'{hasil["p_keliling"]} mm'],
        ["Luas Babbit", f'{hasil["a_babbit"]} mm2'],
        ["Luas Zone C", f'{hasil["a_zone_c"]} mm2'],
        ["Luas Zone A", f'{hasil["a_zone_a"]} mm2'],
        ["Total Luas Unbond", f'{hasil["a_unbond_total"]} mm2'],
        ["Luas Bond", f'{hasil["a_bond"]} mm2'],
        ["Persentase Unbond", f'{hasil["persen_unbond"]} %'],
    ]
    calc_table = Table(calc_data, colWidths=[80 * mm, 70 * mm])
    calc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(calc_table)
    elements.append(Spacer(1, 8 * mm))

    # --- Status Accept/Reject ---
    status = hasil["status"]
    status_color = colors.green if status == "ACCEPT" else colors.red
    status_style = styles["Heading1"].clone("status")
    status_style.textColor = status_color
    elements.append(Paragraph(f"Status: {status}", status_style))
    elements.append(Spacer(1, 8 * mm))

    # --- Daftar indikasi ---
    if indikasi_list:
        elements.append(Paragraph("Daftar Indikasi / Cacat", styles["Heading2"]))
        indikasi_data = [["No", "Panjang (mm)", "Lebar (mm)", "Luas (mm2)"]]
        for i, ind in enumerate(indikasi_list, start=1):
            luas = ind["panjang_mm"] * ind["lebar_mm"]
            indikasi_data.append([str(i), str(ind["panjang_mm"]), str(ind["lebar_mm"]), str(luas)])

        indikasi_table = Table(indikasi_data, colWidths=[20 * mm, 45 * mm, 45 * mm, 40 * mm])
        indikasi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(indikasi_table)

    doc.build(elements)
    return path