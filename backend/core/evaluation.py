"""
core/evaluation.py

Logic evaluasi Accept/Reject berdasarkan hasil perhitungan dan
toleransi dari standard yang dipakai.

Aturan default (bisa dikembangkan lagi nanti kalau ada kriteria
tambahan dari QC, misal batas ukuran indikasi tunggal terbesar):

    persen_unbond <= toleransi_persen  -> ACCEPT
    persen_unbond >  toleransi_persen  -> REJECT
"""

from core.calculations import hitung_semua
from core.models import Standard, EvaluationResult


def evaluasi_komponen(
    component_id: int,
    diameter_mm: float,
    lebar_l_mm: float,
    daftar_indikasi: list,
    standard: Standard,
) -> EvaluationResult:
    """
    Menjalankan seluruh perhitungan untuk satu komponen, lalu
    menentukan status ACCEPT/REJECT berdasarkan toleransi dari
    standard yang dipakai.

    daftar_indikasi: list of tuple (panjang_mm, lebar_mm)
    standard: objek Standard yang berisi offset_x_mm & toleransi_persen
    """
    hasil = hitung_semua(
        diameter_mm=diameter_mm,
        lebar_l_mm=lebar_l_mm,
        daftar_indikasi=daftar_indikasi,
        offset_x_mm=standard.offset_x_mm,
    )

    status = "ACCEPT" if hasil["persen_unbond"] <= standard.toleransi_persen else "REJECT"

    return EvaluationResult(
        component_id=component_id,
        p_keliling=hasil["P (keliling)"],
        a_babbit=hasil["A_babbit"],
        a_zone_c=hasil["A_zone_c"],
        a_zone_a=hasil["A_zone_a"],
        a_unbond_total=hasil["A_unbond_total"],
        a_bond=hasil["A_bond"],
        persen_unbond=hasil["persen_unbond"],
        status=status,
    )


# ---------------------------------------------------------------------
# Self-test -> jalankan file ini langsung untuk cek
# ---------------------------------------------------------------------

if __name__ == "__main__":
    contoh_standard = Standard(
        id=1,
        nama_standard="Internal QC v1",
        offset_x_mm=50,
        toleransi_persen=5.0,
    )

    hasil_eval = evaluasi_komponen(
        component_id=1,
        diameter_mm=360,
        lebar_l_mm=200,
        daftar_indikasi=[(15, 20), (15, 20), (10, 10), (10, 10), (15, 20)],
        standard=contoh_standard,
    )

    print(hasil_eval)