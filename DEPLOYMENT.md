# Deployment Guide

This guide explains how to deploy the application to a VPS (Virtual Private Server) using AWS EC2.

## Prerequisites

- AWS Account with EC2 access
- SSH key pair (brightlygang.pem)
- GitHub repository access
- Domain name (optional)

## Server Requirements

- Ubuntu Server 24.04 LTS
- Minimum specifications:
  - t2.small (recommended) or t2.micro (minimum)
  - 2GB RAM (recommended) or 1GB RAM (minimum)
  - 20GB SSD storage

## Initial Server Setup

1. **Launch EC2 Instance**:

   - AMI: Ubuntu Server 24.04 LTS
   - Instance Type: t2.small (recommended)
   - Security Group Settings:
     ```
     HTTP (80)    : 0.0.0.0/0
     HTTPS (443)  : 0.0.0.0/0
     SSH (22)     : Your IP
     ```

2. **Connect to Server**:
   ```bash
   chmod 400 brightlygang.pem
   ssh -i brightlygang.pem ubuntu@your-server-ip
   ```

## Automatic Deployment

We have two ways to deploy:

### 1. Using Deploy Script

```bash
# From your local machine
./scripts/deploy-vps.sh your-server-ip
```

This script will:

- Set up necessary directories
- Install required packages
- Configure Git and pull the repository
- Build and start the application

### 2. GitHub Webhook (Automatic Deployment)

The server is configured to automatically deploy when changes are pushed to the main branch.

#### How it Works:

1. Push changes to main branch
2. GitHub sends webhook to server
3. Server pulls changes and rebuilds application
4. Zero-downtime reload using PM2

## Manual Deployment Steps

If you need to deploy manually:

1. **Connect to Server**:

   ```bash
   ssh -i brightlygang.pem ubuntu@your-server-ip
   ```

2. **Update Code and Rebuild**:
   ```bash
   cd /var/www/brightly
   git pull
   npm install
   npx prisma generate
   npm run build
   pm2 reload brightly
   ```

## Environment Variables

Create `.env.production` on the server with:

```env
# Server-side Environment Variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=your-postgres-database-url

# Cloudinary
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-name

# Site URL
SITE_URL=http://your-server-ip
NEXT_PUBLIC_SITE_URL=http://your-server-ip

# Public variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Process Management (PM2)

Common PM2 commands:

```bash
# View application status
pm2 status

# View logs
pm2 logs brightly

# Restart application
pm2 reload brightly

# Monitor resources
pm2 monit
```

## Directory Structure

```
/var/www/brightly/
├── .next/           # Built Next.js application
├── node_modules/    # Dependencies
├── public/          # Static files
├── src/            # Source code
└── .env.production # Environment variables
```

## Troubleshooting

1. **Application Not Starting**:

   ```bash
   # Check logs
   pm2 logs brightly
   # Verify environment variables
   nano /var/www/brightly/.env.production
   ```

2. **Build Errors**:

   ```bash
   # Clean installation
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run build
   ```

3. **Git Issues**:
   ```bash
   # Verify branch tracking
   git branch -vv
   # Reset and pull
   git fetch origin
   git reset --hard origin/main
   ```

## Maintenance

### Backup

The server automatically backs up:

- Environment variables
- Nginx configuration
- Application state

### Monitoring

- Use `pm2 monit` for real-time monitoring
- Check logs with `pm2 logs brightly`
- Monitor system resources with `htop`

## Security Notes

1. Keep your `.pem` file secure
2. Never commit environment variables
3. Regularly update dependencies
4. Keep Ubuntu packages updated:
   ```bash
   sudo apt update
   sudo apt upgrade
   ```

## Useful Commands

```bash
# SSH into server
ssh -i brightlygang.pem ubuntu@your-server-ip

# View logs
pm2 logs brightly

# Check application status
pm2 status

# Monitor resources
pm2 monit

# Restart application
pm2 reload brightly

# View Nginx status
sudo systemctl status nginx
```

## Essential Commands & Navigation Guide

### SSH and Server Access

```bash
# Connect to server
ssh -i brightlygang.pem ubuntu@54.179.103.147

# Copy files to server
scp -i brightlygang.pem file.txt ubuntu@54.179.103.147:/var/www/brightly/

# Copy files from server
scp -i brightlygang.pem ubuntu@54.179.103.147:/var/www/brightly/file.txt ./
```

### Directory Navigation

```bash
# Go to application directory
cd /var/www/brightly

# List files including hidden ones
ls -la

# Check disk space
df -h

# Check directory size
du -sh /var/www/brightly
```

### Application Management

```bash
# Start application
pm2 start npm --name "brightly" -- start

# Stop application
pm2 stop brightly

# Restart application (with downtime)
pm2 restart brightly

# Reload application (zero downtime)
pm2 reload brightly

# Delete application from PM2
pm2 delete brightly

# List all applications
pm2 list

# Monitor all processes
pm2 monit

# View logs
pm2 logs brightly

# View only error logs
pm2 logs brightly --err

# Clear logs
pm2 flush
```

### Git Operations

```bash
# Check branch status
git branch -vv

# Pull latest changes
git pull origin main

# Force reset to match remote
git fetch origin
git reset --hard origin/main

# Check git configuration
git config --list

# View remote repositories
git remote -v
```

### Environment Variables

```bash
# Edit environment variables
nano /var/www/brightly/.env.production

# View environment variables
cat /var/www/brightly/.env.production

# Make backup of environment file
cp /var/www/brightly/.env.production /var/www/brightly/.env.production.backup
```

### Nginx Management

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### System Monitoring

```bash
# View system resources
htop

# View disk space
df -h

# View memory usage
free -h

# View running processes
ps aux | grep node

# View system logs
sudo journalctl -u nginx
sudo journalctl -u pm2-ubuntu
```

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Run Prisma migrations
npx prisma migrate deploy

# Reset database (careful!)
npx prisma reset

# View database status
npx prisma studio
```

### Troubleshooting Commands

```bash
# Check Node.js version
node -v

# Check npm version
npm -v

# Check PM2 version
pm2 -v

# View real-time logs
pm2 logs brightly --lines 100

# Check application errors
pm2 logs brightly --err --lines 100

# Monitor CPU/Memory usage
pm2 monit

# List all processes using port 3000
sudo lsof -i :3000

# Kill process using port 3000
sudo kill $(sudo lsof -t -i:3000)
```

### Maintenance Commands

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean npm cache
npm cache clean --force

# Clear PM2 logs
pm2 flush

# View disk usage by directory
du -h --max-depth=1 /var/www/brightly

# Remove old builds
rm -rf .next
rm -rf node_modules/.cache
```

### Quick Reference for Common Tasks

#### Deploying Updates

```bash
cd /var/www/brightly
git pull
npm install
npx prisma generate
npm run build
pm2 reload brightly
```

#### Checking Application Health

```bash
# Check if application is running
pm2 status

# View recent logs
pm2 logs brightly --lines 50

# Monitor resources
pm2 monit

# Check Nginx status
sudo systemctl status nginx
```

#### Backup Important Files

```bash
# Backup env file
cp .env.production .env.production.backup

# Backup Nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Create deployment directory backup
tar -czf ~/backup-$(date +%Y%m%d).tar.gz /var/www/brightly
```
