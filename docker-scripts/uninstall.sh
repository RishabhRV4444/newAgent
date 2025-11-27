#!/bin/bash
# Uninstall AREVEI Cloud (keeps user data intact)

echo "================================"
echo "AREVEI Cloud - Uninstall"
echo "================================"
echo ""
echo "WARNING: This will stop the container and remove the Docker image."
echo "Your files in ~/.arevei-cloud/uploads will NOT be deleted."
echo ""
read -p "Continue? (yes/no): " -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Uninstall cancelled."
  exit 0
fi

echo ""
echo "Stopping container..."
docker-compose down

echo "Removing Docker image..."
docker rmi arevei-cloud:latest 2>/dev/null || echo "Image not found"

echo ""
echo "✓ Uninstall complete!"
echo ""
echo "Your files are preserved at:"
echo "  ~/.arevei-cloud/uploads"
echo ""
echo "To reinstall:"
echo "  ./docker-scripts/install.sh"
