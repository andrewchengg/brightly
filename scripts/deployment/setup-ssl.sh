#!/bin/bash

# Exit on any error
set -e

# Check if domain name is provided
if [ -z "$1" ]; then
    echo "Please provide a domain name as an argument"
    echo "Usage: $0 yourdomain.com"
    exit 1
fi

DOMAIN=$1

echo "Setting up SSL for $DOMAIN..."

# Install certbot
echo "Installing certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Backup Nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.ssl

# Update server_name in Nginx config
sudo sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/default

# Test Nginx config
sudo nginx -t

# Reload Nginx to apply server_name
sudo systemctl reload nginx

# Get SSL certificate
echo "Obtaining SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Enable automatic renewal
echo "Setting up automatic renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test automatic renewal
echo "Testing certificate renewal..."
sudo certbot renew --dry-run

echo "SSL setup completed successfully!"
echo "Your site should now be accessible at https://$DOMAIN"

# Show certificate expiry
echo "Certificate details:"
sudo certbot certificates 