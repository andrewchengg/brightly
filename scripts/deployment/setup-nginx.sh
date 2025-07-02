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

# Backup existing config if it exists
if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

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