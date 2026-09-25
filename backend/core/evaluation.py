"""
core/evaluation.py

Logic evaluasi Accept/Reject berdasarkan DOD-STD-2183 (SH):
- Zone A dan Zone C dievaluasi TERPISAH, masing-masing dengan aturannya
  sendiri.
- Status akhir komponen = REJECT kalau salah satu zona REJECT.

Aturan Zone A:
    a. persen_unbond_zone_a <= toleransi_persen
    b. TIDAK ADA indikasi individual dengan dimensi terbesar > individu_zona_a_mm
    -> REJECT kalau salah satu dilanggar

Aturan Zone C:
    a. persen_unbond_zone_c <= toleransi_persen
    b. TIDAK ADA indikasi individual dengan luas > MIN(individu_zona_c_persen% dari
       total babbit, individu_zona_c_max_mm2)
    -> REJECT kalau salah satu dilanggar
"""

from core.calculations import hitung_semua
from core.models import Standard, EvaluationResult


def evaluasi_komponen(
    component_id: int,
    diameter_mm: float,
    lebar_l_mm: float,
    indikasi_zone_a: list,
    indikasi_zone_c: list,
    standard: Standard,
) -> EvaluationResult:
    hasil = hitung_semua(
        diameter_mm=diameter_mm,
        lebar_l_mm=lebar_l_mm,
        indikasi_zone_a=indikasi_zone_a,
        indikasi_zone_c=indikasi_zone_c,
        lebar_zona_a_mm=standard.lebar_zona_a_mm,
    )

    # --- Evaluasi Zone A ---
    zone_a_persen_ok = hasil["persen_unbond_zone_a"] <= standard.toleransi_persen
    zone_a_dimensi_ok = hasil["dimensi_terbesar_zone_a"] <= standard.individu_zona_a_mm
    status_zone_a = "ACCEPT" if (zone_a_persen_ok and zone_a_dimensi_ok) else "REJECT"

    # --- Evaluasi Zone C ---
    batas_luas_zone_c = min(
        standard.individu_zona_c_persen / 100 * hasil["a_babbit"],
        standard.individu_zona_c_max_mm2,
    )
    zone_c_persen_ok = hasil["persen_unbond_zone_c"] <= standard.toleransi_persen
    zone_c_luas_ok = hasil["luas_terbesar_zone_c"] <= batas_luas_zone_c
    status_zone_c = "ACCEPT" if (zone_c_persen_ok and zone_c_luas_ok) else "REJECT"

    # --- Status akhir ---
    status = "ACCEPT" if (status_zone_a == "ACCEPT" and status_zone_c == "ACCEPT") else "REJECT"

    return EvaluationResult(
        component_id=component_id,
        p_keliling=hasil["p_keliling"],
        a_babbit=hasil["a_babbit"],
        a_zone_c=hasil["a_zone_c"],
        a_zone_a=hasil["a_zone_a"],

        a_unbond_zone_a=hasil["a_unbond_zone_a"],
        a_bond_zone_a=hasil["a_bond_zone_a"],
        persen_unbond_zone_a=hasil["persen_unbond_zone_a"],
        status_zone_a=status_zone_a,

        a_unbond_zone_c=hasil["a_unbond_zone_c"],
        a_bond_zone_c=hasil["a_bond_zone_c"],
        persen_unbond_zone_c=hasil["persen_unbond_zone_c"],
        status_zone_c=status_zone_c,

        status=status,
    )


# ---------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------

if __name__ == "__main__":
    contoh_standard = Standard(
        id=1,
        nama_standard="DOD-STD-2183 (SH)",
        lebar_zona_a_mm=10,
        toleransi_persen=15.0,
        individu_zona_a_mm=12.5,
        individu_zona_c_persen=3.0,
        individu_zona_c_max_mm2=650.0,
    )

    hasil_eval = evaluasi_komponen(
        component_id=1,
        diameter_mm=360,
        lebar_l_mm=101,
        indikasi_zone_a=[(10, 101), (10, 101), (10, 70)],
        indikasi_zone_c=[],
        standard=contoh_standard,
    )

    print(hasil_eval)