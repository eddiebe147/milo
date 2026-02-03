#!/bin/bash
#
# MILO Release Script
# Builds the app and creates a GitHub release with all assets
#
# Usage:
#   ./scripts/release.sh              # Uses version from package.json
#   ./scripts/release.sh --draft      # Create as draft release
#   ./scripts/release.sh --prerelease # Mark as prerelease
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRAFT=""
PRERELEASE=""
for arg in "$@"; do
  case $arg in
    --draft)
      DRAFT="--draft"
      ;;
    --prerelease)
      PRERELEASE="--prerelease"
      ;;
  esac
done

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  MILO Release Script${NC}"
echo -e "${BLUE}  Version: ${VERSION}${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo -e "${RED}Error: Tag ${TAG} already exists.${NC}"
  echo "To re-release, delete the existing release and tag first:"
  echo "  gh release delete ${TAG} -y"
  echo "  git tag -d ${TAG}"
  echo "  git push origin :refs/tags/${TAG}"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 1: Build the app
echo -e "${BLUE}[1/4] Building macOS app...${NC}"
npm run build:mac

# Verify build artifacts exist
DMG_FILE="dist/MILO-${VERSION}-arm64.dmg"
ZIP_FILE="dist/MILO-${VERSION}-arm64-mac.zip"

if [[ ! -f "$DMG_FILE" ]]; then
  echo -e "${RED}Error: DMG file not found: ${DMG_FILE}${NC}"
  exit 1
fi

if [[ ! -f "$ZIP_FILE" ]]; then
  echo -e "${RED}Error: ZIP file not found: ${ZIP_FILE}${NC}"
  exit 1
fi

echo -e "${GREEN}  DMG: $(du -h "$DMG_FILE" | cut -f1)${NC}"
echo -e "${GREEN}  ZIP: $(du -h "$ZIP_FILE" | cut -f1)${NC}"

# Step 2: Generate release notes
echo -e "${BLUE}[2/4] Generating release notes...${NC}"

RELEASE_NOTES=$(cat <<EOF
## What's New

<!-- Add your changelog here -->

## Download

- **MILO-${VERSION}-arm64.dmg** - Drag to Applications folder to install
- **MILO-${VERSION}-arm64-mac.zip** - For auto-update mechanism

## System Requirements

- macOS 10.12 or later
- Apple Silicon (ARM64) Macs
- Claude API key (get one at claude.ai)
- Optional: Claude CLI for advanced task execution
EOF
)

# Create temp file for release notes
NOTES_FILE=$(mktemp)
echo "$RELEASE_NOTES" > "$NOTES_FILE"

# Open editor for release notes if interactive
if [[ -t 0 ]]; then
  echo -e "${YELLOW}Opening release notes in editor...${NC}"
  ${EDITOR:-nano} "$NOTES_FILE"
fi

# Step 3: Create GitHub release
echo -e "${BLUE}[3/4] Creating GitHub release...${NC}"

gh release create "$TAG" \
  --title "MILO ${TAG}" \
  --notes-file "$NOTES_FILE" \
  $DRAFT $PRERELEASE

rm "$NOTES_FILE"

# Step 4: Upload assets
echo -e "${BLUE}[4/4] Uploading release assets...${NC}"

echo "  Uploading DMG..."
gh release upload "$TAG" "$DMG_FILE" --clobber

echo "  Uploading ZIP..."
gh release upload "$TAG" "$ZIP_FILE" --clobber

# Done
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Release ${TAG} created successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "View release: https://github.com/eddiebe147/milo/releases/tag/${TAG}"
echo ""

# Show release info
gh release view "$TAG"
