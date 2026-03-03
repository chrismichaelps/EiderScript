#!/bin/bash

# Exit on error
set -e

echo "Clearing caches and build artifacts..."

# Remove build directory
rm -rf dist

# Remove Vite and Node.js caches
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Remove Turbo cache if exists
rm -rf .turbo

# Remove TypeScript build info files
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo "Building project..."
pnpm run build

echo "Clean build complete!"