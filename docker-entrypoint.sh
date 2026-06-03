#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 || {
  echo "⚠️  Migration deploy failed, trying db push..."
  npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 || {
    echo "❌ Database migration failed!"
    exit 1
  }
}

echo "🚀 Starting Next.js application..."
exec node server.js
