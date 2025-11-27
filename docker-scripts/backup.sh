#!/bin/bash
# Backup uploads folder

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/arevei-uploads-$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up uploads..."
docker run --rm -v arevei-cloud_arevei-uploads:/uploads -v $(pwd)/backups:/backup \
  alpine tar czf "/backup/arevei-uploads-$TIMESTAMP.tar.gz" -C /uploads .

echo "✓ Backup created: $BACKUP_FILE"
