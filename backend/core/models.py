"""
core/models.py

Struktur data (model) yang dipakai di seluruh sistem, mengikuti
standar DOD-STD-2183 (SH) dengan evaluasi Zone A & Zone C terpisah.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Standard:
    """
    Data satu standar/acuan toleransi yang dipakai untuk evaluasi.

    lebar_zona_a_mm         : lebar pita Zone A di satu sisi. Offset yang
                               dipakai di rumus Zone C = lebar_zona_a_mm x 2
    toleransi_persen        : batas maksimum % unbond (berlaku utk Zone A & C)
    individu_zona_a_mm      : batas dimensi terbesar 1 indikasi di Zone A
    individu_zona_c_persen  : batas luas 1 indikasi di Zone C (% dari total babbit)
    individu_zona_c_max_mm2 : batas luas 1 indikasi di Zone C (nilai mutlak mm²)
                               -> dipakai yang lebih KECIL antara dua batas ini
    """
    id: Optional[int] = None
    nama_standard: str = ""
    lebar_zona_a_mm: float = 25.0
    toleransi_persen: float = 15.0
    individu_zona_a_mm: float = 12.5
    individu_zona_c_persen: float = 3.0
    individu_zona_c_max_mm2: float = 650.0
    keterangan: str = ""


@dataclass
class Indication:
    """
    Data satu indikasi/cacat (area unbond) yang ditemukan pada komponen.

    zona          : "A" atau "C" - menentukan indikasi ini dihitung
                    masuk ke evaluasi Zone A atau Zone C
    """
    id: Optional[int] = None
    component_id: Optional[int] = None
    zona: str = "C"
    panjang_mm: float = 0.0
    lebar_mm: float = 0.0
    posisi_x: Optional[float] = None
    posisi_y: Optional[float] = None

    @property
    def luas_mm2(self) -> float:
        return self.panjang_mm * self.lebar_mm


@dataclass
class Component:
    """Data satu komponen/benda yang diperiksa (mis. satu unit Bearing)."""
    id: Optional[int] = None
    jenis_benda: str = ""
    diameter_mm: float = 0.0
    panjang_l_mm: float = 0.0
    zona: str = ""
    standard_id: Optional[int] = None
    indikasi_list: List[Indication] = field(default_factory=list)


@dataclass
class EvaluationResult:
    """
    Hasil akhir perhitungan & evaluasi untuk satu komponen, dengan
    Zone A dan Zone C dievaluasi terpisah.
    """
    component_id: Optional[int] = None
    p_keliling: float = 0.0
    a_babbit: float = 0.0
    a_zone_c: float = 0.0
    a_zone_a: float = 0.0

    a_unbond_zone_a: float = 0.0
    a_bond_zone_a: float = 0.0
    persen_unbond_zone_a: float = 0.0
    status_zone_a: str = ""

    a_unbond_zone_c: float = 0.0
    a_bond_zone_c: float = 0.0
    persen_unbond_zone_c: float = 0.0
    status_zone_c: str = ""

    status: str = ""  # status akhir gabungan: "ACCEPT" atau "REJECT"