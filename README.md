# ArchAI — AI Floor Plan Generator for AutoCAD

Describe a project (or upload a photo), pick a legendary architect's style, and
get an editable floor plan you can preview in 2D/3D and export straight to
**AutoCAD** as a `.dxf` file.

## Features

- **Text or photo input** — type a brief ("3-bed apartment, 120m², open kitchen")
  or drop a sketch/reference photo.
- **11 architect style modes** — Wright, Hadid, Mies, Le Corbusier, Ando, Piano,
  Foster, Gehry, Koolhaas, Siza, plus a Neutral mode. Each one steers the AI's
  spatial logic and proportions.
- **2D plan preview** — rooms, dimensions, door swings, scale bar.
- **3D view** — interactive, drag to orbit the model.
- **Export to AutoCAD** — one click downloads a `.dxf` with walls, rooms and
  labels on proper layers, ready to edit.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Claude API (`claude-sonnet-4-6`) for plan generation (text + vision)
- Three.js for the 3D view, HTML canvas for the 2D plan
- DXF generator for AutoCAD export

## Getting started (run it locally)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add your Anthropic API key** — create `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at https://console.anthropic.com (the account needs API credit).

3. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and you're in.

For a production build: `npm run build && npm start`.

## Deploy (get a public URL)

The easiest host is **Vercel**:

1. Push this repo to GitHub (already done on branch `claude/website-plan-k1vnsx`).
2. Go to https://vercel.com/new and import the repo.
3. Add an environment variable `ANTHROPIC_API_KEY` with your key.
4. Deploy — Vercel gives you a public `https://…vercel.app` URL you can open anywhere.

## How it works

1. The browser sends your description + chosen style (+ optional image) to
   `/api/generate`.
2. That route calls Claude with the architect's style as a system prompt and
   asks for a structured JSON floor plan (rooms, coordinates, doors, windows).
3. The JSON is rendered to a 2D canvas and a 3D Three.js scene.
4. **Export to AutoCAD** converts the same JSON into DXF geometry and downloads it.
