#!/bin/bash
# Build Docker image

echo "Building AREVEI Cloud Docker image..."
docker build -t arevei-cloud:latest .

if [ $? -eq 0 ]; then
  echo "✓ Build successful!"
  echo "Run: docker-compose up -d"
else
  echo "✗ Build failed!"
  exit 1
fi
