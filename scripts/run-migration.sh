#!/bin/bash

echo "🚀 Starting complete migration process for isRefactored field..."

# Step 1: Generate Prisma client with the new schema
echo "📦 Step 1: Generating Prisma client with updated schema..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ Failed to generate Prisma client. Please check your schema for errors."
  exit 1
fi

echo "✅ Prisma client generated successfully!"

# Step 2: Create and apply database migration
echo "📊 Step 2: Creating and applying database migration..."
npx prisma migrate dev --name add-isRefactored-field

if [ $? -ne 0 ]; then
  echo "❌ Failed to create/apply migration. Please check your database connection."
  exit 1
fi

echo "✅ Database migration created and applied successfully!"

# Step 3: Run the data migration script
echo "🔄 Step 3: Running data migration to populate isRefactored field..."
node scripts/migrate-isRefactored.js

if [ $? -ne 0 ]; then
  echo "❌ Failed to run data migration script."
  exit 1
fi

echo "✅ Data migration completed successfully!"

# Step 4: Regenerate Prisma client to ensure everything is in sync
echo "🔄 Step 4: Regenerating Prisma client to ensure sync..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ Failed to regenerate Prisma client."
  exit 1
fi

echo "✅ Final Prisma client generation completed!"

echo "🎉 Complete migration process finished successfully!"
echo ""
echo "Summary of changes:"
echo "- Added 'isRefactored' boolean field to Question model"
echo "- Set isRefactored = true for all questions where productionReady = true"
echo "- Set isRefactored = false for all questions where productionReady = false"
echo ""
echo "You can now use the isRefactored field in your application!" 