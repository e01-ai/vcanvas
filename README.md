# VCanvas

A visual canvas playground for vision-language models. Draw sketches, describe what you want, and the model generates complete HTML/CSS/JS — rendered live in a side-by-side preview.

BYOK (Bring Your Own Key). No backend. Runs entirely in the browser.

## How it works

1. **Draw** — Sketch wireframes, paste screenshots, drop reference images onto an Excalidraw canvas
2. **Describe** — Type a prompt: "Turn this into a landing page", "Generative art piece", or just "Make it beautiful"
3. **Generate** — The model sees your canvas + prompt and streams a complete, self-contained HTML file
4. **Refine** — Click Refine to iterate. The model sees the original sketch, a screenshot of the current output, and your feedback

## Providers

| Provider | Models | Get a key |
|----------|--------|-----------|
| **z.ai** | GLM-5V Turbo | [z.ai](https://z.ai) |
| **Google** | Gemini 3.1 Pro, Flash, Flash Lite | [AI Studio](https://aistudio.google.com/apikey) |
| **Fireworks** | Kimi K2.5 Turbo (Fire Pass) | [Fire Pass](https://app.fireworks.ai/fire-pass) |
| **OpenRouter** | Claude 4.6, Gemini 3, Grok 4.1, Qwen 3.5, MiMo V2, Kimi K2.5 | [OpenRouter](https://openrouter.ai/keys) |
| **Custom** | Any OpenAI-compatible endpoint | — |

OpenRouter also supports searching and selecting from 100+ vision models via the API.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Click the model button in the header to configure your provider and API key.

## Build

```bash
# Default (base path /)
npm run build

# For deployment at /vcanvas/
npm run build:gh

# Custom base path
VCANVAS_BASE=/your/path/ npm run build
```

## Features

- **Multi-provider** — Switch between providers and models in one click. Keys stored per-provider in localStorage.
- **Frame selection** — Create named frames on the canvas to send specific regions to the model instead of the full canvas.
- **Plan mode** — Three-phase generation: Gaze (deep image analysis) → Dream (creative ideation) → Create (implementation). Slower but more intentional results.
- **Thinking visualization** — Models that use chain-of-thought reasoning (DeepSeek, Kimi, Gemini) show their thinking process in a collapsible panel during streaming.
- **Live streaming** — Watch the HTML stream in with token count, speed graph, and phase detection.
- **Refinement loop** — The model captures a screenshot of the current output and uses it alongside your sketch for iterative improvement.
- **Save/Load** — Export and import canvas drawings as JSON.

## Architecture

```
src/
  App.tsx                     — Main orchestrator, state management
  main.tsx                    — Entry point
  components/
    Canvas.tsx                — Excalidraw instance
    FramePicker.tsx           — Frame thumbnail strip, selection
    PromptBar.tsx             — Text input, Generate/Refine, Plan toggle
    Preview.tsx               — Sandboxed iframe renderer
    StreamOverlay.tsx         — Live code viewer, thinking, speed graph
    PlanOverlay.tsx           — Gaze/Dream/Create phase viewer
    ProviderModal.tsx         — Provider/model settings popup
    Header.tsx                — App header, model status
    MessageStrip.tsx          — Chat history chips
    ResizeHandle.tsx          — Panel resize
  lib/
    api.ts                    — Streaming (OpenAI-compat + Gemini), HTML extraction
    providers.ts              — Provider configs, model lists, state persistence
    export.ts                 — Canvas → PNG export
    store.ts                  — Shared types
  styles/
    globals.css               — Design tokens, base styles
    app.css                   — Layout, overlays
```

## License

MIT
