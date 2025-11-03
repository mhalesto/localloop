# LocalLoop Landing Site

Static React-powered marketing site for the LocalLoop neighborhood app. The site is built with CDN-hosted React and ships as plain HTML, CSS, and JSX files so it can be published directly to GitHub Pages without a build step.

## Local development

```bash
cd localloop-site
npx serve .    # or python3 -m http.server 3000
```

Open `http://localhost:3000/index.html` in your browser.

## Deploying to GitHub Pages

1. Commit the contents of this folder and push to your repository.
2. In GitHub, open **Settings → Pages**.
3. Choose the branch you want to publish from (commonly `main` or `gh-pages`) and set the folder to `/localloop-site`.
4. Save. GitHub will build and host the site at `https://<your-org>.github.io/<repo>/`.

If your backend is hosted on a different domain, set the API base before serving the pages:

```html
<script>
  window.LOCALLOOP_API_BASE_URL = 'https://your-backend.example.com';
</script>
```

The contact form looks for `window.LOCALLOOP_API_BASE_URL` or the value in `config.js` and sends a `POST` request to `/contact/messages`.

## Structure

- `index.html`: Main marketing page showcasing LocalLoop.
- `policy.html`: Privacy, data, and community policy reference suitable for Google Play submission.
- `contact.html`: Tier breakdown plus lead capture form wired to the backend email endpoint.
- `main.jsx` / `policy.jsx`: React entry files rendered via Babel Standalone.
- `styles.css`: Shared design system for both pages.
- `logo.svg`, `mockup.svg`: Lightweight branded assets.
- `screens/`: Faux app screenshots for the product tour.
- `config.js`: Optional override for hosting-specific configuration like API base URLs.
