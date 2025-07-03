#!/bin/bash

# Exit on any error
set -e

echo "Setting up Nginx configuration..."

# Ensure Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Create Nginx log directory if it doesn't exist
sudo mkdir -p /var/log/nginx

# Create cache directory for static files
sudo mkdir -p /var/cache/nginx
sudo chown -R www-data:www-data /var/cache/nginx

# Backup existing config if it exists
if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# Add cache configuration
sudo tee /etc/nginx/conf.d/proxy-cache.conf > /dev/null << 'EOF'
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m inactive=7d use_temp_path=off;
EOF

# Copy our Nginx configuration
sudo cp config/nginx/brightly.conf /etc/nginx/sites-available/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx to apply changes
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx configuration completed successfully!"

# Show status
sudo systemctl status nginx 