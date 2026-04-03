import React, { useRef, useEffect, useState } from 'react'
import type { ChatChip } from '../lib/store'
import './MessageStrip.css'

interface Props {
  chips: ChatChip[]
}

export function MessageStrip({ chips }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [hoverImg, setHoverImg] = useState<{ src: string; label: string; x: number; y: number } | null>(null)
  const [hoverText, setHoverText] = useState<{ text: string; isError: boolean; x: number; y: number } | null>(null)

  useEffect(() => {
    if (stripRef.current) {
      stripRef.current.scrollLeft = stripRef.current.scrollWidth
    }
  }, [chips])

  if (chips.length === 0) return null

  return (
    <>
      <div className="msg-strip" ref={stripRef}>
        {chips.map((chip, i) => {
          const isError = chip.text.startsWith('ERR')
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="chip-arrow">→</span>}
              <div
                className={`msg-chip ${chip.role} ${isError ? 'error' : ''}`}
                onMouseEnter={(e) => setHoverText({ text: chip.text, isError, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setHoverText((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setHoverText(null)}
              >
                {chip.images && chip.images.length > 0 && (
                  <div className="img-thumbs">
                    {chip.images.map((img, j) => (
                      <img
                        key={j}
                        className="img-thumb"
                        src={img.src}
                        alt={img.label}
                        onMouseEnter={(e) => { setHoverImg({ src: img.src, label: img.label, x: e.clientX, y: e.clientY }); setHoverText(null) }}
                        onMouseMove={(e) => setHoverImg((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setHoverImg(null)}
                      />
                    ))}
                  </div>
                )}
                {isError && <span className="chip-error-icon">!</span>}
                <span className="chip-text">
                  {isError ? 'Error' : chip.text.length > 40 ? chip.text.slice(0, 40) + '…' : chip.text}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Text hover popup */}
      {hoverText && (
        <div
          className={`chip-text-popup visible ${hoverText.isError ? 'error' : ''}`}
          style={{
            left: Math.min(hoverText.x, window.innerWidth - 360),
            top: Math.max(10, hoverText.y - 60),
          }}
        >
          {hoverText.text}
        </div>
      )}

      {/* Image hover popup */}
      {hoverImg && (
        <div
          className="img-preview-popup visible"
          style={{
            left: hoverImg.x + 16,
            top: Math.max(10, hoverImg.y - 130),
          }}
        >
          <img src={hoverImg.src} alt={hoverImg.label} />
          <div className="preview-label">{hoverImg.label}</div>
        </div>
      )}
    </>
  )
}
