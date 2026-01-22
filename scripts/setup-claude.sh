#!/bin/bash

# MILO Setup Script for Claude Code
# Usage: bash scripts/setup-claude.sh YOUR_API_KEY
# Or: bash scripts/setup-claude.sh (will prompt for API key)

set -e

echo "🚀 MILO Setup"
echo "=============="
echo ""

# Check if API key provided as argument
if [ -z "$1" ]; then
    echo "Enter your Anthropic API key (from claude.ai):"
    read -p "API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "❌ API key is required"
        exit 1
    fi
else
    API_KEY="$1"
fi

# Validate API key format
if [[ ! "$API_KEY" =~ ^sk-ant- ]]; then
    echo "⚠️  Warning: API key should start with 'sk-ant-'"
    echo "   Make sure you copied it correctly from claude.ai"
fi

echo ""
echo "📦 Setting up MILO..."
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js from nodejs.org"
    exit 1
fi

npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Configure environment
echo "Step 2: Configuring environment..."
export ANTHROPIC_API_KEY="$API_KEY"
echo "✓ API key configured"
echo ""

# Step 3: Check if dev server or desktop app
echo "Step 3: Choose how to run MILO:"
echo "  1) Web (browser at localhost:5173)"
echo "  2) Desktop (Electron app)"
echo ""
read -p "Enter choice (1 or 2) [default: 1]: " RUN_MODE
RUN_MODE=${RUN_MODE:-1}

echo ""
if [ "$RUN_MODE" = "2" ]; then
    echo "🖥️  Starting MILO Desktop App..."
    echo ""
    npm run dev
else
    echo "🌐 Starting MILO Web Version..."
    echo ""
    echo "Opening http://localhost:5173 in your browser..."
    npm run dev:web &
    sleep 3

    # Try to open in browser (macOS)
    if command -v open &> /dev/null; then
        open "http://localhost:5173"
    fi

    # Keep dev server running
    wait
fi
