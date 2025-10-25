# toilet

## Premium summarization backend

The premium composer now supports AI-assisted summaries backed by a lightweight Express service that wraps the `Xenova/distilbart-cnn-6-6` transformer (a distilled BART model published with JavaScript-friendly ONNX weights).

### Running the server

1. Install Expo app dependencies: `npm install`
2. Start the summarization service (the script installs backend dependencies on first run): `npm run server`
   - If you prefer working from the backend folder directly, run `npm run server` after `cd backend`.
3. The server defaults to `http://localhost:4000` and exposes `POST /summaries`

If you prefer to prime the backend ahead of time, run `npm run server:install` before starting it. The backend exposes a `SUMMARIZER_MODEL_ID` override in case you want to experiment with different Hugging Face checkpoints as well as a `SUMMARIZER_MODEL_QUANTIZED` flag (`true`/`false`) to toggle quantized weights.

### Expo client configuration

The mobile client reads the backend URL from `EXPO_PUBLIC_SUMMARY_API_URL`. When this variable is not set the app now inspects the Expo host information and automatically points native builds to the Metro server's LAN IP (e.g. `http://192.168.0.42:4000`). This means the summarizer works out of the box on physical devices without any additional setup. The web build still defaults to `http://localhost:4000`.

You can always override the detection logic explicitly:

```bash
EXPO_PUBLIC_SUMMARY_API_URL="http://localhost:4000" npm run web
```

With the service running, premium users can tap **Summarize description** in the composer to generate condensed copy via the distilled BART model.
When model downloads are unavailable the backend falls back to an on-device extractive summarizer that respects the same
length preferences. Premium members can choose between *Shorter*, *Balanced*, or *Longer* summaries from the **AI description
summaries** section in Settings to control how much detail the assistant retains.
