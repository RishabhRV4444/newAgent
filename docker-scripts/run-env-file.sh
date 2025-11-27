#!/bin/bash
# Run AREVEI Cloud with .env file configuration
# Create a .env.docker file with your custom settings

if [ ! -f ".env.docker" ]; then
  echo "Creating .env.docker template..."
  cat > .env.docker << 'EOF'
# AREVEI Cloud Docker Configuration
NODE_ENV=production
PORT=5000

# Storage path inside container (usually don't change this)
AREVEI_STORAGE_PATH=/data/arevei-cloud/uploads

# Host storage path (modify this based on your OS)
# Windows: C:\AreveiCloudData
# macOS: ~/MyCloudStorage or /Users/username/MyCloudStorage
# Linux: ~/MyCloudStorage or /mnt/storage/cloud
HOST_STORAGE_PATH=~/.arevei-cloud/uploads
EOF
  echo "Created .env.docker - please edit with your custom paths"
  exit 1
fi

echo "Starting AREVEI Cloud with .env.docker configuration..."

# Read the host storage path
HOST_STORAGE_PATH=$(grep '^HOST_STORAGE_PATH=' .env.docker | cut -d '=' -f 2 | eval echo)
STORAGE_PATH=$(eval echo "$HOST_STORAGE_PATH")

mkdir -p "$STORAGE_PATH"

docker run -d \
  --name arevei-cloud-app \
  -p 5000:5000 \
  --env-file .env.docker \
  -v "$STORAGE_PATH":/data/arevei-cloud/uploads \
  arevei-cloud:latest

echo "Container started!"
echo "Storage path: $STORAGE_PATH"
echo "Access at: http://localhost:5000"
