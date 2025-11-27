#!/bin/bash
# Complete installation script - builds and starts AREVEI Cloud

set -e

echo "================================"
echo "AREVEI Cloud - Full Installation"
echo "================================"
echo ""

# Step 1: Initialize storage
echo "[1/4] Initializing storage directories..."
./docker-scripts/init.sh

echo ""
echo "[2/4] Building Docker image..."
./docker-scripts/build.sh

echo ""
echo "[3/4] Starting container..."
./docker-scripts/start.sh

echo ""
echo "[4/4] Waiting for container to be ready..."
sleep 3

# Check if container is running
if docker ps | grep -q arevei-cloud-app; then
  echo "✓ Container is running!"
  echo ""
  echo "================================"
  echo "Installation Complete!"
  echo "================================"
  echo ""
  echo "Your AREVEI Cloud is ready at:"
  echo "  Web UI:     http://localhost:5000"
  echo "  Storage:    ~/.arevei-cloud/uploads"
  echo ""
  echo "Commands:"
  echo "  View logs:    ./docker-scripts/logs.sh"
  echo "  Stop:         ./docker-scripts/stop.sh"
  echo "  Backup:       ./docker-scripts/backup.sh"
  echo ""
else
  echo "✗ Container failed to start. Check logs:"
  ./docker-scripts/logs.sh
  exit 1
fi
