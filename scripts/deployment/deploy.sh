#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment..."

# Navigate to application directory
cd /var/www/brightly

# Pull latest changes
git pull origin main

# Run deployment fixes if needed
if [ ! -f /etc/nginx/nginx.conf.fixed ] || [ ! -d node_modules/canvas ]; then
    echo "Running deployment fixes..."
    ./scripts/deployment/fix-deployment.sh
    sudo touch /etc/nginx/nginx.conf.fixed
fi

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Stop any existing PM2 processes
pm2 delete all || true

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "brightly-production",
    cwd: "/var/www/brightly",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    exec_mode: "fork",
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    watch: false
  }]
}
EOF

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup Nginx
./scripts/deployment/setup-nginx.sh

echo "Deployment completed successfully!" 