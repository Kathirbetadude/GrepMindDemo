# GrepMind

A chat interface for GrepMind, built by GrepLabs. Dark mode by default, with a light mode toggle, styled after the GrepMind product UI.

## Files

- `index.html` — page structure
- `styles.css` — theme tokens, layout, animations (dark + light)
- `app.js` — sidebar/theme behavior, local chat history, message sending
- `api/chat.js` — Vercel serverless function that proxies chat to the real Anthropic API

## Run locally

Just open `index.html` in a browser — no build step needed. The chat will use a local fallback reply until the API route is live (that only works once deployed on Vercel, or via `vercel dev`).

## Deploy: GitHub → Vercel

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import that repo.
3. Framework preset: **Other** (no build command needed — it's static + one serverless function).
4. Before or after the first deploy, go to **Project Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
5. Redeploy. `/api/chat` will now return real GrepMind replies.

Without the key set, the UI still works — it just shows a local fallback message telling you to add the key.

## Customizing

- Swap the model in `api/chat.js` if you want a different Claude model.
- Chat history is stored in the browser's `localStorage`, per-visitor (no backend database).
- Theme preference is also saved to `localStorage` and respects system preference on first visit.
