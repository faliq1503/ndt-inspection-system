"""
core/calculations.py

Rumus-rumus perhitungan untuk sistem mapping otomatis hasil NDT
(Non-Destructive Testing) pada komponen mekanik (mis. Babbit/Bearing).

Alur perhitungan (sesuai catatan proyek):
1. Hitung keliling babbit (P) dari diameter (D)
2. Hitung luas total babbit (A Babbit)
3. Hitung luas Zone C (area setelah offset)
4. Hitung luas Zone A (selisih Babbit - Zone C)
5. Hitung total luas indikasi/cacat (Unbond)
6. Hitung luas Bond (area yang masih baik)
7. Hitung persentase Unbond
"""

import math
from typing import List, Tuple


def hitung_keliling_babbit(diameter_mm: float) -> float:
    """
    Menghitung setengah keliling (P) dari diameter babbit/bearing.

    Rumus: P = (pi x D) / 2

    Contoh dari catatan:
        D = 360 mm -> P = 565.2 mm
    """
    return (math.pi * diameter_mm) / 2


def hitung_luas_babbit(panjang_p_mm: float, lebar_l_mm: float) -> float:
    """
    Menghitung luas total permukaan babbit.

    Rumus: A_babbit = P x L

    Contoh dari catatan:
        P = 565.2 mm, L = 200 mm -> A_babbit = 113040 mm^2
    """
    return panjang_p_mm * lebar_l_mm


def hitung_luas_zone_c(panjang_p_mm: float, lebar_l_mm: float, offset_x_mm: float = 50) -> float:
    """
    Menghitung luas Zone C, yaitu area babbit setelah dikurangi offset
    di sisi tepi (biasanya area tepi tidak dihitung kritis).

    Rumus: Ac = (P - x) x (L - x)

    offset_x_mm sebaiknya diambil dari data 'standard' yang dipakai
    (default 50mm sesuai contoh di catatan, tapi bisa berbeda per standar).

    Contoh dari catatan:
        P = 565.2, L = 200, x = 50 -> Ac = 77280 mm^2
    """
    return (panjang_p_mm - offset_x_mm) * (lebar_l_mm - offset_x_mm)


def hitung_luas_zone_a(a_babbit_mm2: float, a_zone_c_mm2: float) -> float:
    """
    Menghitung luas Zone A, yaitu selisih antara luas babbit total
    dengan luas Zone C (area tepi yang tidak masuk zona kritis).

    Rumus: A_zoneA = A_babbit - Ac

    Contoh dari catatan:
        113040 - 77280 = 35760 mm^2
    """
    return a_babbit_mm2 - a_zone_c_mm2


def hitung_luas_indikasi_total(daftar_indikasi: List[Tuple[float, float]]) -> float:
    """
    Menghitung total luas seluruh indikasi/cacat (area unbond) yang
    ditemukan pada satu komponen.

    daftar_indikasi: list berisi tuple (panjang_mm, lebar_mm) untuk
    setiap indikasi/cacat yang terdeteksi.

    Rumus: A_unbond_total = sigma (Pi x Li)

    Contoh dari catatan (5 indikasi):
        C1 = 300, C2 = 300, C3 = 100, C4 = 100, C5 = 300
        Total = 1100 mm^2
    """
    total = 0.0
    for panjang_indikasi, lebar_indikasi in daftar_indikasi:
        total += panjang_indikasi * lebar_indikasi
    return total


def hitung_luas_bond(a_zone_mm2: float, a_unbond_total_mm2: float) -> float:
    """
    Menghitung luas Bond, yaitu area yang masih baik/menempel
    (bukan bagian dari indikasi/cacat).

    Rumus: A_bond = A_zone - A_unbond

    A_zone yang dipakai di sini mengikuti contoh catatan, yaitu
    luas Zone C (Ac), bukan Zone A. Sesuaikan lagi kalau ternyata
    yang dimaksud berbeda.

    Contoh dari catatan:
        77280 - 1100 = 76180 mm^2
    """
    return a_zone_mm2 - a_unbond_total_mm2


def hitung_persentase_unbond(a_unbond_total_mm2: float, a_bond_mm2: float) -> float:
    """
    Menghitung persentase area unbond terhadap luas bond.

    Rumus: % = (A_unbond / A_bond) x 100%

    Contoh dari catatan:
        (1100 / 76180) x 100 = 1.44 %
    """
    if a_bond_mm2 == 0:
        raise ValueError("A_bond tidak boleh 0 (pembagian dengan nol).")
    return (a_unbond_total_mm2 / a_bond_mm2) * 100


# ---------------------------------------------------------------------
# Fungsi pembungkus: menjalankan seluruh alur perhitungan sekaligus
# ---------------------------------------------------------------------

def hitung_semua(
    diameter_mm: float,
    lebar_l_mm: float,
    daftar_indikasi: List[Tuple[float, float]],
    offset_x_mm: float = 50,
) -> dict:
    """
    Menjalankan seluruh alur perhitungan sekaligus, dari diameter
    sampai hasil akhir persentase unbond.

    Return berupa dict berisi semua nilai antara, supaya bisa
    ditampilkan di tabel hasil / disimpan ke database / dicetak
    ke laporan.
    """
    p = hitung_keliling_babbit(diameter_mm)
    a_babbit = hitung_luas_babbit(p, lebar_l_mm)
    a_zone_c = hitung_luas_zone_c(p, lebar_l_mm, offset_x_mm)
    a_zone_a = hitung_luas_zone_a(a_babbit, a_zone_c)
    a_unbond_total = hitung_luas_indikasi_total(daftar_indikasi)
    a_bond = hitung_luas_bond(a_zone_c, a_unbond_total)
    persen_unbond = hitung_persentase_unbond(a_unbond_total, a_bond)

    return {
        "P (keliling)": round(p, 2),
        "A_babbit": round(a_babbit, 2),
        "A_zone_c": round(a_zone_c, 2),
        "A_zone_a": round(a_zone_a, 2),
        "A_unbond_total": round(a_unbond_total, 2),
        "A_bond": round(a_bond, 2),
        "persen_unbond": round(persen_unbond, 2),
    }


# ---------------------------------------------------------------------
# Contoh pemakaian / self-test -> jalankan file ini langsung untuk cek
# ---------------------------------------------------------------------

if __name__ == "__main__":
    hasil = hitung_semua(
        diameter_mm=360,
        lebar_l_mm=200,
        daftar_indikasi=[(15, 20), (15, 20), (10, 10), (10, 10), (15, 20)],
        offset_x_mm=50,
    )
    for key, value in hasil.items():
        print(f"{key}: {value}")