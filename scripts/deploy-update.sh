#!/bin/bash

# GitHub Update Deployment Script
# This script builds your app and creates a GitHub release with the bundle

set -e

# Configuration
REPO_OWNER="Deartaj92"  # Replace with your GitHub username
REPO_NAME="DearTaj"        # Replace with your repository name
BUNDLE_NAME="app-bundle.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment process...${NC}"

# Check if required tools are installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}📦 Building version: ${VERSION}${NC}"

# Build the React app
echo -e "${YELLOW}🔨 Building React app...${NC}"
npm run build

# Create bundle directory if it doesn't exist
mkdir -p bundles

# Create the bundle (this would be done by Capacitor Live Updates)
echo -e "${YELLOW}📦 Creating update bundle...${NC}"
# Note: In a real scenario, you would use:
# npx cap live-updates bundle
# For now, we'll create a placeholder bundle
cd build
zip -r "../bundles/${BUNDLE_NAME}" . -x "*.map" "*.DS_Store"
cd ..

# Check if bundle was created
if [ ! -f "bundles/${BUNDLE_NAME}" ]; then
    echo -e "${RED}❌ Bundle creation failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bundle created successfully${NC}"

# Create GitHub release
echo -e "${YELLOW}📝 Creating GitHub release...${NC}"

# Create release notes
RELEASE_NOTES="## What's New in v${VERSION}

- Bug fixes and improvements
- Performance optimizations
- UI/UX enhancements

## Installation
This update will be automatically downloaded and installed when you restart the app."

# Create the release
gh release create "v${VERSION}" \
    "bundles/${BUNDLE_NAME}" \
    --title "Release v${VERSION}" \
    --notes "${RELEASE_NOTES}" \
    --latest

echo -e "${GREEN}🎉 Release v${VERSION} created successfully!${NC}"
echo -e "${GREEN}📱 Users will now be notified of the update.${NC}"

# Clean up
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf bundles/

echo -e "${GREEN}✨ Deployment complete!${NC}"
