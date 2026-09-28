"""
api/auth.py

Endpoint login dan manajemen user.

- POST /auth/login          : semua orang (mengembalikan token)
- GET  /auth/me             : user yang sedang login
- GET/POST /users, PUT /users/{id}/active, PUT /users/{id}/password
                            : HANYA admin (dicek di backend, bukan cuma di menu frontend)
"""

import sqlite3
from typing import Literal

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from core.security import create_access_token, decode_token, hash_password, verify_password
from db.database import (
    ambil_semua_user,
    ambil_user_by_id,
    ambil_user_by_username,
    set_user_aktif,
    set_user_password,
    tambah_user,
)

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------
# Dependency: siapa yang sedang login
# ---------------------------------------------------------------------

def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    if cred is None:
        raise HTTPException(status_code=401, detail="Belum login")
    try:
        payload = decode_token(cred.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sesi tidak valid atau sudah berakhir")

    # Cek ke database tiap request, supaya akun yang dinonaktifkan
    # langsung tidak bisa dipakai walaupun token-nya belum kedaluwarsa.
    user = ambil_user_by_id(int(payload["sub"]))
    if user is None or not user["aktif"]:
        raise HTTPException(status_code=401, detail="Akun tidak aktif")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang boleh mengakses ini")
    return user


def _public_user(user: dict) -> dict:
    return {"id": user["id"], "username": user["username"], "role": user["role"], "aktif": bool(user["aktif"])}


# ---------------------------------------------------------------------
# Schema request
# ---------------------------------------------------------------------

class LoginIn(BaseModel):
    username: str
    password: str


class UserCreateIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=72)
    role: Literal["admin", "staff"] = "staff"


class PasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=72)


class AktifIn(BaseModel):
    aktif: bool


# ---------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------

@router.post("/auth/login")
def login(data: LoginIn):
    user = ambil_user_by_username(data.username.strip())
    # Pesan sengaja sama untuk semua kegagalan, supaya tidak
    # membocorkan apakah username tertentu ada atau tidak.
    if user is None or not user["aktif"] or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")

    token = create_access_token(user["id"], user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


# ---------------------------------------------------------------------
# Manajemen user (admin saja)
# ---------------------------------------------------------------------

@router.get("/users")
def list_users(_: dict = Depends(require_admin)):
    return [
        {**u, "aktif": bool(u["aktif"])} for u in ambil_semua_user()
    ]


@router.post("/users")
def create_user(data: UserCreateIn, _: dict = Depends(require_admin)):
    username = data.username.strip()
    try:
        new_id = tambah_user(username, hash_password(data.password), data.role)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username sudah dipakai")
    return _public_user(ambil_user_by_id(new_id))


@router.put("/users/{user_id}/active")
def ubah_status_aktif(user_id: int, data: AktifIn, admin: dict = Depends(require_admin)):
    if user_id == admin["id"] and not data.aktif:
        raise HTTPException(status_code=400, detail="Tidak bisa menonaktifkan akun sendiri")
    if ambil_user_by_id(user_id) is None:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    set_user_aktif(user_id, data.aktif)
    return _public_user(ambil_user_by_id(user_id))


@router.put("/users/{user_id}/password")
def reset_password(user_id: int, data: PasswordIn, _: dict = Depends(require_admin)):
    if ambil_user_by_id(user_id) is None:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    set_user_password(user_id, hash_password(data.password))
    return {"id": user_id, "detail": "Password berhasil direset"}