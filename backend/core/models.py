"""
core/models.py

Struktur data (model) yang dipakai di seluruh sistem:
- Standard   : data standar/toleransi yang dipakai untuk evaluasi
- Component  : data komponen/benda yang diperiksa (mis. Bearing/Babbit)
- Indication : data satu indikasi/cacat yang ditemukan pada komponen
- EvaluationResult : hasil akhir setelah dihitung & dievaluasi

Menggunakan dataclass supaya ringan, gampang dibaca, dan gampang
dikonversi ke/dari database maupun tampilan Streamlit.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Standard:
    """
    Data satu standar/acuan toleransi yang dipakai untuk evaluasi.

    offset_x_mm       : offset tepi (dipakai di rumus Zone C)
    toleransi_persen  : batas maksimum % unbond yang masih dianggap Accept
    """
    id: Optional[int] = None
    nama_standard: str = ""
    offset_x_mm: float = 50.0
    toleransi_persen: float = 5.0
    keterangan: str = ""


@dataclass
class Indication:
    """
    Data satu indikasi/cacat (area unbond) yang ditemukan pada komponen.

    panjang_mm, lebar_mm : ukuran indikasi hasil pengukuran langsung
    posisi_x, posisi_y   : koordinat pada gambar mapping 2D (opsional,
                            diisi kalau sudah masuk tahap mapping visual)
    """
    id: Optional[int] = None
    component_id: Optional[int] = None
    panjang_mm: float = 0.0
    lebar_mm: float = 0.0
    posisi_x: Optional[float] = None
    posisi_y: Optional[float] = None

    @property
    def luas_mm2(self) -> float:
        return self.panjang_mm * self.lebar_mm


@dataclass
class Component:
    """
    Data satu komponen/benda yang diperiksa (mis. satu unit Bearing).
    """
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
    Hasil akhir perhitungan & evaluasi untuk satu komponen.
    Field ini yang nantinya ditampilkan di tabel hasil dan laporan.
    """
    component_id: Optional[int] = None
    p_keliling: float = 0.0
    a_babbit: float = 0.0
    a_zone_c: float = 0.0
    a_zone_a: float = 0.0
    a_unbond_total: float = 0.0
    a_bond: float = 0.0
    persen_unbond: float = 0.0
    status: str = ""  # "ACCEPT" atau "REJECT"