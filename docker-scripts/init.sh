#!/bin/bash
# Initialize AREVEI Cloud - Create directories and set up storage

set -e

echo "================================"
echo "AREVEI Cloud - Initialization"
echo "================================"
echo ""

# Get home directory
HOME_DIR="$HOME"
STORAGE_DIR="$HOME_DIR/.arevei-cloud"
UPLOADS_DIR="$STORAGE_DIR/uploads"

echo "Creating storage directories..."
mkdir -p "$UPLOADS_DIR"
chmod 755 "$STORAGE_DIR"
chmod 755 "$UPLOADS_DIR"

echo "✓ Storage directory created at: $STORAGE_DIR"
echo ""

# Create config file
CONFIG_FILE="$STORAGE_DIR/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" << EOF
{
  "version": "1.0",
  "createdAt": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "storagePath": "$UPLOADS_DIR",
  "type": "user-system-storage"
}
EOF
  echo "✓ Config file created at: $CONFIG_FILE"
else
  echo "✓ Config file already exists at: $CONFIG_FILE"
fi

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Your cloud storage is ready at:"
echo "  Path: $STORAGE_DIR"
echo ""
echo "Next steps:"
echo "  1. Build the Docker image:"
echo "     ./docker-scripts/build.sh"
echo "  2. Start the container:"
echo "     ./docker-scripts/start.sh"
echo "  3. Access your cloud at:"
echo "     http://localhost:5000"
echo ""
echo "Your files will be stored in:"
echo "  $UPLOADS_DIR"
echo ""
echo "To view your storage files:"
echo "  ls -la $UPLOADS_DIR"
echo ""
