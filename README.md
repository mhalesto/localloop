# toilet

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
