#!/bin/bash

# Exit on error
set -e

# Check if domain name is provided
if [ -z "$1" ]; then
    echo "Please provide a domain name as an argument"
    echo "Usage: ./deploy-ec2.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1

# Update system
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (matching your local version)
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js and npm installation
node --version
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install certbot for SSL
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/edcel
sudo chown -R ubuntu:ubuntu /var/www/edcel

# Setup Nginx configuration with optimizations for Next.js
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/edcel << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: *.cloudinary.com *.supabase.co; img-src 'self' data: blob: *.cloudinary.com;";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_min_length 1000;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static assets
    location /_next/static {
        alias /var/www/edcel/.next/static;
        expires 365d;
        access_log off;
    }

    # Cache public assets
    location /public {
        alias /var/www/edcel/public;
        expires 365d;
        access_log off;
    }
}
EOF

# Enable the site
echo "🌐 Enabling Nginx site..."
sudo ln -s /etc/nginx/sites-available/edcel /etc/nginx/sites-enabled/ || true
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
echo "🔒 Setting up SSL with Certbot..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Clone and setup application
echo "📥 Setting up application..."
cd /var/www/edcel

# Create production environment file
echo "🔧 Creating .env.production file..."
cat > .env.production << EOL
# Server-side Environment Variables
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=your-postgres-database-url

# Cloudinary
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name

# OpenAI (if used)
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Site URL
SITE_URL=https://$DOMAIN
NEXT_PUBLIC_SITE_URL=https://$DOMAIN

# Public variables (for backward compatibility)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EOL

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building the application..."
npm run build

# Setup PM2 ecosystem file
echo "📝 Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'edcel',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/edcel-error.log',
    out_file: '/var/log/pm2/edcel-out.log',
  }]
}
EOL

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown -R ubuntu:ubuntu /var/log/pm2

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 delete edcel || true
pm2 start ecosystem.config.js
pm2 save

# Setup log rotation
echo "📝 Setting up log rotation..."
sudo pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
pm2 set pm2-logrotate:compress true

# Setup startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should now be accessible at https://$DOMAIN"
echo ""
echo "⚠️ IMPORTANT: You need to update the .env.production file with your actual credentials!"
echo "📝 Edit the file at: /var/www/edcel/.env.production"
echo ""
echo "Monitoring Commands:"
echo "📊 View logs: pm2 logs edcel"
echo "📈 Monitor: pm2 monit"
echo "🔄 Restart app: pm2 restart edcel" 