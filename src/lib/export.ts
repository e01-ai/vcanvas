import { exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export interface SourceInfo {
  id: string
  name: string
  kind: 'frame' | 'image'
}

/**
 * Get all sendable sources: frames + top-level images (not inside a frame).
 */
export function getSources(api: ExcalidrawImperativeAPI): SourceInfo[] {
  const elements = api.getSceneElements()
  const sources: SourceInfo[] = []

  for (const el of elements) {
    if (el.type === 'frame') {
      sources.push({
        id: el.id,
        name: (el as any).name || 'Untitled',
        kind: 'frame',
      })
    } else if (el.type === 'image' && !el.frameId) {
      sources.push({
        id: el.id,
        name: 'Image',
        kind: 'image',
      })
    }
  }

  return sources
}

/**
 * Export specific source (frame or image) as PNG base64 string.
 */
export async function exportSourceAsPng(
  api: ExcalidrawImperativeAPI,
  sourceId: string,
): Promise<string | null> {
  const allElements = api.getSceneElements()
  const source = allElements.find((el) => el.id === sourceId)
  if (!source) return null

  let elementsToExport: readonly ExcalidrawElement[]

  if (source.type === 'frame') {
    // Frame + all its children
    elementsToExport = allElements.filter(
      (el) => el.id === sourceId || el.frameId === sourceId
    )
  } else {
    // Single element
    elementsToExport = [source]
  }

  const isDark = (api.getAppState() as any).theme === 'dark'

  try {
    const blob = await exportToBlob({
      elements: elementsToExport as any,
      appState: {
        exportWithDarkMode: isDark,
        exportBackground: true,
      },
      files: api.getFiles(),
      mimeType: 'image/png',
      exportPadding: 16,
    })

    return await blobToBase64(blob)
  } catch (e) {
    console.error('Export failed:', e)
    return null
  }
}

/**
 * Export all shapes on the canvas as a single PNG.
 */
export async function exportAllAsPng(
  api: ExcalidrawImperativeAPI,
): Promise<string | null> {
  const elements = api.getSceneElements()
  if (elements.length === 0) return null

  const isDark = (api.getAppState() as any).theme === 'dark'

  try {
    const blob = await exportToBlob({
      elements: elements as any,
      appState: {
        exportWithDarkMode: isDark,
        exportBackground: true,
      },
      files: api.getFiles(),
      mimeType: 'image/png',
      exportPadding: 16,
    })

    return await blobToBase64(blob)
  } catch (e) {
    console.error('Export all failed:', e)
    return null
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
