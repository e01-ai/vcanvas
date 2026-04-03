import React, { useState, useRef, useCallback } from 'react'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Header } from './components/Header'
import { ProviderModal } from './components/ProviderModal'
import { Canvas } from './components/Canvas'
import { FramePicker } from './components/FramePicker'
import { PromptBar } from './components/PromptBar'
import { Preview } from './components/Preview'
import { StreamOverlay } from './components/StreamOverlay'
import { PlanOverlay } from './components/PlanOverlay'
import type { PlanPhase } from './components/PlanOverlay'
import { MessageStrip } from './components/MessageStrip'
import { ResizeHandle } from './components/ResizeHandle'
import { streamChat, extractHTML } from './lib/api'
import { exportSourceAsPng, exportAllAsPng, getSources } from './lib/export'
import { getProvider, loadProviderState, saveProviderState } from './lib/providers'
import type { ProviderState } from './lib/providers'
import type { Message } from './lib/api'
import type { ChatChip } from './lib/store'
import './styles/app.css'

const SYSTEM_PROMPT = `You are an expert frontend developer. The user will show you a sketch/wireframe/reference and describe what they want. Generate a COMPLETE, self-contained HTML file.

## Output
- Do NOT explain your reasoning or thinking process. Do NOT write a plan, commentary, or preamble. Just output the code.
- Output ONLY raw, clean HTML inside a single \`\`\`html code fence. Nothing before it, nothing after it.
- CRITICAL — syntax highlighting contamination:
  Your training data contains web-scraped HTML from sites like Stack Overflow where code blocks are rendered with syntax highlighting (e.g. \`<span class="hljs-keyword">\`, \`<span class="s-str">\`). These are NOT part of the actual code — they are artifacts from highlight.js, Google Prettify, and Prism.js code formatters used to display code on those websites. You must NOT reproduce them. Specifically:
  - NEVER output classes: s-str, s-attr, s-tag, s-key, s-kw, s-num, s-comment, s-meta, hljs-keyword, hljs-string, hljs-attr, hljs-tag, hljs-number, hljs-comment, token-keyword, token-string, etc.
  - NEVER wrap HTML tokens in \`<span class="s-...">\` or \`<span class="hljs-...">\` — these come from code viewers, not from actual HTML source code
  - Output plain, valid HTML that a browser can render directly — as if you typed it in a text editor, not as if it was displayed on a documentation website
- Single self-contained file — all CSS/JS inline, dependencies via CDN
- Use Tailwind CSS (\`<script src="https://cdn.tailwindcss.com"></script>\`), Google Fonts, and Lucide Icons (\`<script src="https://unpkg.com/lucide@latest"></script>\`)
- For charts use Chart.js, for generative art use Canvas 2D API (NOT p5.js), for animation use GSAP or CSS, for 3D use three.js
- Use real placeholder content, not lorem ipsum. Use SVG or icon libraries for icons, never emoji.
- For placeholder assets (images, avatars, data), use the open APIs listed below — never use broken links or local file paths.

## Placeholder Assets — Open APIs (no auth required)

**Photos & Hero Images**
- \`https://images.unsplash.com/photo-{ID}?w={W}&h={H}&fit=crop\` — real photography. Use specific Unsplash photo IDs for consistency (e.g. \`photo-1506744038136-46273834b3fb\` for landscape, \`photo-1542291026-7eec264c27ff\` for product).
- \`https://loremflickr.com/{W}/{H}/{keyword}\` — random photos by keyword. E.g. \`/400/300/nature\`, \`/800/600/food\`, \`/600/400/architecture\`.
- \`https://placehold.co/{W}x{H}/{bg}/{text}?text={Label}\` — solid color with text label. E.g. \`/600x400/1a1a2e/eaeaea?text=Hero\`. Good for wireframes.

**Avatars & Profile Pictures**
- \`https://i.pravatar.cc/150?img={1-70}\` — realistic human face photos. Append \`?img=N\` for deterministic faces.
- \`https://api.dicebear.com/9.x/notionists/svg?seed={name}\` — illustrated avatar from seed string. Also supports styles: \`avataaars\`, \`bottts\`, \`lorelei\`, \`notionists\`.
- \`https://ui-avatars.com/api/?name={First+Last}&background=random&size=128\` — initials avatar with random background color.
- \`https://robohash.org/{seed}.png?size=200x200\` — robot/monster avatars from any seed string.
- \`https://randomuser.me/api/portraits/{women|men}/{1-99}.jpg\` — direct photo URL, no API call needed.

**Logos & Brands**
- \`https://logo.clearbit.com/{domain}\` — company logo by domain. E.g. \`/google.com\`, \`/stripe.com\`, \`/spotify.com\`.
- \`https://flagcdn.com/w80/{code}.png\` — country flags. E.g. \`/w80/us.png\`, \`/w80/jp.png\`. Widths: 20, 40, 80, 160, 320.

**Product & Content Data**
- \`https://dummyjson.com/products?limit=6\` — product data with images (title, price, thumbnail, description).
- \`https://dummyjson.com/recipes?limit=6\` — recipe data with images.
- \`https://dummyjson.com/quotes?limit=6\` — inspirational quotes.
- \`https://dummyjson.com/users?limit=6\` — user profiles with names, emails, and images.
- \`https://jsonplaceholder.typicode.com/posts\` — blog post text data (title, body).

**Usage rules**: Always fetch data with \`fetch()\` in a \`<script>\` tag and render dynamically. For images, use \`<img>\` tags with the direct URLs above. Vary the seeds/IDs so images look different from each other. Prefer Unsplash or loremflickr for hero/feature images, pravatar or dicebear for avatars, and dummyjson for structured content.

## Mockup-First Thinking
Before writing code, ask: **where does this design live in the real world?**

If it's a **website or landing page** — render full-width, it IS the viewport.
If it's a **generative art piece or game** — render full-canvas, edge-to-edge.
If it's **anything else** (app, dashboard, HUD, watch, kiosk, etc.) — render it as a **mockup**:
- \`<body>\` = the stage/environment (dark surface, desk, neutral bg)
- A centered device frame with correct aspect ratio sits on that stage
- The UI lives INSIDE the device frame
- Think Dribbble shot: background → device → UI

Examples of mockup contexts:
- **Phone app**: phone bezel + status bar + home indicator, ~9:19.5 ratio
- **Desktop app**: window chrome with traffic lights, drop shadow
- **Car HUD**: wide dark dashboard frame, ~21:9 ratio
- **Watch**: circular/rounded bezel, dark, minimal
- **AR/glasses**: semi-transparent panels floating over blurred background
- **Tablet, TV, kiosk, terminal**: appropriate frame and aspect ratio

## What GOOD Design Looks Like
- **Typography**: Pick distinctive Google Fonts — pair a display font with a body font. Vary weights dramatically (200 vs 800). Use a clear type scale.
- **Color**: Commit to a palette. One dominant + sharp accents. Tint your neutrals toward the brand hue. Never pure black/white.
- **Layout**: Create rhythm through VARIED spacing — tight groups, generous gaps. Break the grid intentionally. Not everything needs a card.
- **Content**: Real names, real companies, real descriptions. Never lorem ipsum.
- **Interaction**: Hover states that don't shift layout. Smooth transitions (150-300ms). Cursor pointer on clickable elements.
- **Polish**: Staggered page-load animations. Subtle shadows for depth. Consistent border radius. Intentional whitespace.

## Anti-Patterns — The "AI Slop" Test
If someone looks at the output and instantly thinks "AI made this" — that's the problem. Avoid these tells:
- Emoji as icons
- Cards inside cards inside cards
- Everything centered with identical spacing
- Purple-to-blue gradients, cyan-on-dark, neon glow aesthetic
- Gradient text on headings/metrics
- Big rounded rectangles with generic drop shadows
- Same-sized card grids repeated endlessly (icon + heading + text × 6)
- Hero section with big number + small label + supporting stats template
- Glassmorphism/blur as decoration without purpose
- Bounce/elastic easing (real objects don't bounce)
- Monospace font as lazy "technical" shorthand
- Large rounded-corner icons above every heading
- Repeating the same information the user can already see`

export function App() {
  const editorRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [editor, setEditor] = useState<ExcalidrawImperativeAPI | null>(null)
  const [providerState, setProviderState] = useState<ProviderState>(loadProviderState)
  const [showSettings, setShowSettings] = useState(false)

  const provider = getProvider(providerState.activeProviderId)
  const modelId = providerState.activeModelId
  const apiKey = providerState.keys[provider.id] || ''
  const modelLabel = provider.models.find(m => m.id === modelId)?.label || modelId
  const [messages, setMessages] = useState<Message[]>([])
  const [chips, setChips] = useState<ChatChip[]>([])
  const [iteration, setIteration] = useState(0)
  const [lastHTML, setLastHTML] = useState('')
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [thinkingText, setThinkingText] = useState('')
  const [streamTokenCount, setStreamTokenCount] = useState(0)
  const [streamDone, setStreamDone] = useState(false)
  const [usage, setUsage] = useState<{ input_tokens: number | string; output_tokens: number | string } | null>(null)
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set())
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [planMode, setPlanMode] = useState(false)
  const [planPhases, setPlanPhases] = useState<PlanPhase[]>([])
  const [planActiveIndex, setPlanActiveIndex] = useState(0)
  const [planTokenCount, setPlanTokenCount] = useState(0)
  const [planDone, setPlanDone] = useState(false)

  const previewRef = useRef<HTMLIFrameElement>(null)
  const panelLeftRef = useRef<HTMLDivElement>(null)

  const handleProviderUpdate = useCallback((newState: ProviderState) => {
    setProviderState(newState)
    saveProviderState(newState)
  }, [])

  const addChip = useCallback((chip: ChatChip) => {
    setChips((prev) => [...prev, chip])
  }, [])

  const handleClear = useCallback(() => {
    setMessages([])
    setChips([])
    setIteration(0)
    setLastHTML('')
    setStreamText('')
    setThinkingText('')
    setStreamTokenCount(0)
    setStreamDone(false)
    setUsage(null)
    setPreviewScreenshot(null)
  }, [])

  const handleResize = useCallback((deltaX: number) => {
    const el = panelLeftRef.current
    if (!el) return
    const w = el.getBoundingClientRect().width + deltaX
    el.style.width = Math.max(320, Math.min(w, window.innerWidth - 350)) + 'px'
  }, [])

  const handleAddFrame = useCallback(() => {
    const api = editorRef.current
    if (!api) return
    const frameCount = getSources(api).filter(s => s.kind === 'frame').length
    const newElements = convertToExcalidrawElements([{
      type: 'frame',
      x: 100 + frameCount * 50,
      y: 100 + frameCount * 50,
      width: 400,
      height: 300,
      name: `Frame ${frameCount + 1}`,
      children: [],
    }])
    api.updateScene({
      elements: [...api.getSceneElements(), ...newElements],
    })
  }, [])

  const handleSave = useCallback(() => {
    const api = editorRef.current
    if (!api) return
    const data = {
      elements: api.getSceneElements(),
      files: api.getFiles(),
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `glm5v-drawing-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleLoad = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)
      const api = editorRef.current
      if (!api) return
      api.updateScene({ elements: data.elements || [] })
      if (data.files) api.addFiles(Object.values(data.files))
    }
    input.click()
  }, [])

  // Debounced canvas change — bumps version so FramePicker re-exports thumbs
  const canvasChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCanvasChange = useCallback(() => {
    if (canvasChangeTimer.current) clearTimeout(canvasChangeTimer.current)
    canvasChangeTimer.current = setTimeout(() => setCanvasVersion(v => v + 1), 400)
  }, [])

  // Export selected sources as images
  // If no frames exist, always send full canvas (images alone don't isolate)
  const getSelectedFrameImages = useCallback(async () => {
    const api = editorRef.current
    if (!api) return []

    const allSources = getSources(api)
    const hasFrames = allSources.some(s => s.kind === 'frame')

    if (!hasFrames) {
      // No frames — full canvas mode
      const b64 = await exportAllAsPng(api)
      if (b64) return [{ base64: b64, label: 'Full canvas' }]
      return []
    }

    const selected = allSources.filter((s) => selectedFrameIds.has(s.id))
    if (selected.length === 0) {
      // Frames exist but none selected — export entire canvas
      const b64 = await exportAllAsPng(api)
      if (b64) return [{ base64: b64, label: 'Full canvas' }]
      return []
    }

    const results: { base64: string; label: string }[] = []
    for (const src of selected) {
      const b64 = await exportSourceAsPng(api, src.id)
      if (b64) results.push({ base64: b64, label: src.name })
    }
    return results
  }, [selectedFrameIds])

  // Capture preview iframe as screenshot
  const capturePreview = useCallback(async (): Promise<string | null> => {
    const iframe = previewRef.current
    if (!iframe) return null
    try {
      const { default: html2canvas } = await import('html2canvas')
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc?.body) return null
      const screenshot = await html2canvas(doc.body, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 0.8,
        logging: false,
      })
      return screenshot.toDataURL('image/png').split(',')[1]
    } catch {
      return null
    }
  }, [])

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!apiKey || generating) return

    setGenerating(true)
    setStreamText('')
    setThinkingText('')
    setStreamTokenCount(0)
    setStreamDone(false)
    setUsage(null)

    const frameImages = await getSelectedFrameImages()

    // Build user message content
    const userContent: Message['content'] = []
    const chipImages: ChatChip['images'] = []

    for (const img of frameImages) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: img.base64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + img.base64, label: img.label })
    }
    userContent.push({ type: 'text', text: prompt })

    const newMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    setMessages(newMessages)
    addChip({ role: 'user', text: prompt, images: chipImages })
    setIteration((i) => i + 1)

    try {
      await streamChat(provider, apiKey, modelId, newMessages, {
        onChunk: (text, tokenIdx) => {
          setStreamText((prev) => prev + text)
          setStreamTokenCount(tokenIdx)
        },
        onThinking: (text) => setThinkingText((prev) => prev + text),
        onDone: (fullText, u) => {
          setUsage(u)
          setStreamDone(true)

          const html = extractHTML(fullText)
          if (html) {
            setTimeout(() => {
              setLastHTML(html)
              setGenerating(false)
              addChip({ role: 'assistant', text: 'OK: generated' })
            }, 500)
          } else {
            setGenerating(false)
            addChip({ role: 'assistant', text: 'No HTML found in response' })
          }

          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fullText },
          ])
        },
        onError: (err) => {
          setGenerating(false)
          addChip({ role: 'assistant', text: 'ERR:' + err.message })
        },
      })
    } catch (err: any) {
      setGenerating(false)
      addChip({ role: 'assistant', text: 'ERR:' + err.message })
    }
  }, [provider, apiKey, modelId, generating, getSelectedFrameImages, addChip])

  const handleRefine = useCallback(async (prompt: string) => {
    if (!apiKey || generating) return

    setGenerating(true)
    setStreamText('')
    setThinkingText('')
    setStreamTokenCount(0)
    setStreamDone(false)
    setUsage(null)

    // Capture current preview screenshot
    const screenshotB64 = await capturePreview()
    setPreviewScreenshot(screenshotB64 ? 'data:image/png;base64,' + screenshotB64 : null)

    const refinementPrompt = prompt || 'Look at the current output and improve it. Fix any visual issues, improve alignment, make it more polished and production-ready.'

    const userContent: Message['content'] = []
    const chipImages: ChatChip['images'] = []

    // 1. Screenshot of current rendered output
    if (screenshotB64) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshotB64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + screenshotB64, label: 'Current output' })
    }

    // 2. Canvas sketches (original reference)
    const frameImages = await getSelectedFrameImages()
    for (const img of frameImages) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: img.base64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + img.base64, label: img.label })
    }

    // 3. Previous HTML + refinement prompt (flat, no stacked history)
    userContent.push({
      type: 'text',
      text: `Here is the current HTML output:\n\n\`\`\`html\n${lastHTML}\n\`\`\`\n\nHere's a screenshot of how it currently renders. ${refinementPrompt}\n\nPlease provide the COMPLETE updated HTML file in a \`\`\`html code fence.`,
    })

    // Flat message list: system + single user turn (no conversation history)
    const newMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    setMessages(newMessages)
    addChip({ role: 'user', text: prompt || 'REFINE', images: chipImages.length ? chipImages : undefined })
    setIteration((i) => i + 1)

    try {
      await streamChat(provider, apiKey, modelId, newMessages, {
        onChunk: (text, tokenIdx) => {
          setStreamText((prev) => prev + text)
          setStreamTokenCount(tokenIdx)
        },
        onThinking: (text) => setThinkingText((prev) => prev + text),
        onDone: (fullText, u) => {
          setUsage(u)
          setStreamDone(true)

          const html = extractHTML(fullText)
          if (html) {
            setTimeout(() => {
              setLastHTML(html)
              setGenerating(false)
              addChip({ role: 'assistant', text: 'OK: refined' })
            }, 500)
          } else {
            setGenerating(false)
            addChip({ role: 'assistant', text: 'No HTML found in response' })
          }
        },
        onError: (err) => {
          setGenerating(false)
          addChip({ role: 'assistant', text: 'ERR:' + err.message })
        },
      })
    } catch (err: any) {
      setGenerating(false)
      addChip({ role: 'assistant', text: 'ERR:' + err.message })
    }
  }, [provider, apiKey, modelId, generating, lastHTML, capturePreview, getSelectedFrameImages, addChip])

  // ── Plan Mode: multi-step Gaze → Dream → Create ──

  const makeGazePrompt = (userRequest: string) =>
    `You are an artist and visual thinker. Gaze deeply into this image. Let it speak to you.

The user's request: "${userRequest}"

Now describe what you see — not clinically, but with feeling:
- What story is the image telling? What is its essence?
- Shapes, forms, flows, negative space — how does the composition breathe?
- Colors, light, contrast — what mood do they create?
- Any text, labels, annotations, arrows the user drew — what are they communicating?
- What does this WANT to become? A sleek app? A wild art piece? A polished page?
- What emotions or associations does it evoke?

Be poetic but specific. See beyond the obvious. This is the foundation of everything that follows.`

  const makeDreamPrompt = (userRequest: string) =>
    `You are a visionary designer in a flow state. Based on what you saw in the image, now DREAM.

The user's request: "${userRequest}"

Let your imagination run wild, then focus it:
- **What is this becoming?** Not just "a landing page" — what KIND? What's the vibe, the world it lives in?
- **Visual identity** — Dream up specific fonts (Google Fonts, distinctive ones), an exact color palette (hex codes), a texture/pattern language
- **The feeling** — When someone sees this, what do they FEEL? Elegant calm? Electric energy? Cozy warmth? Brutal honesty?
- **The magic moment** — What one detail will make someone stop and say "wow"? A scroll animation? A color transition? An unexpected layout break?
- **Wild ideas** — Throw out 3-5 creative ideas that could elevate this beyond generic. Go bold. Particle effects? Asymmetric grids? Cinematic typography? Interactive physics?
- **The vibe board** — If this were a mood board, what's on it? Be specific.

Dream big, then crystallize it into a vision someone could build. Be opinionated. Be brave.`

  const makePlanCreatePrompt = (gazeResult: string, dreamResult: string, userRequest: string) =>
    `You are implementing a design based on deep observation and creative vision.

## The User's Request:
${userRequest}

## What Was Seen (Gaze):
${gazeResult}

## The Creative Vision (Dream):
${dreamResult}

Now bring this vision to life. Generate the COMPLETE HTML file that realizes this dream. Every font, color, interaction, and detail from the vision should be faithfully implemented. Make it extraordinary.

${SYSTEM_PROMPT}`

  const runPlanPhase = useCallback(async (
    messages: Message[],
    phaseIndex: number,
    onText: (text: string) => void,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      streamChat(provider, apiKey, modelId, messages, {
        onChunk: (text, tokenIdx) => {
          onText(text)
          setPlanTokenCount(tokenIdx)
        },
        onDone: (fullText) => resolve(fullText),
        onError: (err) => reject(err),
      })
    })
  }, [provider, apiKey, modelId])

  const handlePlanGenerate = useCallback(async (prompt: string) => {
    if (!apiKey || generating) return

    setGenerating(true)
    setPlanDone(false)
    setPlanTokenCount(0)
    setPlanActiveIndex(0)

    const initialPhases: PlanPhase[] = [
      { name: 'gaze', label: 'Gaze', status: 'active', text: '' },
      { name: 'dream', label: 'Dream', status: 'waiting', text: '' },
      { name: 'create', label: 'Create', status: 'waiting', text: '' },
    ]
    setPlanPhases(initialPhases)

    const frameImages = await getSelectedFrameImages()
    const chipImages: ChatChip['images'] = []
    const imageContent: Message['content'] = []

    for (const img of frameImages) {
      imageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: img.base64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + img.base64, label: img.label })
    }

    addChip({ role: 'user', text: `[Plan] ${prompt}`, images: chipImages })

    try {
      // Phase 1: Gaze
      const gazeResult = await runPlanPhase([
        { role: 'user', content: [...imageContent, { type: 'text', text: makeGazePrompt(prompt) }] },
      ], 0, (text) => {
        setPlanPhases(prev => prev.map((p, i) => i === 0 ? { ...p, text: p.text + text } : p))
      })

      // Phase 2: Dream
      setPlanPhases(prev => prev.map((p, i) => ({
        ...p, status: i === 0 ? 'done' : i === 1 ? 'active' : 'waiting',
      })))
      setPlanActiveIndex(1)

      const dreamResult = await runPlanPhase([
        { role: 'user', content: [...imageContent, { type: 'text', text: makeGazePrompt(prompt) }] },
        { role: 'assistant', content: gazeResult },
        { role: 'user', content: [{ type: 'text', text: makeDreamPrompt(prompt) }] },
      ], 1, (text) => {
        setPlanPhases(prev => prev.map((p, i) => i === 1 ? { ...p, text: p.text + text } : p))
      })

      // Phase 3: Create
      setPlanPhases(prev => prev.map((p, i) => ({
        ...p, status: i <= 1 ? 'done' : 'active',
      })))
      setPlanActiveIndex(2)
      setStreamText('')
      setStreamTokenCount(0)
      setStreamDone(false)

      const createMessages: Message[] = [
        { role: 'user', content: [...imageContent, { type: 'text', text: makePlanCreatePrompt(gazeResult, dreamResult, prompt) }] },
      ]

      let createTokenIdx = 0
      const createResult = await runPlanPhase(createMessages, 2, (text) => {
        createTokenIdx++
        setStreamText(prev => prev + text)
        setStreamTokenCount(createTokenIdx)
      })

      // Done
      setPlanPhases(prev => prev.map(p => ({ ...p, status: 'done' as const })))
      setPlanDone(true)
      setStreamDone(true)

      const html = extractHTML(createResult)
      if (html) {
        setTimeout(() => {
          setLastHTML(html)
          setGenerating(false)
          setIteration((i) => i + 1)
          addChip({ role: 'assistant', text: 'OK: plan complete' })
        }, 800)
      } else {
        setGenerating(false)
        addChip({ role: 'assistant', text: 'No HTML found in plan output' })
      }
    } catch (err: any) {
      setGenerating(false)
      setPlanDone(true)
      addChip({ role: 'assistant', text: 'ERR: ' + err.message })
    }
  }, [apiKey, generating, getSelectedFrameImages, addChip, runPlanPhase])

  const handlePlanRefine = useCallback(async (prompt: string) => {
    if (!apiKey || generating) return

    setGenerating(true)
    setPlanDone(false)
    setPlanTokenCount(0)
    setPlanActiveIndex(0)

    const initialPhases: PlanPhase[] = [
      { name: 'gaze', label: 'Gaze', status: 'active', text: '' },
      { name: 'dream', label: 'Dream', status: 'waiting', text: '' },
      { name: 'create', label: 'Create', status: 'waiting', text: '' },
    ]
    setPlanPhases(initialPhases)

    const screenshotB64 = await capturePreview()
    setPreviewScreenshot(screenshotB64 ? 'data:image/png;base64,' + screenshotB64 : null)

    const frameImages = await getSelectedFrameImages()
    const chipImages: ChatChip['images'] = []
    const imageContent: Message['content'] = []

    if (screenshotB64) {
      imageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshotB64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + screenshotB64, label: 'Current output' })
    }
    for (const img of frameImages) {
      imageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: img.base64 },
      })
      chipImages.push({ src: 'data:image/png;base64,' + img.base64, label: img.label })
    }

    const refinementPrompt = prompt || 'Improve the current output — fix visual issues, improve alignment, make it more polished.'
    addChip({ role: 'user', text: `[Plan Refine] ${refinementPrompt}`, images: chipImages })

    try {
      // Gaze at both screenshot and canvas
      const gazeResult = await runPlanPhase([
        { role: 'user', content: [...imageContent, { type: 'text', text: makeGazePrompt(refinementPrompt) + '\n\nThe first image is the current rendered output. Subsequent images are the original sketches/references.' }] },
      ], 0, (text) => {
        setPlanPhases(prev => prev.map((p, i) => i === 0 ? { ...p, text: p.text + text } : p))
      })

      setPlanPhases(prev => prev.map((p, i) => ({ ...p, status: i === 0 ? 'done' : i === 1 ? 'active' : 'waiting' })))
      setPlanActiveIndex(1)

      const dreamResult = await runPlanPhase([
        { role: 'user', content: [...imageContent, { type: 'text', text: makeGazePrompt(refinementPrompt) }] },
        { role: 'assistant', content: gazeResult },
        { role: 'user', content: [{ type: 'text', text: makeDreamPrompt(refinementPrompt) + `\n\nThis is a REFINEMENT. Here is the current HTML to evolve:\n\`\`\`html\n${lastHTML}\n\`\`\`` }] },
      ], 1, (text) => {
        setPlanPhases(prev => prev.map((p, i) => i === 1 ? { ...p, text: p.text + text } : p))
      })

      setPlanPhases(prev => prev.map((p, i) => ({ ...p, status: i <= 1 ? 'done' : 'active' })))
      setPlanActiveIndex(2)
      setStreamText('')
      setStreamTokenCount(0)
      setStreamDone(false)

      let createTokenIdx2 = 0
      const createResult = await runPlanPhase([
        { role: 'user', content: [...imageContent, { type: 'text', text: makePlanCreatePrompt(gazeResult, dreamResult, refinementPrompt) + `\n\nHere is the previous HTML to improve upon:\n\`\`\`html\n${lastHTML}\n\`\`\`` }] },
      ], 2, (text) => {
        createTokenIdx2++
        setStreamText(prev => prev + text)
        setStreamTokenCount(createTokenIdx2)
      })

      setPlanPhases(prev => prev.map(p => ({ ...p, status: 'done' as const })))
      setPlanDone(true)
      setStreamDone(true)

      const html = extractHTML(createResult)
      if (html) {
        setTimeout(() => {
          setLastHTML(html)
          setGenerating(false)
          setIteration((i) => i + 1)
          addChip({ role: 'assistant', text: 'OK: plan refine complete' })
        }, 800)
      } else {
        setGenerating(false)
        addChip({ role: 'assistant', text: 'No HTML found in plan output' })
      }
    } catch (err: any) {
      setGenerating(false)
      setPlanDone(true)
      addChip({ role: 'assistant', text: 'ERR: ' + err.message })
    }
  }, [provider, apiKey, modelId, generating, lastHTML, capturePreview, getSelectedFrameImages, addChip, runPlanPhase])

  const needsKey = apiKey.length <= 4

  return (
    <>
      <Header
        providerName={provider.name}
        modelLabel={modelLabel}
        hasKey={!needsKey}
        onOpenSettings={() => setShowSettings(true)}
      />
      {showSettings && (
        <ProviderModal
          state={providerState}
          onUpdate={handleProviderUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="workspace">
        <div className="panel-left" ref={panelLeftRef}>
          <Canvas onEditorReady={(e) => { editorRef.current = e; setEditor(e) }} onCanvasChange={handleCanvasChange} />
          <FramePicker
            editor={editor}
            selectedIds={selectedFrameIds}
            onSelectionChange={setSelectedFrameIds}
            onAddFrame={handleAddFrame}
            canvasVersion={canvasVersion}
            onSave={handleSave}
            onLoad={handleLoad}
            previewScreenshot={previewScreenshot}
          />
          <MessageStrip chips={chips} />
          <PromptBar
            onGenerate={planMode ? handlePlanGenerate : handleGenerate}
            onRefine={planMode ? handlePlanRefine : handleRefine}
            onClear={handleClear}
            hasOutput={!!lastHTML}
            generating={generating}
            planMode={planMode}
            onPlanModeToggle={() => setPlanMode(p => !p)}
            hasKey={!needsKey}
          />
        </div>
        <ResizeHandle onResize={handleResize} />
        <div className="panel-right">
          {needsKey && (
            <div className="api-key-overlay">
              <div className="api-key-overlay-card">
                <div className="api-key-overlay-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </div>
                <h2 className="api-key-overlay-title">API Key Required</h2>
                <p className="api-key-overlay-desc">
                  Get an API key from{' '}
                  <a href={provider.keyUrl} target="_blank" rel="noopener">{provider.keyUrlLabel}</a>{' '}
                  for <strong>{provider.name}</strong>.
                </p>
                <div className="api-key-overlay-steps">
                  <div className="api-key-step"><span className="api-key-step-num">1</span> Get a key from <a href={provider.keyUrl} target="_blank" rel="noopener">{provider.keyUrlLabel}</a></div>
                  <div className="api-key-step"><span className="api-key-step-num">2</span> Click the model button in the header to open settings</div>
                  <div className="api-key-step"><span className="api-key-step-num">3</span> Paste the key in the <strong>{provider.name}</strong> card</div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} onClick={() => setShowSettings(true)}>
                  Open Settings
                </button>
              </div>
            </div>
          )}
          <div className="preview-container">
            <Preview html={lastHTML} iframeRef={previewRef} />
            {generating && !planMode && (
              <StreamOverlay
                streamText={streamText}
                thinkingText={thinkingText}
                tokenCount={streamTokenCount}
                done={streamDone}
              />
            )}
            {generating && planMode && (
              <PlanOverlay
                phases={planPhases}
                activePhaseIndex={planActiveIndex}
                tokenCount={planTokenCount}
                done={planDone}
                streamText={streamText}
                streamTokenCount={streamTokenCount}
                streamDone={streamDone}
              />
            )}
          </div>
          {lastHTML && (
            <div className="preview-toolbar">
              <div className="preview-toolbar-left">
                <button className="btn btn-secondary" onClick={() => {
                  navigator.clipboard.writeText(lastHTML)
                }}>COPY</button>
                <button className="btn btn-secondary" onClick={() => {
                  const w = window.open()
                  if (w) { w.document.write(lastHTML); w.document.close() }
                }}>OPEN</button>
              </div>
              <span className="mono preview-meta">
                {iteration > 0 && `#${iteration}`}
                {usage && ` / ${usage.input_tokens} in / ${usage.output_tokens} out`}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
