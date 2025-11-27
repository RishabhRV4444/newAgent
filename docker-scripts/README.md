# Docker Scripts

Quick helper scripts for managing your AREVEI Cloud Docker container.

## Scripts

### build.sh
Builds the Docker image for AREVEI Cloud.
\`\`\`bash
./docker-scripts/build.sh
\`\`\`

### start.sh
Starts the Docker container using docker-compose.
\`\`\`bash
./docker-scripts/start.sh
\`\`\`

### stop.sh
Stops and removes the Docker container.
\`\`\`bash
./docker-scripts/stop.sh
\`\`\`

### logs.sh
Displays real-time logs from the running container.
\`\`\`bash
./docker-scripts/logs.sh
\`\`\`

### backup.sh
Creates a compressed backup of the uploads folder.
\`\`\`bash
./docker-scripts/backup.sh
\`\`\`

Backups are stored in `./backups/` directory.

### restore.sh
Restores files from a backup file.
\`\`\`bash
./docker-scripts/restore.sh <backup-filename.tar.gz>
\`\`\`

## First Time Setup

1. Make scripts executable (Linux/Mac):
\`\`\`bash
chmod +x docker-scripts/*.sh
\`\`\`

2. Build the image:
\`\`\`bash
./docker-scripts/build.sh
\`\`\`

3. Start the container:
\`\`\`bash
./docker-scripts/start.sh
\`\`\`

4. Access your cloud:
\`\`\`
http://localhost:5000
\`\`\`

## Notes

- All scripts must be run from the project root directory
- On Windows, use Git Bash or WSL to run shell scripts
- Scripts use `docker-compose` which must be installed
