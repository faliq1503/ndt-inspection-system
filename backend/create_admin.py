"""
backend/create_admin.py

Membuat akun admin pertama (karena sistem tidak punya fitur register).

Jalankan dari folder backend, venv aktif:
    python create_admin.py
"""

import getpass
import sys

from core.security import hash_password
from db.database import ambil_user_by_username, init_db, tambah_user


def main():
    init_db()

    username = input("Username admin: ").strip()
    if len(username) < 3:
        print("Username minimal 3 karakter.")
        sys.exit(1)
    if ambil_user_by_username(username):
        print("Username itu sudah ada.")
        sys.exit(1)

    password = getpass.getpass("Password (min 8 karakter): ")
    if len(password) < 8 or len(password) > 72:
        print("Password harus 8 sampai 72 karakter.")
        sys.exit(1)
    if password != getpass.getpass("Ulangi password: "):
        print("Password tidak sama.")
        sys.exit(1)

    tambah_user(username, hash_password(password), "admin")
    print(f"Admin '{username}' berhasil dibuat.")


if __name__ == "__main__":
    main()