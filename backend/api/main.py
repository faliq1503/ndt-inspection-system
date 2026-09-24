"""
backend/api/main.py

FastAPI app yang menjadi jembatan antara frontend (React) dan
logic Python yang sudah dibuat di core/ dan db/.

Cara jalankan (dari folder backend):
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

--host 0.0.0.0 supaya bisa diakses dari komputer lain di jaringan
kantor yang sama, bukan cuma dari komputer ini.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

from core.evaluation import evaluasi_komponen
from core.models import Standard
from db.database import (
    init_db,
    tambah_standard,
    ambil_semua_standard,
    tambah_component,
    tambah_indikasi,
    ambil_indikasi_by_component,
    simpan_evaluation_result,
    ambil_semua_hasil,
    ambil_hasil_by_id,
)
from reports.pdf_report import generate_pdf_report
from reports.excel_report import generate_excel_riwayat

app = FastAPI(title="NDT Mapping API")

# CORS: mengizinkan React (yang jalan di port berbeda, mis. 5173)
# untuk memanggil API ini. Untuk pemakaian internal kantor, "*"
# cukup aman; kalau nanti dipublikasikan ke internet, sebaiknya
# dibatasi ke domain/IP tertentu saja.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------
# Schema request (bentuk data yang dikirim dari React)
# ---------------------------------------------------------------------

class StandardIn(BaseModel):
    nama_standard: str
    offset_x_mm: float = 50.0
    toleransi_persen: float = 5.0
    keterangan: str = ""


class IndikasiIn(BaseModel):
    panjang_mm: float
    lebar_mm: float
    posisi_x: Optional[float] = None
    posisi_y: Optional[float] = None


class EvaluasiIn(BaseModel):
    jenis_benda: str
    diameter_mm: float
    panjang_l_mm: float
    zona: str
    standard_id: int
    daftar_indikasi: List[IndikasiIn]


# ---------------------------------------------------------------------
# Endpoint: Standard
# ---------------------------------------------------------------------

@app.get("/standards")
def get_standards():
    return ambil_semua_standard()


@app.post("/standards")
def create_standard(data: StandardIn):
    new_id = tambah_standard(
        data.nama_standard, data.offset_x_mm, data.toleransi_persen, data.keterangan
    )
    return {"id": new_id, **data.dict()}


# ---------------------------------------------------------------------
# Endpoint: Evaluasi (inti dari sistem)
# ---------------------------------------------------------------------

@app.post("/evaluate")
def evaluate(data: EvaluasiIn):
    # ambil data standard yang dipilih
    semua_standard = ambil_semua_standard()
    std_dict = next((s for s in semua_standard if s["id"] == data.standard_id), None)
    if std_dict is None:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan")

    standard = Standard(
        id=std_dict["id"],
        nama_standard=std_dict["nama_standard"],
        offset_x_mm=std_dict["offset_x_mm"],
        toleransi_persen=std_dict["toleransi_persen"],
    )

    # simpan component dulu supaya dapat id
    component_id = tambah_component(
        jenis_benda=data.jenis_benda,
        diameter_mm=data.diameter_mm,
        panjang_l_mm=data.panjang_l_mm,
        zona=data.zona,
        standard_id=data.standard_id,
    )

    # simpan tiap indikasi
    daftar_tuple = []
    for ind in data.daftar_indikasi:
        tambah_indikasi(component_id, ind.panjang_mm, ind.lebar_mm, ind.posisi_x, ind.posisi_y)
        daftar_tuple.append((ind.panjang_mm, ind.lebar_mm))

    # hitung & evaluasi
    hasil = evaluasi_komponen(
        component_id=component_id,
        diameter_mm=data.diameter_mm,
        lebar_l_mm=data.panjang_l_mm,
        daftar_indikasi=daftar_tuple,
        standard=standard,
    )

    # simpan hasil evaluasi ke database
    simpan_evaluation_result({
        "component_id": hasil.component_id,
        "p_keliling": hasil.p_keliling,
        "a_babbit": hasil.a_babbit,
        "a_zone_c": hasil.a_zone_c,
        "a_zone_a": hasil.a_zone_a,
        "a_unbond_total": hasil.a_unbond_total,
        "a_bond": hasil.a_bond,
        "persen_unbond": hasil.persen_unbond,
        "status": hasil.status,
    })

    return hasil


# ---------------------------------------------------------------------
# Endpoint: Riwayat hasil
# ---------------------------------------------------------------------

@app.get("/results")
def get_results():
    return ambil_semua_hasil()


# ---------------------------------------------------------------------
# Endpoint: Export laporan (PDF & Excel)
# ---------------------------------------------------------------------

@app.get("/results/{result_id}/report/pdf")
def export_pdf(result_id: int):
    hasil = ambil_hasil_by_id(result_id)
    if hasil is None:
        raise HTTPException(status_code=404, detail="Hasil tidak ditemukan")

    indikasi_list = ambil_indikasi_by_component(hasil["comp_id"])
    path = generate_pdf_report(result_id, hasil, indikasi_list)

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"laporan_ndt_{result_id}.pdf",
    )


@app.get("/results/export/excel")
def export_excel():
    data = ambil_semua_hasil()
    path = generate_excel_riwayat(data)

    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="riwayat_hasil_ndt.xlsx",
    )


@app.get("/")
def root():
    return {"message": "NDT Mapping API aktif"}