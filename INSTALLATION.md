# AREVEI Cloud - Installation Guide

## System Requirements

- Docker 20.10+
- Docker Compose 1.29+
- 2GB RAM minimum
- 5GB disk space (for OS + Docker + initial storage)

### Install Docker

- **Linux**: https://docs.docker.com/engine/install/
- **Mac**: https://docs.docker.com/desktop/install/mac-install/
- **Windows**: https://docs.docker.com/desktop/install/windows-install/

## Quick Installation

### One-Command Setup

\`\`\`bash
chmod +x docker-scripts/*.sh
./docker-scripts/install.sh
\`\`\`

This will:
1. ✓ Create storage directories at `~/.arevei-cloud/uploads`
2. ✓ Build the Docker image
3. ✓ Start the container
4. ✓ Display access information

Then open your browser to **http://localhost:5000**

## Storage Location

Your files are stored in your **user system directory**:

\`\`\`
~/.arevei-cloud/
├── uploads/          # Your files stored here
└── config.json       # Configuration metadata
\`\`\`

This means:
- Files persist even if Docker container is removed
- Easy to backup by copying the directory
- Full control over storage location
- Can access files directly from your file system

### View Your Files

\`\`\`bash
# List all files
ls -la ~/.arevei-cloud/uploads/

# Check storage usage
du -sh ~/.arevei-cloud/

# Open in file manager
open ~/.arevei-cloud/uploads  # macOS
xdg-open ~/.arevei-cloud/uploads  # Linux
explorer %USERPROFILE%\.arevei-cloud\uploads  # Windows (PowerShell)
\`\`\`

## Manual Installation Steps

If you prefer step-by-step installation:

### Step 1: Initialize Storage

\`\`\`bash
./docker-scripts/init.sh
\`\`\`

Creates the `~/.arevei-cloud/uploads` directory with config.

### Step 2: Build Docker Image

\`\`\`bash
./docker-scripts/build.sh
\`\`\`

### Step 3: Start Container

\`\`\`bash
./docker-scripts/start.sh
\`\`\`

### Step 4: Access Your Cloud

Open browser to: **http://localhost:5000**

## Verify Installation

Check if everything is running:

\`\`\`bash
./docker-scripts/status.sh
\`\`\`

Or manually:

\`\`\`bash
# Check container
docker ps

# View logs
docker-compose logs

# Check storage
ls -la ~/.arevei-cloud/uploads/
\`\`\`

## Common Tasks

### Stop the Application

\`\`\`bash
./docker-scripts/stop.sh
\`\`\`

### View Logs

\`\`\`bash
./docker-scripts/logs.sh
\`\`\`

### Backup Your Files

\`\`\`bash
./docker-scripts/backup.sh
\`\`\`

Backup will be created in `./backups/` directory.

### Restore from Backup

\`\`\`bash
./docker-scripts/restore.sh backups/arevei-uploads-TIMESTAMP.tar.gz
\`\`\`

### Access Storage Location

The storage directory is at `~/.arevei-cloud/` in your home folder:

- **Linux/Mac**: `~/.arevei-cloud/uploads/`
- **Windows**: `C:\Users\YourUsername\.arevei-cloud\uploads\`

### Custom Storage Location

To use a different location, edit `docker-compose.yml`:

\`\`\`yaml
volumes:
  - /custom/path/storage:/home/appuser/.arevei-cloud/uploads
\`\`\`

Then set environment variable:

\`\`\`bash
export AREVEI_STORAGE_PATH=/custom/path/storage
\`\`\`

### Uninstall

Remove Docker image (files preserved):

\`\`\`bash
./docker-scripts/uninstall.sh
\`\`\`

Your files remain at `~/.arevei-cloud/uploads/`

## Troubleshooting

### Port 5000 Already in Use

Edit `docker-compose.yml`:

\`\`\`yaml
ports:
  - "8080:5000"  # Use port 8080 instead
\`\`\`

Then restart: `./docker-scripts/start.sh`

### Container Won't Start

\`\`\`bash
# Check logs
./docker-scripts/logs.sh

# Full Docker logs
docker-compose logs
\`\`\`

### Permission Issues

If you get permission errors:

\`\`\`bash
# Fix permissions
chmod -R 755 ~/.arevei-cloud/

# Or reinitialize
./docker-scripts/init.sh
\`\`\`

### Storage Directory Not Created

Manually create it:

\`\`\`bash
mkdir -p ~/.arevei-cloud/uploads
chmod 755 ~/.arevei-cloud/uploads
\`\`\`

Then start container: `./docker-scripts/start.sh`

### Docker Not Running

Make sure Docker daemon is running:

\`\`\`bash
# Linux
sudo systemctl start docker

# Mac/Windows
# Open Docker Desktop application
\`\`\`

## Features

✓ **Local Storage** - Files stored in your home directory  
✓ **Web Interface** - Access via browser  
✓ **File Management** - Upload, download, organize  
✓ **Folder Support** - Create and manage folders  
✓ **Storage Dashboard** - View usage and stats  
✓ **Persistent** - Data survives container restarts  
✓ **Backup/Restore** - Easy backup scripts included  
✓ **Nextcloud-like** - Similar functionality and experience  

## Environment Variables

Optional customization via `.env.production`:

\`\`\`env
NODE_ENV=production
PORT=5000
AREVEI_STORAGE_PATH=/custom/storage/path
\`\`\`

Enable in `docker-compose.yml` by uncommenting:

\`\`\`yaml
env_file:
  - .env.production
\`\`\`

## Support & Troubleshooting

For detailed technical information, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

### Check System Status

\`\`\`bash
./docker-scripts/status.sh
\`\`\`

### View Container Logs

\`\`\`bash
./docker-scripts/logs.sh
\`\`\`

### Direct Commands

\`\`\`bash
# Enter container shell
docker exec -it arevei-cloud-app sh

# Check running processes
docker ps

# View detailed logs
docker-compose logs -f
\`\`\`

## Next Steps

1. Upload files to your cloud
2. Create folders to organize files
3. Access files from any browser on your network
4. Set up backups with `./docker-scripts/backup.sh`
