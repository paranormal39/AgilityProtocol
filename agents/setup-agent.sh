#!/bin/bash

# Agility Summit Privacy E-commerce AI Agent Setup
# This script sets up the ElizaOS agent with Midnight MCP integration

echo "🚀 Setting up Agility Summit Privacy E-commerce AI Agent..."

# Check if ElizaOS CLI is installed
if ! command -v elizaos &> /dev/null; then
    echo "📦 Installing ElizaOS CLI..."
    npm install -g @elizaos/cli@beta
else
    echo "✅ ElizaOS CLI already installed"
fi

# Create the agent project
echo "🏗️ Creating ElizaOS agent project..."
cd agents/
elizaos create -t project agility-privacy-agent

# Navigate to the project
cd agility-privacy-agent/

# Install MCP plugin
echo "🔌 Installing MCP plugin for ElizaOS..."
bun add @fleek-platform/eliza-plugin-mcp

# Install additional dependencies for privacy features
echo "📚 Installing additional dependencies..."
bun add crypto-js
bun add @midnight-ntwrk/compact-runtime

echo "✅ Agent setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure character.json with privacy-KYC contract integration"
echo "2. Set up MCP server connection for Midnight blockchain"
echo "3. Add custom privacy-preserving e-commerce workflows"
echo ""
echo "To start development:"
echo "cd agents/agility-privacy-agent"
echo "elizaos dev"
