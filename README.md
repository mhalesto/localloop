# LocalLoop

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

## AI summarization (no backend required)

LocalLoop now ships with a fully client/serverless summarization pipeline:

- **Gold** subscribers continue to use GPT‑4o via the Firebase `openAIProxy` function (style + tone aware).
- **Basic & Premium** users fall back to a fast on-device extractive summarizer—no separate Node/Express service or Hugging Face hosting is required.

The **AI description summaries** setting still lets everyone pick *Shorter*, *Balanced*, or *Longer* outputs, but setup is now as simple as keeping your OpenAI key configured in Firebase Functions; there is no `npm run server` step anymore.

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
