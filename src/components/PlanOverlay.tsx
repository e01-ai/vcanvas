import React, { useEffect, useRef, useState } from 'react'
import { StreamOverlay } from './StreamOverlay'
import './PlanOverlay.css'

export interface PlanPhase {
  name: string
  label: string
  status: 'waiting' | 'active' | 'done'
  text: string
}

interface Props {
  phases: PlanPhase[]
  activePhaseIndex: number
  tokenCount: number
  done: boolean
  // Stream props for Create phase (reuses StreamOverlay)
  streamText: string
  streamTokenCount: number
  streamDone: boolean
}

const PHASE_ICONS: Record<string, string> = {
  gaze: '◉',
  dream: '✦',
  create: '▣',
}

const PHASE_VERBS: Record<string, string> = {
  gaze: 'Gazing into the image…',
  dream: 'Dreaming up the design…',
  create: 'Crafting the code…',
}

export function PlanOverlay({ phases, activePhaseIndex, tokenCount, done, streamText, streamTokenCount, streamDone }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [startTime] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState('0.0')

  const isCreatePhase = activePhaseIndex === 2 || (done && phases[2]?.status === 'done')

  useEffect(() => {
    if (done) {
      setElapsed(((performance.now() - startTime) / 1000).toFixed(1))
      return
    }
    const id = setInterval(() => {
      setElapsed(((performance.now() - startTime) / 1000).toFixed(1))
    }, 100)
    return () => clearInterval(id)
  }, [done, startTime])

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [phases])

  const activePhase = phases[activePhaseIndex]

  return (
    <div className="plan-overlay">
      {!isCreatePhase && <div className="plan-ambient" />}

      {/* Full timeline during Gaze/Dream */}
      {!isCreatePhase && (
        <div className="plan-timeline">
          <div className="plan-timeline-track">
            {phases.map((phase, i) => (
              <React.Fragment key={phase.name}>
                {i > 0 && (
                  <div className={`pip-line ${phases[i - 1].status === 'done' ? 'done' : ''}`} />
                )}
                <div className={`plan-phase-pip ${phase.status}`}>
                  <div className="pip-icon">{PHASE_ICONS[phase.name] || '○'}</div>
                  <div className="pip-label">{phase.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Gaze/Dream: show text content */}
      {!isCreatePhase && (
        <>
          <div className="plan-active">
            <span className={`plan-active-icon ${activePhase?.status === 'active' ? 'pulsing' : ''}`}>
              {PHASE_ICONS[activePhase?.name] || '○'}
            </span>
            <span className="plan-active-verb">
              {PHASE_VERBS[activePhase?.name] || 'Working…'}
            </span>
          </div>

          <div className="plan-content" ref={contentRef}>
            {phases.filter(p => p.name !== 'create' && p.text).map((phase) => (
              <div key={phase.name} className={`plan-section ${phase.status}`}>
                <div className="plan-section-header">
                  <span className="plan-section-icon">{PHASE_ICONS[phase.name]}</span>
                  <span className="plan-section-label">{phase.label}</span>
                  {phase.status === 'done' && <span className="plan-section-check">ok</span>}
                </div>
                <div className="plan-section-text mono">
                  {phase.text}
                  {phase.status === 'active' && <span className="plan-cursor" />}
                </div>
              </div>
            ))}
          </div>

          <div className="plan-progress">
            <div className="plan-progress-bar" style={{ width: `${((activePhaseIndex + 0.5) / phases.length) * 100}%` }} />
          </div>
          <div className="plan-footer mono">
            <span>{tokenCount} tok / {elapsed}s</span>
            <span>Phase {activePhaseIndex + 1} of {phases.length}</span>
          </div>
        </>
      )}

      {/* Create: hand off to StreamOverlay */}
      {isCreatePhase && (
        <div className="plan-stream-wrapper">
          <StreamOverlay
            streamText={streamText}
            tokenCount={streamTokenCount}
            done={streamDone}
          />
        </div>
      )}
    </div>
  )
}
