import React, { useCallback, useRef } from 'react'
import './ResizeHandle.css'

interface Props {
  onResize: (deltaX: number) => void
}

export function ResizeHandle({ onResize }: Props) {
  const startXRef = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMove = (ev: PointerEvent) => {
      onResize(ev.clientX - startXRef.current)
      startXRef.current = ev.clientX
    }

    const handleUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [onResize])

  return (
    <div className="resize-handle" onPointerDown={handlePointerDown}>
      <div className="resize-handle-grip" />
    </div>
  )
}
