import React from 'react'
import './Preview.css'

interface Props {
  html: string
  iframeRef: React.RefObject<HTMLIFrameElement | null>
}

export function Preview({ html, iframeRef }: Props) {
  if (!html) {
    return (
      <div className="preview-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 8 6 4-6 4Z" />
        </svg>
        <p>Draw or drop references in frames, describe it, and hit Generate</p>
        <span className="preview-hint">GLM-5V will turn your sketch into code</span>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      className="preview-frame"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      title="Preview"
    />
  )
}
