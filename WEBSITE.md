# LocalLoop Website

The LocalLoop website has been moved to a separate public repository for GitHub Pages hosting.

## Website Repository

**Repo**: [github.com/mhalesto/localloop.app](https://github.com/mhalesto/localloop.app)
**Live Site**: [localloop.app](https://localloop.app)

## Why Separate Repos?

- **Security**: App code (API keys, Firebase config) remains private
- **Deployment**: Website can be public for GitHub Pages
- **Organization**: Cleaner separation of concerns
- **CI/CD**: Independent deployment workflows

## Making Website Changes

### Option 1: Clone website repo separately
```bash
cd ~/Documents/GitHub
git clone https://github.com/mhalesto/localloop.app.git
cd localloop.app
# Make changes
git add .
git commit -m "Update website"
git push
```

### Option 2: Keep local copy synced (recommended)
The `localloop-site/` folder still exists locally but is ignored by git in the main repo.

To sync changes:
```bash
# 1. Make changes in localloop-site/
# 2. Copy to website repo
cp -r localloop-site/* /tmp/localloop-website-setup/
cd /tmp/localloop-website-setup
git add .
git commit -m "Update website content"
git push
```

## GitHub Pages Setup

1. Go to [repo settings](https://github.com/mhalesto/localloop.app/settings/pages)
2. Source: Deploy from `main` branch
3. Custom domain: `localloop.app`
4. Enforce HTTPS: ✅

## DNS Configuration

For `localloop.app` domain:

### Apex domain (@)
Add A records:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### WWW subdomain
Add CNAME record:
```
www  →  mhalesto.github.io
```

## Automatic Sync (Future Enhancement)

You can set up a GitHub Action to automatically sync website changes from main repo to website repo. Let me know if you want to implement this!

---

📝 **Note**: The website folder (`localloop-site/`) is kept locally for convenience but is not tracked in the main app repository.
