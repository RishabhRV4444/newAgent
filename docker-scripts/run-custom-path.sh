#!/bin/bash
# Run AREVEI Cloud with a custom storage path
# Usage: ./docker-scripts/run-custom-path.sh /path/to/storage

set -e

if [ -z "$1" ]; then
  echo "Usage: ./docker-scripts/run-custom-path.sh /path/to/storage"
  echo ""
  echo "Examples:"
  echo "  # Windows:"
  echo "  ./docker-scripts/run-custom-path.sh C:\\AreveiCloudData"
  echo ""
  echo "  # macOS/Linux:"
  echo "  ./docker-scripts/run-custom-path.sh ~/MyCloudStorage"
  echo "  ./docker-scripts/run-custom-path.sh /mnt/storage/cloud"
  exit 1
fi

STORAGE_PATH="$1"

# Create the storage directory if it doesn't exist
mkdir -p "$STORAGE_PATH"

echo "Starting AREVEI Cloud with custom storage path..."
echo "Storage path: $STORAGE_PATH"
echo ""

# Run with custom environment variable
docker run -d \
  --name arevei-cloud-app \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e AREVEI_STORAGE_PATH=/data/arevei-cloud/uploads \
  -v "$STORAGE_PATH":/data/arevei-cloud/uploads \
  arevei-cloud:latest

echo "Container started!"
echo "Access at: http://localhost:5000"
echo ""
echo "Stop container: docker stop arevei-cloud-app"
echo "Remove container: docker rm arevei-cloud-app"
