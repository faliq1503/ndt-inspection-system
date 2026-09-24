"""
db/database.py

Setup database SQLite dan fungsi-fungsi dasar untuk menyimpan &
mengambil data Standard, Component, dan Indication.

File database (.db) akan otomatis dibuat di folder data/ndt.db
saat pertama kali dijalankan.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ndt.db")


def get_connection():
    """Membuka koneksi ke database SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # supaya hasil query bisa diakses seperti dict
    return conn


def init_db():
    """
    Membuat tabel-tabel awal kalau belum ada.
    Aman dipanggil berkali-kali (pakai IF NOT EXISTS).
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS standard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama_standard TEXT NOT NULL,
            offset_x_mm REAL NOT NULL DEFAULT 50,
            toleransi_persen REAL NOT NULL DEFAULT 5.0,
            keterangan TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS component (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jenis_benda TEXT NOT NULL,
            diameter_mm REAL NOT NULL,
            panjang_l_mm REAL NOT NULL,
            zona TEXT,
            standard_id INTEGER,
            tanggal_input TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (standard_id) REFERENCES standard (id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS indication (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            component_id INTEGER NOT NULL,
            panjang_mm REAL NOT NULL,
            lebar_mm REAL NOT NULL,
            posisi_x REAL,
            posisi_y REAL,
            FOREIGN KEY (component_id) REFERENCES component (id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS evaluation_result (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            component_id INTEGER NOT NULL,
            p_keliling REAL,
            a_babbit REAL,
            a_zone_c REAL,
            a_zone_a REAL,
            a_unbond_total REAL,
            a_bond REAL,
            persen_unbond REAL,
            status TEXT,
            FOREIGN KEY (component_id) REFERENCES component (id)
        )
    """)

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------
# Fungsi dasar untuk Standard
# ---------------------------------------------------------------------

def tambah_standard(nama_standard: str, offset_x_mm: float, toleransi_persen: float, keterangan: str = "") -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO standard (nama_standard, offset_x_mm, toleransi_persen, keterangan) VALUES (?, ?, ?, ?)",
        (nama_standard, offset_x_mm, toleransi_persen, keterangan),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def ambil_semua_standard():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM standard")
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------
# Fungsi dasar untuk Component + Indication
# ---------------------------------------------------------------------

def tambah_component(jenis_benda: str, diameter_mm: float, panjang_l_mm: float, zona: str, standard_id: int) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO component (jenis_benda, diameter_mm, panjang_l_mm, zona, standard_id) VALUES (?, ?, ?, ?, ?)",
        (jenis_benda, diameter_mm, panjang_l_mm, zona, standard_id),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def tambah_indikasi(component_id: int, panjang_mm: float, lebar_mm: float, posisi_x: float = None, posisi_y: float = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO indication (component_id, panjang_mm, lebar_mm, posisi_x, posisi_y) VALUES (?, ?, ?, ?, ?)",
        (component_id, panjang_mm, lebar_mm, posisi_x, posisi_y),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def ambil_indikasi_by_component(component_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM indication WHERE component_id = ?", (component_id,))
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------
# Fungsi dasar untuk Evaluation Result
# ---------------------------------------------------------------------

def simpan_evaluation_result(hasil: dict) -> int:
    """
    hasil: dict dengan key sesuai kolom tabel evaluation_result
    (component_id, p_keliling, a_babbit, a_zone_c, a_zone_a,
    a_unbond_total, a_bond, persen_unbond, status)
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO evaluation_result
        (component_id, p_keliling, a_babbit, a_zone_c, a_zone_a, a_unbond_total, a_bond, persen_unbond, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        hasil["component_id"], hasil["p_keliling"], hasil["a_babbit"],
        hasil["a_zone_c"], hasil["a_zone_a"], hasil["a_unbond_total"],
        hasil["a_bond"], hasil["persen_unbond"], hasil["status"],
    ))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def ambil_semua_hasil():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT er.*, c.jenis_benda, c.diameter_mm, c.zona
        FROM evaluation_result er
        JOIN component c ON er.component_id = c.id
        ORDER BY er.id DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def ambil_hasil_by_id(result_id: int):
    """Mengambil satu hasil evaluasi lengkap (gabungan dengan data component) berdasarkan id."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT er.*, c.jenis_benda, c.diameter_mm, c.zona, c.id as comp_id
        FROM evaluation_result er
        JOIN component c ON er.component_id = c.id
        WHERE er.id = ?
    """, (result_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


# ---------------------------------------------------------------------
# Self-test -> jalankan file ini langsung untuk cek
# ---------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    print(f"Database siap di: {os.path.abspath(DB_PATH)}")

    # Cek apakah sudah ada standard default, kalau belum, tambahkan
    if not ambil_semua_standard():
        std_id = tambah_standard("Internal QC v1", offset_x_mm=50, toleransi_persen=5.0, keterangan="Standar default awal")
        print(f"Standard default ditambahkan dengan id: {std_id}")

    print("Daftar standard saat ini:")
    for s in ambil_semua_standard():
        print(s)