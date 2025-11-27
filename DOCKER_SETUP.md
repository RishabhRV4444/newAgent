# AREVEI Cloud - Docker Setup Guide

## Quick Start

### 1. Prerequisites
- Docker installed ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (usually comes with Docker Desktop)

### 2. Build and Run

\`\`\`bash
# Make scripts executable (Linux/Mac)
chmod +x docker-scripts/*.sh

# Build the Docker image
./docker-scripts/build.sh

# Start the container
./docker-scripts/start.sh

# View logs
./docker-scripts/logs.sh
\`\`\`

### 3. Access Your Cloud
Open your browser and go to:
\`\`\`
http://localhost:5000
\`\`\`

## Container Management

### Stop the container
\`\`\`bash
./docker-scripts/stop.sh
\`\`\`

### View logs
\`\`\`bash
./docker-scripts/logs.sh
\`\`\`

### Manual Docker Commands
\`\`\`bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Enter container shell
docker exec -it arevei-cloud-app sh

# Check container status
docker ps
\`\`\`

## Storage & Persistence

### Uploads Volume
- **Location in Docker**: `/app/uploads`
- **Host Storage**: `arevei-cloud_arevei-uploads` (Docker volume)
- **Persistent**: Yes - survives container restarts
- **Backup**: Use `./docker-scripts/backup.sh`

### View Files on Host
\`\`\`bash
# On Linux/Mac
docker exec arevei-cloud-app ls -la /app/uploads

# On all systems
docker run --rm -v arevei-cloud_arevei-uploads:/uploads alpine ls -la /uploads
\`\`\`

## Advanced Configuration

### Environment Variables
Create a `.env.production` file:
\`\`\`env
NODE_ENV=production
PORT=5000
# Add other environment variables as needed
\`\`\`

Then uncomment in `docker-compose.yml`:
\`\`\`yaml
env_file:
  - .env.production
\`\`\`

### Custom Port
Edit `docker-compose.yml`:
\`\`\`yaml
ports:
  - "8080:5000"  # Access on http://localhost:8080
\`\`\`

### Bind Mount for Development
To enable live code changes:
\`\`\`yaml
volumes:
  - .:/app
  - arevei-uploads:/app/uploads
\`\`\`

Then rebuild: `docker-compose up --build`

## Backup & Restore

### Backup your files
\`\`\`bash
./docker-scripts/backup.sh
\`\`\`

Backups are stored in `./backups/`

### Restore from backup
\`\`\`bash
./docker-scripts/restore.sh arevei-uploads-20250114_120000.tar.gz
\`\`\`

## Troubleshooting

### Port 5000 already in use
\`\`\`bash
# Change port in docker-compose.yml
ports:
  - "8080:5000"  # Use port 8080 instead
\`\`\`

### Check container is running
\`\`\`bash
docker ps
\`\`\`

### View container logs
\`\`\`bash
docker-compose logs -f
\`\`\`

### Clean restart
\`\`\`bash
docker-compose down
docker volume rm arevei-cloud_arevei-uploads  # WARNING: Deletes data
docker-compose up -d
\`\`\`

### Enter container shell
\`\`\`bash
docker exec -it arevei-cloud-app sh
\`\`\`

## Storage Limits

- **Max Storage**: 10 GB (configured in `server/storage.ts`)
- **Quota Warning**: You'll see warnings when approaching limits
- **To increase**: Modify `MAX_STORAGE_BYTES` in `server/storage.ts`

## Nextcloud-like Features

Your AREVEI Cloud Docker setup includes:

✓ **Local File Storage** - All files stored on your system  
✓ **Persistent Volumes** - Data survives container restarts  
✓ **Web Interface** - Access via http://localhost:5000  
✓ **File Management** - Upload, download, organize files  
✓ **Folder Structure** - Create and manage folders  
✓ **Storage Dashboard** - View usage and statistics  
✓ **Automatic Backups** - Simple backup/restore scripts  

## Production Deployment

### For production use, consider:

1. **Reverse Proxy** - Use Nginx/Caddy in front
2. **SSL/TLS** - Add HTTPS with certificates
3. **Authentication** - Integrate user authentication
4. **Cloud Providers** - Deploy to Docker-compatible services:
   - Docker Swarm
   - Kubernetes
   - DigitalOcean App Platform
   - AWS ECS
   - Render

### Example Nginx Configuration
\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

## Support

For issues or questions, check:
- Docker logs: `docker-compose logs`
- Container shell: `docker exec -it arevei-cloud-app sh`
- Application logs in container: `/app/uploads/` for file metadata
