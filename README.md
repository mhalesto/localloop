# toilet

## Brand assets

The LocalLoop icon set lives in `assets/`:

- `icon.png`: iOS / general app icon (1024×1024)
- `adaptive-icon.png`: Android adaptive icon foreground (1024×1024)
- `favicon.png`: marketing/landing page usage (96×96)
- `logo.svg`: master vector mark

Regenerate them with:

```bash
npm run generate:icons
```

---

## Premium summarization backend

The premium composer now supports AI-assisted summaries backed by a lightweight Express service that wraps the `facebook/bart-large-cnn` model.

### Running the server

1. Install Expo app dependencies: `npm install`
2. Start the summarization service (the script installs backend dependencies on first run): `npm run server`
   - If you prefer working from the backend folder directly, run `npm run server` after `cd backend`.
3. The server defaults to `http://localhost:4000` and exposes `POST /summaries`

If you prefer to prime the backend ahead of time, run `npm run server:install` before starting it.

### Expo client configuration

The mobile client reads the backend URL from `EXPO_PUBLIC_SUMMARY_API_URL`. When this variable is not set the app now inspects the Expo host information and automatically points native builds to the Metro server's LAN IP (e.g. `http://192.168.0.42:4000`). This means the summarizer works out of the box on physical devices without any additional setup. The web build still defaults to `http://localhost:4000`.

You can always override the detection logic explicitly:

```bash
EXPO_PUBLIC_SUMMARY_API_URL="http://localhost:4000" npm run web
```

With the service running, premium users can tap **Summarize description** in the composer to generate condensed copy via BART.
When model downloads are unavailable the backend falls back to an on-device extractive summarizer that respects the same
length preferences. Premium members can choose between *Shorter*, *Balanced*, or *Longer* summaries from the **AI description
summaries** section in Settings to control how much detail the assistant retains.

## Hugging Face moderation

Posts are now screened with Hugging Face text-classification models before they are queued for publication. Configure your
API key with an Expo public env variable so the client can call the Inference API:

```bash
EXPO_PUBLIC_HF_API_KEY="hf_your_token_here" npm run web
```

If the key is not set the app falls back to allowing the post while logging a warning, so make sure to add the variable in
development and production builds. The moderation service labels content for toxicity, hate/harassment, sexual/NSFW, and
self-harm signals—posts above the block threshold are stopped, while borderline content is sent for moderator review and
tagged on the post object for admin tooling.
