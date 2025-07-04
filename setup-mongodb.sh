#!/bin/bash

echo "🐳 Setting up MongoDB with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Stop any existing MongoDB container
echo "🔄 Stopping existing MongoDB container..."
docker stop mongodb-gottafarm 2>/dev/null || true
docker rm mongodb-gottafarm 2>/dev/null || true

# Start MongoDB container
echo "🚀 Starting MongoDB container..."
docker run -d \
  --name mongodb-gottafarm \
  -p 27017:27017 \
  -v mongodb-gottafarm-data:/data/db \
  mongo:latest

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Check if MongoDB is running
if docker ps | grep -q mongodb-gottafarm; then
    echo "✅ MongoDB is running on localhost:27017"
    echo "📊 Database name: gottafarmemall"
    echo "📁 Collection: profile_snapshots"
else
    echo "❌ Failed to start MongoDB"
    exit 1
fi

echo ""
echo "🎉 MongoDB setup complete!"
echo "💡 To stop MongoDB: docker stop mongodb-gottafarm"
echo "💡 To start MongoDB: docker start mongodb-gottafarm"