"""
core/calculations.py

Rumus-rumus perhitungan untuk sistem mapping otomatis hasil NDT
(Non-Destructive Testing) pada komponen mekanik (mis. Babbit/Bearing),
mengikuti standar DOD-STD-2183 (SH).

Konsep penting: Zone A dan Zone C dihitung dan dievaluasi TERPISAH,
masing-masing punya total unbond, luas bond, persentase, dan status
sendiri-sendiri. Status akhir komponen = REJECT kalau salah satu zona
REJECT.

Alur perhitungan:
1. Hitung keliling babbit (P) dari diameter (D)
2. Hitung luas total babbit (A Babbit) = P x L
3. Hitung luas Zone C = (P - offset) x (L - offset), offset = lebar_zona_a x 2
4. Hitung luas Zone A = A Babbit - Zone C
5. Jumlahkan indikasi yang berada di Zone A, dan terpisah yang di Zone C
6. Hitung luas bond & persentase unbond MASING-MASING zona
"""

import math
from typing import List, Tuple


def hitung_keliling_babbit(diameter_mm: float) -> float:
    """P = (pi x D) / 2"""
    return (math.pi * diameter_mm) / 2


def hitung_luas_babbit(panjang_p_mm: float, lebar_l_mm: float) -> float:
    """A_babbit = P x L"""
    return panjang_p_mm * lebar_l_mm


def hitung_luas_zone_c(panjang_p_mm: float, lebar_l_mm: float, lebar_zona_a_mm: float) -> float:
    """
    Menghitung luas Zone C.

    offset = lebar_zona_a_mm x 2 (karena Zone A ada di KEDUA sisi/ujung)
    Ac = (P - offset) x (L - offset)
    """
    offset = lebar_zona_a_mm * 2
    return (panjang_p_mm - offset) * (lebar_l_mm - offset)


def hitung_luas_zone_a(a_babbit_mm2: float, a_zone_c_mm2: float) -> float:
    """A_zoneA = A_babbit - Ac (Zone A adalah SISA setelah Zone C dihitung)"""
    return a_babbit_mm2 - a_zone_c_mm2


def hitung_luas_indikasi_total(daftar_indikasi: List[Tuple[float, float]]) -> float:
    """Total luas = sigma (Pi x Li) untuk satu daftar indikasi."""
    total = 0.0
    for panjang_indikasi, lebar_indikasi in daftar_indikasi:
        total += panjang_indikasi * lebar_indikasi
    return total


def hitung_luas_bond(a_zone_mm2: float, a_unbond_total_mm2: float) -> float:
    """A_bond = A_zone - A_unbond"""
    return a_zone_mm2 - a_unbond_total_mm2


def hitung_persentase_unbond(a_unbond_total_mm2: float, a_bond_mm2: float) -> float:
    """% = (A_unbond / A_bond) x 100%"""
    if a_bond_mm2 == 0:
        return 0.0
    return (a_unbond_total_mm2 / a_bond_mm2) * 100


def cari_indikasi_terbesar_dimensi(daftar_indikasi: List[Tuple[float, float]]) -> float:
    """
    Untuk Zone A: cari dimensi terbesar (panjang ATAU lebar, mana yang
    lebih besar) di antara SATU indikasi, lalu ambil yang paling besar
    dari semua indikasi. Dipakai untuk cek aturan "maks 12.5mm".
    """
    if not daftar_indikasi:
        return 0.0
    return max(max(p, l) for p, l in daftar_indikasi)


def cari_indikasi_terbesar_luas(daftar_indikasi: List[Tuple[float, float]]) -> float:
    """
    Untuk Zone C: cari luas (panjang x lebar) terbesar di antara semua
    indikasi. Dipakai untuk cek aturan "maks 3% total babbit atau 650mm²".
    """
    if not daftar_indikasi:
        return 0.0
    return max(p * l for p, l in daftar_indikasi)


# ---------------------------------------------------------------------
# Fungsi pembungkus: menjalankan seluruh alur perhitungan sekaligus
# ---------------------------------------------------------------------

def hitung_semua(
    diameter_mm: float,
    lebar_l_mm: float,
    indikasi_zone_a: List[Tuple[float, float]],
    indikasi_zone_c: List[Tuple[float, float]],
    lebar_zona_a_mm: float,
) -> dict:
    """
    Menjalankan seluruh alur perhitungan, dengan Zone A dan Zone C
    dihitung terpisah.
    """
    p = hitung_keliling_babbit(diameter_mm)
    a_babbit = hitung_luas_babbit(p, lebar_l_mm)
    a_zone_c = hitung_luas_zone_c(p, lebar_l_mm, lebar_zona_a_mm)
    a_zone_a = hitung_luas_zone_a(a_babbit, a_zone_c)

    # --- Zone A ---
    a_unbond_zone_a = hitung_luas_indikasi_total(indikasi_zone_a)
    a_bond_zone_a = hitung_luas_bond(a_zone_a, a_unbond_zone_a)
    persen_unbond_zone_a = hitung_persentase_unbond(a_unbond_zone_a, a_bond_zone_a)
    dimensi_terbesar_zone_a = cari_indikasi_terbesar_dimensi(indikasi_zone_a)

    # --- Zone C ---
    a_unbond_zone_c = hitung_luas_indikasi_total(indikasi_zone_c)
    a_bond_zone_c = hitung_luas_bond(a_zone_c, a_unbond_zone_c)
    persen_unbond_zone_c = hitung_persentase_unbond(a_unbond_zone_c, a_bond_zone_c)
    luas_terbesar_zone_c = cari_indikasi_terbesar_luas(indikasi_zone_c)

    return {
        "p_keliling": round(p, 2),
        "a_babbit": round(a_babbit, 2),
        "a_zone_c": round(a_zone_c, 2),
        "a_zone_a": round(a_zone_a, 2),

        "a_unbond_zone_a": round(a_unbond_zone_a, 2),
        "a_bond_zone_a": round(a_bond_zone_a, 2),
        "persen_unbond_zone_a": round(persen_unbond_zone_a, 2),
        "dimensi_terbesar_zone_a": round(dimensi_terbesar_zone_a, 2),

        "a_unbond_zone_c": round(a_unbond_zone_c, 2),
        "a_bond_zone_c": round(a_bond_zone_c, 2),
        "persen_unbond_zone_c": round(persen_unbond_zone_c, 2),
        "luas_terbesar_zone_c": round(luas_terbesar_zone_c, 2),
    }


# ---------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------

if __name__ == "__main__":
    # Contoh dari sheet "PAD Bearing PLTU GRATI": D=150 (sudah P langsung
    # di sheet itu, tapi di sini kita pakai P hasil hitung dari diameter
    # supaya konsisten dengan sistem kita)
    hasil = hitung_semua(
        diameter_mm=360,
        lebar_l_mm=101,
        indikasi_zone_a=[(10, 101), (10, 101), (10, 70)],
        indikasi_zone_c=[],
        lebar_zona_a_mm=10,
    )
    for key, value in hasil.items():
        print(f"{key}: {value}")