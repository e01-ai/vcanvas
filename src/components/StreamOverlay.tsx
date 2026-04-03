import React, { useEffect, useRef, useState, useMemo } from 'react'
import './StreamOverlay.css'

interface Props {
  streamText: string
  thinkingText?: string
  tokenCount: number
  done: boolean
}

const PHASES = ['thinking', 'doctype', 'head', 'style', 'body', 'script', 'complete'] as const

function detectPhase(text: string): typeof PHASES[number] {
  const t = text.toLowerCase()
  if (t.includes('</html>')) return 'complete'
  if (t.includes('<script')) return 'script'
  if (t.includes('<body')) return 'body'
  if (t.includes('<style') || t.includes('css')) return 'style'
  if (t.includes('<head')) return 'head'
  if (t.includes('<!doctype') || t.includes('<html')) return 'doctype'
  return 'thinking'
}

function escapeLine(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function StreamOverlay({ streamText, thinkingText, tokenCount, done }: Props) {
  const codeRef = useRef<HTMLDivElement>(null)
  const thinkRef = useRef<HTMLDivElement>(null)
  const [startTime] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState('0.0')
  const [thinkingExpanded, setThinkingExpanded] = useState(true)

  const tokenTimesRef = useRef<number[]>([])
  const prevTokenCountRef = useRef(0)

  if (tokenCount > prevTokenCountRef.current) {
    const now = performance.now()
    for (let i = prevTokenCountRef.current; i < tokenCount; i++) {
      tokenTimesRef.current.push(now)
    }
    prevTokenCountRef.current = tokenCount
  }

  const [speedSamples, setSpeedSamples] = useState<number[]>([])

  useEffect(() => {
    if (done) {
      setElapsed(((performance.now() - startTime) / 1000).toFixed(1))
      return
    }
    const id = setInterval(() => {
      const now = performance.now()
      setElapsed(((now - startTime) / 1000).toFixed(1))
      const times = tokenTimesRef.current
      const oneSecAgo = now - 1000
      let count = 0
      for (let i = times.length - 1; i >= 0; i--) {
        if (times[i] >= oneSecAgo) count++
        else break
      }
      setSpeedSamples((prev) => [...prev, count].slice(-30))
    }, 250)
    return () => clearInterval(id)
  }, [done, startTime])

  // Autoscroll code viewer
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [streamText])

  // Autoscroll thinking viewer
  useEffect(() => {
    if (thinkRef.current) {
      thinkRef.current.scrollTop = thinkRef.current.scrollHeight
    }
  }, [thinkingText])

  // Collapse thinking when code starts streaming
  useEffect(() => {
    if (streamText.length > 0 && thinkingText && thinkingText.length > 0) {
      setThinkingExpanded(false)
    }
  }, [streamText.length > 0])

  const phase = detectPhase(streamText)
  const phaseIdx = PHASES.indexOf(phase)
  const charCount = streamText.length
  const lineCount = (streamText.match(/\n/g) || []).length
  const progress = done ? 100 : Math.min(95, ((phaseIdx + 1) / PHASES.length) * 100)

  const currentSpeed = speedSamples.length > 0 ? speedSamples[speedSamples.length - 1] : 0
  const maxSpeed = Math.max(...speedSamples, 1)
  const avgSpeed = tokenCount > 0 && parseFloat(elapsed) > 0
    ? (tokenCount / parseFloat(elapsed)).toFixed(1)
    : '0'

  const escaped = useMemo(() => {
    const lines = streamText.split('\n')
    return lines.slice(-80).map(escapeLine).join('\n')
  }, [streamText])

  const hasThinking = thinkingText && thinkingText.length > 0
  const isThinking = hasThinking && streamText.length === 0

  return (
    <div className="stream-overlay">
      {/* Header */}
      <div className="stream-header">
        <div className="stream-status">
          <div className={`stream-dot ${done ? 'done' : isThinking ? 'thinking' : ''}`} />
          <span>{done ? 'COMPLETE' : isThinking ? 'THINKING' : 'STREAMING'}</span>
        </div>
        <div className="stream-meta mono">
          <span>{tokenCount} tok</span>
          <span>{charCount.toLocaleString()} chr</span>
          <span>{lineCount} ln</span>
          <span>{elapsed}s</span>
        </div>
      </div>

      {/* Thinking section */}
      {hasThinking && (
        <div className={`stream-thinking ${thinkingExpanded ? 'expanded' : 'collapsed'}`}>
          <button
            className="stream-thinking-toggle"
            onClick={() => setThinkingExpanded(e => !e)}
          >
            <span className="stream-thinking-icon">{thinkingExpanded ? '▾' : '▸'}</span>
            <span className="stream-thinking-label">THINKING</span>
            <span className="stream-thinking-count">{thinkingText!.length.toLocaleString()} chr</span>
          </button>
          {thinkingExpanded && (
            <div className="stream-thinking-body mono" ref={thinkRef}>
              {thinkingText}
              {isThinking && <span className="thinking-cursor" />}
            </div>
          )}
        </div>
      )}

      {/* Phase pills */}
      <div className="stream-phases">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`phase-pill ${i < phaseIdx ? 'done' : ''} ${i === phaseIdx ? 'active' : ''}`}
          >
            <span className="pill-indicator">{i < phaseIdx ? 'ok' : i + 1}</span>
            {p === 'doctype' ? 'DOCTYPE' : p === 'complete' ? 'DONE' : `<${p}>`}
          </div>
        ))}
      </div>

      {/* Code viewer */}
      <div
        className="stream-code mono"
        ref={codeRef}
        dangerouslySetInnerHTML={{
          __html: escaped + (done ? '' : '<span class="so-cursor"></span>'),
        }}
      />

      {/* Progress + speed */}
      <div className="stream-progress">
        <div className="stream-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="stream-footer mono">
        <span>
          {done
            ? `${tokenCount} tok / ${elapsed}s / avg ${avgSpeed} tok/s`
            : `${currentSpeed} tok/s`
          }
        </span>
        <div className="speed-graph">
          {speedSamples.map((s, i) => (
            <div
              key={i}
              className="speed-bar"
              style={{
                height: Math.max(1, (s / maxSpeed) * 14) + 'px',
                opacity: s > 0 ? 0.7 : 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
