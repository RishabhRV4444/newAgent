#!/bin/bash
# Start the container using docker-compose

echo "Starting AREVEI Cloud..."

HOME_EXPANDED=$(eval echo ~)

# Check if storage directory exists
STORAGE_DIR="$HOME_EXPANDED/.arevei-cloud/uploads"
if [ ! -d "$STORAGE_DIR" ]; then
  echo "! Storage directory not found. Running initialization..."
  ./docker-scripts/init.sh
fi

# Substitute home directory in docker-compose.yml for volume mounting
sed -i.bak "s|~|$HOME_EXPANDED|g" docker-compose.yml 2>/dev/null || \
sed -i '' "s|~|$HOME_EXPANDED|g" docker-compose.yml

docker-compose up -d

echo "✓ Container started!"
echo ""
echo "Access your cloud at: http://localhost:5000"
echo "Storage location:     $STORAGE_DIR"
echo ""
echo "View logs: ./docker-scripts/logs.sh"
echo "Stop:      ./docker-scripts/stop.sh"
