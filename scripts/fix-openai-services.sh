#!/bin/bash

# Script to update all OpenAI services to use the new config
# This fixes environment variable loading issues in React Native/Expo

echo "Fixing OpenAI services..."

SERVICES_DIR="../services/openai"

# List of services to update
services=(
  "translationService.js"
  "commentSuggestionService.js"
  "autoTaggingService.js"
  "embeddingsService.js"
  "qualityScoringService.js"
  "threadSummarizationService.js"
  "contentAnalysisService.js"
)

for service in "${services[@]}"; do
  file="$SERVICES_DIR/$service"
  if [ -f "$file" ]; then
    echo "Updating $service..."

    # Add import statement at the top (after the header comment)
    sed -i '' '/^\/\*\*/,/\*\//a\
\
import { getOpenAIHeaders, OPENAI_ENDPOINTS } from '"'"'./config'"'"';
' "$file"

    # Replace const OPENAI_CHAT_URL or similar
    sed -i '' 's/const OPENAI_CHAT_URL = .*/\/\/ Using OPENAI_ENDPOINTS.CHAT from config/g' "$file"
    sed -i '' 's/const OPENAI_.*_URL = .*/\/\/ Using OPENAI_ENDPOINTS from config/g' "$file"

    # Replace apiKey checks
    sed -i '' '/const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;/d' "$file"
    sed -i '' '/if (!apiKey) {/,/}/d' "$file"

    # Replace fetch headers
    sed -i '' "s/'Authorization': \`Bearer \${apiKey}\`,/...getOpenAIHeaders(),/g" "$file"
    sed -i '' "s/'Content-Type': 'application\/json',//g" "$file"

    # Replace fetch URLs
    sed -i '' 's/OPENAI_CHAT_URL/OPENAI_ENDPOINTS.CHAT/g' "$file"
    sed -i '' 's/OPENAI_MODERATION_URL/OPENAI_ENDPOINTS.MODERATION/g' "$file"
    sed -i '' 's/OPENAI_EMBEDDINGS_URL/OPENAI_ENDPOINTS.EMBEDDINGS/g' "$file"

    echo "✓ Updated $service"
  else
    echo "⚠ Skipping $service (not found)"
  fi
done

echo ""
echo "Done! Please review the changes and test your OpenAI functions."
echo ""
echo "To test if OpenAI is configured:"
echo "  import { isOpenAIConfigured } from './services/openai';"
echo "  console.log('OpenAI configured:', isOpenAIConfigured());"
