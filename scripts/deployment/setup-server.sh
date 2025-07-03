#!/bin/bash

# Exit on any error
set -e

echo "Starting server setup..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/brightly
sudo chown ubuntu:ubuntu /var/www/brightly

# Install nginx
sudo apt install -y nginx

# Configure nginx
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx

# Clone repository (if not already done)
if [ ! -d "/var/www/brightly/.git" ]; then
    cd /var/www/brightly
    git clone https://github.com/epicfacedood/edcel.git .
fi

# Install dependencies
cd /var/www/brightly
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Setup PM2 for the main application
pm2 start npm --name "brightly-production" -- start
pm2 save

# Setup webhook server
cd /var/www/brightly
pm2 start scripts/deployment/webhook-server.js --name "github-webhook"
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

echo "Server setup completed!"
echo "Don't forget to:"
echo "1. Set up environment variables in /var/www/brightly/.env.production"
echo "2. Configure the GitHub webhook with the server URL and secret"
echo "3. Update the nginx configuration with your domain name" 