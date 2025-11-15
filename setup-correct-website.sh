#!/bin/bash

# Setup Correct LocalLoop Website from gh-pages branch
# This script moves the actual website to localloop.app repo

set -e

WEBSITE_REPO_NAME="localloop.app"
TEMP_DIR="/tmp/localloop-correct-website"
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 Setting up CORRECT LocalLoop website from gh-pages branch..."
echo ""

# Step 1: Create temporary directory
echo "📁 Creating temporary directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Step 2: Copy files from gh-pages branch without checking it out
echo "📋 Copying website files from gh-pages branch..."
git show origin/gh-pages:index.html > "$TEMP_DIR/index.html"
git show origin/gh-pages:styles.css > "$TEMP_DIR/styles.css"
git show origin/gh-pages:main.jsx > "$TEMP_DIR/main.jsx"
git show origin/gh-pages:logo.svg > "$TEMP_DIR/logo.svg"
git show origin/gh-pages:logo.png > "$TEMP_DIR/logo.png"
git show origin/gh-pages:mockup.svg > "$TEMP_DIR/mockup.svg"
git show origin/gh-pages:404.html > "$TEMP_DIR/404.html"
git show origin/gh-pages:404.jsx > "$TEMP_DIR/404.jsx"
git show origin/gh-pages:contact.html > "$TEMP_DIR/contact.html"
git show origin/gh-pages:contact.jsx > "$TEMP_DIR/contact.jsx"
git show origin/gh-pages:policy.html > "$TEMP_DIR/policy.html"
git show origin/gh-pages:policy.jsx > "$TEMP_DIR/policy.jsx"
git show origin/gh-pages:config.js > "$TEMP_DIR/config.js" 2>/dev/null || echo ""
git show origin/gh-pages:error-404.json > "$TEMP_DIR/error-404.json"
git show origin/gh-pages:about.html > "$TEMP_DIR/about.html" 2>/dev/null || echo ""
git show origin/gh-pages:privacy.html > "$TEMP_DIR/privacy.html" 2>/dev/null || echo ""
git show origin/gh-pages:terms.html > "$TEMP_DIR/terms.html" 2>/dev/null || echo ""

# Copy screens folder
mkdir -p "$TEMP_DIR/screens"
for file in events.svg feed.svg market.svg; do
    git show "origin/gh-pages:screens/$file" > "$TEMP_DIR/screens/$file" 2>/dev/null || echo ""
done

echo "✅ Copied all website files"

# Step 3: Create README
echo "📝 Creating README..."
cat > "$TEMP_DIR/README.md" << 'EOF'
# LocalLoop Website

Official website for LocalLoop - South Africa's Hyperlocal Social Network

🌍 **Live Site**: [mhalesto.github.io/localloop.app](https://mhalesto.github.io/localloop.app)
🔗 **Custom Domain** (when configured): [localloop.app](https://localloop.app)

## About LocalLoop

LocalLoop connects communities across South African cities and towns. Share local stories, discover events, find services, and connect with neighbors.

### Features

- 📍 City-based community feeds
- 🎨 AI-powered profile avatars (GPT-4o Vision)
- 📅 Local events calendar
- 🛍️ Community marketplace
- 💬 Real-time discussions
- 🌈 Customizable themes
- 🔔 Smart notifications

## Website Structure

```
├── index.html          # Homepage - main landing page
├── about.html          # About page
├── contact.html        # Contact form
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
├── 404.html           # 404 error page with Lottie animation
├── styles.css         # Global styles
├── main.jsx           # Main JavaScript (React)
├── logo.svg/png       # LocalLoop logos
├── mockup.svg         # App mockup illustration
├── error-404.json     # Lottie 404 animation
└── screens/           # App screenshots (SVG)
```

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **React 18** - UI components (via Babel standalone)
- **Lottie** - Smooth animations
- **Responsive Design** - Mobile-first approach

## Local Development

```bash
# Clone the repository
git clone https://github.com/mhalesto/localloop.app.git
cd localloop.app

# Serve locally
npx serve .
# Or use Python
python3 -m http.server 8000

# Open http://localhost:8000
```

## Deployment

**Automatic**: GitHub Pages deploys from `main` branch automatically.

Every push to `main` triggers a deployment to:
- https://mhalesto.github.io/localloop.app

## Custom Domain Setup

### DNS Configuration for localloop.app

**A Records** (apex domain):
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**CNAME Record** (www subdomain):
```
www → mhalesto.github.io
```

### GitHub Settings

1. Go to repo **Settings** → **Pages**
2. Add custom domain: `localloop.app`
3. Enable **Enforce HTTPS**
4. Wait for DNS verification (can take 24-48 hours)

## Content Updates

### Updating Text Content
- Edit respective HTML files directly
- Use React JSX components for dynamic sections

### Updating Styles
- Modify `styles.css` for global styles
- Inline styles in HTML for page-specific changes

### Adding Pages
1. Create new `.html` file
2. Link from navigation in `index.html`
3. Follow existing page structure

## Contact Forms

Contact form submissions are handled via:
- FormSpree (if configured)
- Or custom backend endpoint

Update form action in `contact.html` as needed.

## License

© 2024 LocalLoop. All rights reserved.

---

🇿🇦 Proudly built in South Africa
EOF

# Step 4: Create .gitignore
cat > "$TEMP_DIR/.gitignore" << 'EOF'
# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*

# Temporary files
*.tmp
.temp/

# Backup files
*.bak
*~
EOF

# Step 5: Initialize git repo
echo "🔧 Initializing git repository..."
cd "$TEMP_DIR"
git init
git add .
git commit -m "Initial commit: LocalLoop website from gh-pages

Migrated complete website from main repo's gh-pages branch:
- Homepage with hero section and features
- About, Contact, Privacy, Terms pages
- 404 page with Lottie animation
- Responsive design
- App screenshots and mockups
- React JSX components

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Step 6: Add remote
echo "🔗 Adding remote repository..."
git remote add origin "https://github.com/mhalesto/$WEBSITE_REPO_NAME.git"
git branch -M main

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Push to GitHub:"
echo "   cd $TEMP_DIR"
echo "   git push -f origin main"
echo ""
echo "2. Enable GitHub Pages:"
echo "   • Go to: https://github.com/mhalesto/$WEBSITE_REPO_NAME/settings/pages"
echo "   • Source: Deploy from 'main' branch"
echo "   • Click Save"
echo ""
echo "3. (Optional) Add custom domain:"
echo "   • Custom domain: localloop.app"
echo "   • Configure DNS records (see README.md)"
echo ""
echo "Website ready at: $TEMP_DIR"
