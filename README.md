# BraveThem — Steel Thread (V0.2 PWA)

An iconic, calm command center for work & home.

## What’s in this build
- Today page with Single Focus, Tasks (3 active), Focus Timer (25:00), Peace Meter
- Quick Capture (Cmd/Ctrl + K)
- **PWA (Step 1)**: `manifest.webmanifest`, service worker with offline fallback (`/offline.html`), installable

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy
Push to your GitHub repo (main branch) and let Vercel build & deploy.

## PWA notes
- Install via browser menu (“Install BraveThem”)
- Works offline; navigation requests fall back to `/offline.html`
