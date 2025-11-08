#!/bin/bash

# Deploy Gold Tier Features to Firebase
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 LocalLoop Gold Tier Deployment Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ Error: OPENAI_API_KEY environment variable not set${NC}"
    echo ""
    echo "Please set your OpenAI API key:"
    echo "export OPENAI_API_KEY='sk-your-openai-api-key-here'"
    echo ""
    echo "Or run:"
    echo "OPENAI_API_KEY='sk-your-key' ./scripts/deploy-gold-features.sh"
    exit 1
fi

echo -e "${GREEN}✓${NC} OpenAI API key found"

# Verify Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✓${NC} Firebase CLI installed"

# Verify user is logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Not logged into Firebase"
    echo "Running: firebase login"
    firebase login
fi

echo -e "${GREEN}✓${NC} Logged into Firebase"

# Get current project
PROJECT=$(firebase use)
echo ""
echo "Current Firebase project: ${PROJECT}"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠${NC} This will:"
echo "  1. Set OpenAI API key in Firebase config"
echo "  2. Deploy OpenAI proxy function"
echo "  3. Test the deployment"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Step 1: Setting OpenAI API key in Firebase config..."
echo "---------------------------------------------------"

# Set the API key (mask it in output)
MASKED_KEY="${OPENAI_API_KEY:0:8}...${OPENAI_API_KEY: -4}"
echo "Setting key: $MASKED_KEY"

firebase functions:config:set openai.key="$OPENAI_API_KEY"

echo -e "${GREEN}✓${NC} API key configured"
echo ""

echo "Step 2: Deploying Firebase Functions..."
echo "----------------------------------------"

cd functions
npm install
cd ..

firebase deploy --only functions:openAIProxy

echo -e "${GREEN}✓${NC} Functions deployed"
echo ""

echo "Step 3: Verifying deployment..."
echo "-------------------------------"

# Get function URL
FUNCTION_URL=$(firebase functions:list | grep openAIProxy | awk '{print $4}')

if [ -z "$FUNCTION_URL" ]; then
    echo -e "${YELLOW}⚠${NC} Could not automatically verify function URL"
    echo "Please check Firebase Console:"
    echo "https://console.firebase.google.com/project/${PROJECT}/functions"
else
    echo -e "${GREEN}✓${NC} Function URL: $FUNCTION_URL"
fi

echo ""
echo "Step 4: Testing OpenAI connection..."
echo "------------------------------------"

# Create test config
cat > /tmp/test-openai-config.json <<EOF
{
  "openai": {
    "key": "$OPENAI_API_KEY"
  }
}
EOF

echo "Created test config (will be deleted)"

# Note: Actual testing requires authentication token
echo -e "${YELLOW}⚠${NC} Full testing requires user authentication"
echo "To test manually:"
echo "  1. Log into your app"
echo "  2. Set a test user to Gold tier"
echo "  3. Try generating a summary or cartoon"
echo ""

# Cleanup
rm /tmp/test-openai-config.json

echo "========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Verify in Firebase Console:"
echo "     https://console.firebase.google.com/project/${PROJECT}/functions"
echo ""
echo "  2. Test Gold features in your app:"
echo "     - Set a user to Gold tier"
echo "     - Try AI summarization"
echo "     - Generate a cartoon avatar"
echo "     - Use Smart Post Composer"
echo ""
echo "  3. Monitor costs:"
echo "     https://platform.openai.com/usage"
echo ""
echo "  4. Check function logs:"
echo "     firebase functions:log --only openAIProxy"
echo ""
