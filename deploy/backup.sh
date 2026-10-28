#!/bin/bash
# Backup harian database dan foto. Jalankan lewat cron (lihat docs/DEPLOY.md).
# Butuh: sudo apt install sqlite3
set -euo pipefail

DATA_DIR="${NDT_DATA_DIR:-/var/lib/ndt}"
BACKUP_ROOT="${NDT_BACKUP_DIR:-/var/backups/ndt}"
KEEP_DAYS="${NDT_BACKUP_KEEP_DAYS:-14}"

DEST="$BACKUP_ROOT/$(date +%F_%H%M)"
mkdir -p "$DEST"

# .backup aman dipakai saat aplikasi sedang berjalan (menyalin file mentah tidak)
sqlite3 "$DATA_DIR/ndt.db" ".backup '$DEST/ndt.db'"
tar czf "$DEST/images.tar.gz" -C "$DATA_DIR" images

# Hapus backup yang lebih tua dari KEEP_DAYS hari
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Backup selesai: $DEST"
