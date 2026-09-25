"""
backend/api/main.py

FastAPI app - versi dengan evaluasi Zone A & Zone C terpisah
sesuai DOD-STD-2183 (SH).

Jalankan dari folder backend:
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import shutil
import uuid

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

from core.evaluation import evaluasi_komponen
from core.models import Standard
from db.database import (
    init_db,
    tambah_standard,
    update_standard,
    ambil_semua_standard,
    tambah_component,
    tambah_indikasi,
    ambil_indikasi_by_component,
    simpan_evaluation_result,
    ambil_semua_hasil,
    ambil_hasil_by_id,
    ambil_component_by_id,
    simpan_gambar_path,
    update_posisi_indikasi,
    update_ukuran_indikasi,
)
from reports.pdf_report import generate_pdf_report
from reports.excel_report import generate_excel_riwayat

app = FastAPI(title="NDT Mapping API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------
# Schema request
# ---------------------------------------------------------------------

class StandardIn(BaseModel):
    nama_standard: str
    lebar_zona_a_mm: float = 25.0
    toleransi_persen: float = 15.0
    individu_zona_a_mm: float = 12.5
    individu_zona_c_persen: float = 3.0
    individu_zona_c_max_mm2: float = 650.0
    keterangan: str = ""


class ComponentIn(BaseModel):
    jenis_benda: str
    diameter_mm: float
    panjang_l_mm: float
    zona: str
    standard_id: int


class IndikasiIn(BaseModel):
    zona: str  # "A" atau "C"
    panjang_mm: float = 0
    lebar_mm: float = 0
    posisi_x: Optional[float] = None
    posisi_y: Optional[float] = None


class IndikasiUpdateIn(BaseModel):
    zona: str
    panjang_mm: float
    lebar_mm: float


class PosisiIn(BaseModel):
    posisi_x: float
    posisi_y: float


# ---------------------------------------------------------------------
# Endpoint: Standard
# ---------------------------------------------------------------------

@app.get("/standards")
def get_standards():
    return ambil_semua_standard()


@app.post("/standards")
def create_standard(data: StandardIn):
    new_id = tambah_standard(
        data.nama_standard, data.lebar_zona_a_mm, data.toleransi_persen,
        data.individu_zona_a_mm, data.individu_zona_c_persen, data.individu_zona_c_max_mm2,
        data.keterangan,
    )
    return {"id": new_id, **data.dict()}


@app.put("/standards/{standard_id}")
def edit_standard(standard_id: int, data: StandardIn):
    update_standard(
        standard_id, data.nama_standard, data.lebar_zona_a_mm, data.toleransi_persen,
        data.individu_zona_a_mm, data.individu_zona_c_persen, data.individu_zona_c_max_mm2,
        data.keterangan,
    )
    return {"id": standard_id, **data.dict()}


# ---------------------------------------------------------------------
# Endpoint: Component
# ---------------------------------------------------------------------

@app.post("/components")
def create_component(data: ComponentIn):
    component_id = tambah_component(
        jenis_benda=data.jenis_benda,
        diameter_mm=data.diameter_mm,
        panjang_l_mm=data.panjang_l_mm,
        zona=data.zona,
        standard_id=data.standard_id,
    )
    return {"id": component_id, **data.dict()}


@app.get("/components/{component_id}")
def get_component(component_id: int):
    comp = ambil_component_by_id(component_id)
    if comp is None:
        raise HTTPException(status_code=404, detail="Component tidak ditemukan")
    indikasi_list = ambil_indikasi_by_component(component_id)
    return {**comp, "indikasi_list": indikasi_list}


@app.post("/components/{component_id}/upload-image")
def upload_image(component_id: int, file: UploadFile = File(...)):
    comp = ambil_component_by_id(component_id)
    if comp is None:
        raise HTTPException(status_code=404, detail="Component tidak ditemukan")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"component_{component_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(IMAGES_DIR, filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    simpan_gambar_path(component_id, filename)
    return {"gambar_path": filename, "url": f"/images/{filename}"}


# ---------------------------------------------------------------------
# Endpoint: Indikasi
# ---------------------------------------------------------------------

@app.post("/components/{component_id}/indications")
def add_indication(component_id: int, data: IndikasiIn):
    comp = ambil_component_by_id(component_id)
    if comp is None:
        raise HTTPException(status_code=404, detail="Component tidak ditemukan")

    new_id = tambah_indikasi(
        component_id, data.zona, data.panjang_mm, data.lebar_mm, data.posisi_x, data.posisi_y
    )
    return {"id": new_id, **data.dict()}


@app.put("/indications/{indication_id}/position")
def set_indication_position(indication_id: int, data: PosisiIn):
    update_posisi_indikasi(indication_id, data.posisi_x, data.posisi_y)
    return {"id": indication_id, "posisi_x": data.posisi_x, "posisi_y": data.posisi_y}


@app.put("/indications/{indication_id}/size")
def set_indication_size(indication_id: int, data: IndikasiUpdateIn):
    update_ukuran_indikasi(indication_id, data.zona, data.panjang_mm, data.lebar_mm)
    return {"id": indication_id, **data.dict()}


# ---------------------------------------------------------------------
# Endpoint: Hitung & Evaluasi
# ---------------------------------------------------------------------

@app.post("/components/{component_id}/calculate")
def calculate(component_id: int):
    comp = ambil_component_by_id(component_id)
    if comp is None:
        raise HTTPException(status_code=404, detail="Component tidak ditemukan")

    semua_standard = ambil_semua_standard()
    std_dict = next((s for s in semua_standard if s["id"] == comp["standard_id"]), None)
    if std_dict is None:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan")

    standard = Standard(
        id=std_dict["id"],
        nama_standard=std_dict["nama_standard"],
        lebar_zona_a_mm=std_dict["lebar_zona_a_mm"],
        toleransi_persen=std_dict["toleransi_persen"],
        individu_zona_a_mm=std_dict["individu_zona_a_mm"],
        individu_zona_c_persen=std_dict["individu_zona_c_persen"],
        individu_zona_c_max_mm2=std_dict["individu_zona_c_max_mm2"],
    )

    semua_indikasi = ambil_indikasi_by_component(component_id)
    indikasi_zone_a = [(i["panjang_mm"], i["lebar_mm"]) for i in semua_indikasi if i["zona"] == "A"]
    indikasi_zone_c = [(i["panjang_mm"], i["lebar_mm"]) for i in semua_indikasi if i["zona"] == "C"]

    hasil = evaluasi_komponen(
        component_id=component_id,
        diameter_mm=comp["diameter_mm"],
        lebar_l_mm=comp["panjang_l_mm"],
        indikasi_zone_a=indikasi_zone_a,
        indikasi_zone_c=indikasi_zone_c,
        standard=standard,
    )

    simpan_evaluation_result({
        "component_id": hasil.component_id,
        "p_keliling": hasil.p_keliling,
        "a_babbit": hasil.a_babbit,
        "a_zone_c": hasil.a_zone_c,
        "a_zone_a": hasil.a_zone_a,
        "a_unbond_zone_a": hasil.a_unbond_zone_a,
        "a_bond_zone_a": hasil.a_bond_zone_a,
        "persen_unbond_zone_a": hasil.persen_unbond_zone_a,
        "status_zone_a": hasil.status_zone_a,
        "a_unbond_zone_c": hasil.a_unbond_zone_c,
        "a_bond_zone_c": hasil.a_bond_zone_c,
        "persen_unbond_zone_c": hasil.persen_unbond_zone_c,
        "status_zone_c": hasil.status_zone_c,
        "status": hasil.status,
    })

    return hasil


# ---------------------------------------------------------------------
# Endpoint: Riwayat & Export
# ---------------------------------------------------------------------

@app.get("/results")
def get_results():
    return ambil_semua_hasil()


@app.get("/results/{result_id}/report/pdf")
def export_pdf(result_id: int):
    hasil = ambil_hasil_by_id(result_id)
    if hasil is None:
        raise HTTPException(status_code=404, detail="Hasil tidak ditemukan")

    indikasi_list = ambil_indikasi_by_component(hasil["comp_id"])
    path = generate_pdf_report(result_id, hasil, indikasi_list)

    return FileResponse(path, media_type="application/pdf", filename=f"laporan_ndt_{result_id}.pdf")


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