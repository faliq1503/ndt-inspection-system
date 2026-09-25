"""
db/database.py

Setup database SQLite dan fungsi-fungsi dasar untuk menyimpan &
mengambil data Standard, Component, dan Indication, dengan evaluasi
Zone A & Zone C terpisah (DOD-STD-2183 SH).
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ndt.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS standard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama_standard TEXT NOT NULL,
            lebar_zona_a_mm REAL NOT NULL DEFAULT 25,
            toleransi_persen REAL NOT NULL DEFAULT 15.0,
            individu_zona_a_mm REAL NOT NULL DEFAULT 12.5,
            individu_zona_c_persen REAL NOT NULL DEFAULT 3.0,
            individu_zona_c_max_mm2 REAL NOT NULL DEFAULT 650.0,
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
            gambar_path TEXT,
            FOREIGN KEY (standard_id) REFERENCES standard (id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS indication (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            component_id INTEGER NOT NULL,
            zona TEXT NOT NULL DEFAULT 'C',
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
            a_unbond_zone_a REAL,
            a_bond_zone_a REAL,
            persen_unbond_zone_a REAL,
            status_zone_a TEXT,
            a_unbond_zone_c REAL,
            a_bond_zone_c REAL,
            persen_unbond_zone_c REAL,
            status_zone_c TEXT,
            status TEXT,
            FOREIGN KEY (component_id) REFERENCES component (id)
        )
    """)

    # --- Migrasi untuk database yang sudah ada dari versi sebelumnya ---
    # (aman dijalankan berkali-kali, error diabaikan kalau kolom sudah ada)
    migrasi_kolom = [
        ("component", "gambar_path", "TEXT"),
        ("indication", "zona", "TEXT NOT NULL DEFAULT 'C'"),
        ("standard", "lebar_zona_a_mm", "REAL NOT NULL DEFAULT 25"),
        ("standard", "individu_zona_a_mm", "REAL NOT NULL DEFAULT 12.5"),
        ("standard", "individu_zona_c_persen", "REAL NOT NULL DEFAULT 3.0"),
        ("standard", "individu_zona_c_max_mm2", "REAL NOT NULL DEFAULT 650.0"),
        ("evaluation_result", "a_unbond_zone_a", "REAL"),
        ("evaluation_result", "a_bond_zone_a", "REAL"),
        ("evaluation_result", "persen_unbond_zone_a", "REAL"),
        ("evaluation_result", "status_zone_a", "TEXT"),
        ("evaluation_result", "a_unbond_zone_c", "REAL"),
        ("evaluation_result", "a_bond_zone_c", "REAL"),
        ("evaluation_result", "persen_unbond_zone_c", "REAL"),
        ("evaluation_result", "status_zone_c", "TEXT"),
    ]
    for table, kolom, tipe in migrasi_kolom:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {kolom} {tipe}")
        except sqlite3.OperationalError:
            pass  # kolom sudah ada

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------
# Fungsi dasar untuk Standard
# ---------------------------------------------------------------------

def tambah_standard(
    nama_standard: str,
    lebar_zona_a_mm: float = 25.0,
    toleransi_persen: float = 15.0,
    individu_zona_a_mm: float = 12.5,
    individu_zona_c_persen: float = 3.0,
    individu_zona_c_max_mm2: float = 650.0,
    keterangan: str = "",
) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO standard
        (nama_standard, lebar_zona_a_mm, toleransi_persen, individu_zona_a_mm, individu_zona_c_persen, individu_zona_c_max_mm2, keterangan)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        nama_standard, lebar_zona_a_mm, toleransi_persen,
        individu_zona_a_mm, individu_zona_c_persen, individu_zona_c_max_mm2, keterangan,
    ))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def update_standard(
    standard_id: int,
    nama_standard: str,
    lebar_zona_a_mm: float,
    toleransi_persen: float,
    individu_zona_a_mm: float,
    individu_zona_c_persen: float,
    individu_zona_c_max_mm2: float,
    keterangan: str = "",
):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE standard SET
            nama_standard = ?, lebar_zona_a_mm = ?, toleransi_persen = ?,
            individu_zona_a_mm = ?, individu_zona_c_persen = ?, individu_zona_c_max_mm2 = ?,
            keterangan = ?
        WHERE id = ?
    """, (
        nama_standard, lebar_zona_a_mm, toleransi_persen,
        individu_zona_a_mm, individu_zona_c_persen, individu_zona_c_max_mm2,
        keterangan, standard_id,
    ))
    conn.commit()
    conn.close()


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


def ambil_component_by_id(component_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM component WHERE id = ?", (component_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def simpan_gambar_path(component_id: int, gambar_path: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE component SET gambar_path = ? WHERE id = ?", (gambar_path, component_id))
    conn.commit()
    conn.close()


def tambah_indikasi(component_id: int, zona: str, panjang_mm: float, lebar_mm: float, posisi_x: float = None, posisi_y: float = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO indication (component_id, zona, panjang_mm, lebar_mm, posisi_x, posisi_y) VALUES (?, ?, ?, ?, ?, ?)",
        (component_id, zona, panjang_mm, lebar_mm, posisi_x, posisi_y),
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


def update_posisi_indikasi(indication_id: int, posisi_x: float, posisi_y: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE indication SET posisi_x = ?, posisi_y = ? WHERE id = ?",
        (posisi_x, posisi_y, indication_id),
    )
    conn.commit()
    conn.close()


def update_ukuran_indikasi(indication_id: int, zona: str, panjang_mm: float, lebar_mm: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE indication SET zona = ?, panjang_mm = ?, lebar_mm = ? WHERE id = ?",
        (zona, panjang_mm, lebar_mm, indication_id),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------
# Fungsi dasar untuk Evaluation Result
# ---------------------------------------------------------------------

def simpan_evaluation_result(hasil: dict) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO evaluation_result
        (component_id, p_keliling, a_babbit, a_zone_c, a_zone_a,
         a_unbond_zone_a, a_bond_zone_a, persen_unbond_zone_a, status_zone_a,
         a_unbond_zone_c, a_bond_zone_c, persen_unbond_zone_c, status_zone_c,
         status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        hasil["component_id"], hasil["p_keliling"], hasil["a_babbit"],
        hasil["a_zone_c"], hasil["a_zone_a"],
        hasil["a_unbond_zone_a"], hasil["a_bond_zone_a"], hasil["persen_unbond_zone_a"], hasil["status_zone_a"],
        hasil["a_unbond_zone_c"], hasil["a_bond_zone_c"], hasil["persen_unbond_zone_c"], hasil["status_zone_c"],
        hasil["status"],
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
# Self-test
# ---------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    print(f"Database siap di: {os.path.abspath(DB_PATH)}")

    if not ambil_semua_standard():
        std_id = tambah_standard(
            "DOD-STD-2183 (SH)",
            lebar_zona_a_mm=25.0,
            toleransi_persen=15.0,
            individu_zona_a_mm=12.5,
            individu_zona_c_persen=3.0,
            individu_zona_c_max_mm2=650.0,
            keterangan="Standar default sesuai DOD-STD-2183 (SH)",
        )
        print(f"Standard default ditambahkan dengan id: {std_id}")

    print("Daftar standard saat ini:")
    for s in ambil_semua_standard():
        print(s)