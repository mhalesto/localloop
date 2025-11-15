#!/bin/bash

# Setup LocalLoop Website Repository
# This script moves the website to a new public repo for GitHub Pages

set -e  # Exit on error

WEBSITE_REPO_NAME="localloop.app"
WEBSITE_DIR="localloop-site"
TEMP_DIR="/tmp/localloop-website-setup"

echo "🚀 Setting up LocalLoop website repository..."
echo ""

# Step 1: Create temporary directory
echo "📁 Creating temporary directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Step 2: Copy website files
echo "📋 Copying website files..."
cp -r "$WEBSITE_DIR"/* "$TEMP_DIR/"
cp "$WEBSITE_DIR/.gitignore" "$TEMP_DIR/" 2>/dev/null || echo "# LocalLoop Website" > "$TEMP_DIR/.gitignore"

# Step 3: Create README for website repo
echo "📝 Creating README..."
cat > "$TEMP_DIR/README.md" << 'EOF'
# LocalLoop Website

Official website for LocalLoop - Your South African Hyperlocal Social Network

🌍 **Live Site**: [localloop.app](https://localloop.app)

## About LocalLoop

LocalLoop is South Africa's premier hyperlocal social network, connecting communities across cities and towns. Share local stories, discover events, find services, and connect with neighbors in your area.

### Features

- 📍 City-based community feeds
- 🎨 AI-powered profile avatars
- 📅 Local events calendar
- 🛍️ Community marketplace
- 💬 Real-time discussions
- 🌈 Customizable themes

## Website Structure

```
├── index.html          # Homepage
├── contact.html        # Contact page
├── policy.html         # Privacy policy
├── 404.html           # 404 error page
├── styles.css         # Global styles
├── main.jsx           # Main JavaScript (React)
├── screens/           # App screenshots
└── error-404.json     # 404 animation
```

## Development

This is a static website built with:
- HTML5
- CSS3
- React (via JSX)
- Lottie animations

### Local Development

1. Clone the repository
2. Open `index.html` in a browser
3. For React JSX:
   ```bash
   # Use a local server
   npx serve .
   ```

## Deployment

This site is automatically deployed to GitHub Pages from the `main` branch.

### Custom Domain Setup

1. Domain: `localloop.app`
2. DNS Configuration:
   - Add CNAME record: `www` → `mhalesto.github.io`
   - Add A records for apex domain:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

## Contributing

This website is part of the LocalLoop project. For bug reports or feature requests, please contact us through the app or website.

## License

© 2024 LocalLoop. All rights reserved.

---

Built with ❤️ in South Africa 🇿🇦
EOF

# Step 4: Initialize git repo
echo "🔧 Initializing git repository..."
cd "$TEMP_DIR"
git init
git add .
git commit -m "Initial commit: LocalLoop website

- Landing page with app showcase
- Contact form
- Privacy policy
- 404 page with animations
- Responsive design
- App screenshots

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Step 5: Add remote (you created this repo already)
echo "🔗 Adding remote repository..."
git remote add origin "https://github.com/mhalesto/$WEBSITE_REPO_NAME.git"
git branch -M main

# Step 6: Push to GitHub
echo "⬆️  Pushing to GitHub..."
echo ""
echo "Run this command to push:"
echo "  cd $TEMP_DIR"
echo "  git push -u origin main"
echo ""
echo "Then enable GitHub Pages:"
echo "  1. Go to https://github.com/mhalesto/$WEBSITE_REPO_NAME/settings/pages"
echo "  2. Under 'Source', select 'main' branch"
echo "  3. Click 'Save'"
echo "  4. Add custom domain: localloop.app"
echo ""
echo "✅ Setup complete! Website files are in: $TEMP_DIR"
echo ""
echo "📝 Next steps:"
echo "  1. Push to GitHub (see command above)"
echo "  2. Enable GitHub Pages in repo settings"
echo "  3. Configure custom domain DNS"
echo "  4. Update main repo's .gitignore to exclude website folder"
