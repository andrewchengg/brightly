#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment fixes..."

# Install canvas dependencies
echo "Installing canvas dependencies..."
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    python3

# Navigate to application directory
cd /var/www/brightly

# Install canvas module
echo "Installing canvas module..."
npm install canvas

# Fix Nginx configuration
echo "Fixing Nginx configuration..."

# Create cache directory if it doesn't exist
sudo mkdir -p /var/cache/nginx

# Create Nginx configuration with proxy cache
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Logging Settings
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_disable "msie6";

    # Proxy Cache Settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m max_size=10g inactive=60m use_temp_path=off;

    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Copy our application config
sudo cp /var/www/brightly/config/nginx/brightly.conf /etc/nginx/sites-available/default

# Test and reload Nginx
echo "Testing Nginx configuration..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

# Clean and rebuild the application
echo "Rebuilding application..."
rm -rf .next
npm install
npx prisma generate
npm run build

# Restart PM2
echo "Restarting PM2..."
pm2 reload brightly-production

echo "Deployment fixes completed!" 