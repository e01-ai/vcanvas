import React, { useCallback } from 'react'
import { Excalidraw, THEME } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import './Canvas.css'

interface Props {
  onEditorReady: (api: ExcalidrawImperativeAPI) => void
  onCanvasChange?: () => void
}

export function Canvas({ onEditorReady, onCanvasChange }: Props) {
  return (
    <div className="canvas-wrapper">
      <Excalidraw
        excalidrawAPI={onEditorReady}
        onChange={onCanvasChange}
        theme={THEME.DARK}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveToActiveFile: false,
            saveAsImage: false,
            clearCanvas: true,
            toggleTheme: false,
            changeViewBackgroundColor: false,
          },
        }}
      />
    </div>
  )
}
