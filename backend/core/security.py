"""
core/security.py

Hash password (bcrypt) dan pembuatan/pembacaan token JWT.

SECRET_KEY diambil dari environment variable NDT_SECRET_KEY.
Nilai default di bawah HANYA untuk development; wajib diganti
sebelum dipakai di kantor.
"""

import datetime
import os

import bcrypt
import jwt

SECRET_KEY = os.environ.get("NDT_SECRET_KEY", "dev-only-ganti-sebelum-dipakai-di-kantor")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, username: str, role: str) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "username": username, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Melempar jwt.PyJWTError kalau token tidak valid atau sudah kedaluwarsa."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])