#!/bin/bash
# Restore uploads from backup

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup-file.tar.gz>"
  echo ""
  echo "Available backups:"
  ls -la ./backups/
  exit 1
fi

echo "Restoring from: $1"
docker run --rm -v arevei-cloud_arevei-uploads:/uploads -v $(pwd)/backups:/backup \
  alpine tar xzf "/backup/$1" -C /uploads

echo "✓ Restore complete!"
