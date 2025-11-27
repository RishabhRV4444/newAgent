#!/bin/bash
# Check AREVEI Cloud status

echo "================================"
echo "AREVEI Cloud - Status"
echo "================================"
echo ""

# Check container status
if docker ps | grep -q arevei-cloud-app; then
  echo "✓ Container is running"
  echo ""
  CONTAINER_ID=$(docker ps --filter "name=arevei-cloud-app" -q)
  docker inspect "$CONTAINER_ID" --format='
Container:
  ID: {{.ID}}
  Image: {{.Config.Image}}
  Status: {{.State.Status}}
  Uptime: {{.State.StartedAt}}

Network:
  IP Address: {{.NetworkSettings.IPAddress}}
  Port: {{index .NetworkSettings.Ports "5000/tcp" 0}}
'
else
  echo "✗ Container is not running"
fi

echo ""
echo "Storage Information:"
STORAGE_DIR="$HOME/.arevei-cloud"
if [ -d "$STORAGE_DIR" ]; then
  USAGE=$(du -sh "$STORAGE_DIR" 2>/dev/null | cut -f1)
  FILE_COUNT=$(find "$STORAGE_DIR/uploads" -type f 2>/dev/null | wc -l)
  FOLDER_COUNT=$(find "$STORAGE_DIR/uploads" -type d 2>/dev/null | wc -l)
  
  echo "  Path: $STORAGE_DIR"
  echo "  Size: $USAGE"
  echo "  Files: $FILE_COUNT"
  echo "  Folders: $FOLDER_COUNT"
else
  echo "  ✗ Storage directory not found"
fi

echo ""
