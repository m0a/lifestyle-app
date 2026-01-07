#!/bin/bash
# Helper script to run integration tests with backend

set -e

echo "🚀 Starting integration test environment..."
echo ""

# Check if backend is already running
if curl -s http://localhost:8787/health > /dev/null 2>&1; then
  echo "✅ Backend is already running on port 8787"
  echo ""
  echo "Running integration tests..."
  pnpm test:integration
else
  echo "⚠️  Backend is not running on port 8787"
  echo ""
  echo "Please start the backend first:"
  echo "  pnpm dev:backend"
  echo ""
  echo "Then run integration tests:"
  echo "  pnpm test:integration"
  exit 1
fi
