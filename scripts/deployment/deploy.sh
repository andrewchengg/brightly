#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment..."

# Navigate to application directory
cd /var/www/brightly

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Reload the application (zero-downtime)
pm2 reload brightly-production --update-env

echo "Deployment completed successfully!" 