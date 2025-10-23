# toilet

## Premium summarization backend

The premium composer now supports AI-assisted summaries backed by a lightweight Express service that wraps the `facebook/bart-large-cnn` model.

### Running the server

1. Install Expo app dependencies: `npm install`
2. Install backend dependencies: `npm run server:install`
3. Start the summarization service: `npm run server`
4. The server defaults to `http://localhost:4000` and exposes `POST /summaries`

### Expo client configuration

The mobile client reads the backend URL from `EXPO_PUBLIC_SUMMARY_API_URL`. When this variable is not set it falls back to `http://localhost:4000`.

```bash
EXPO_PUBLIC_SUMMARY_API_URL="http://localhost:4000" npm run web
```

With the service running, premium users can tap **Summarize description** in the composer to generate condensed copy via BART.
