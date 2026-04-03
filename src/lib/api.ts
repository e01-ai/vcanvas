import type { ProviderDef } from './providers'

export interface StreamCallbacks {
  onChunk: (text: string, tokenIndex: number) => void
  onThinking?: (text: string) => void
  onDone: (fullText: string, usage: { input_tokens: number | string; output_tokens: number | string }) => void
  onError: (error: Error) => void
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: any[] | string
}

// ── Message format converters ──

function toOpenAIMessages(messages: Message[]): any[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content }
    }
    const parts = msg.content.map((c: any) => {
      if (c.type === 'text') return { type: 'text', text: c.text }
      if (c.type === 'image' && c.source) {
        return {
          type: 'image_url',
          image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` },
        }
      }
      if (c.type === 'image_url') return c
      return c
    })
    return { role: msg.role, content: parts }
  })
}

function toGeminiPayload(messages: Message[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: any = undefined
  const contents: any[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string'
        ? msg.content
        : (msg.content as any[]).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
      systemInstruction = { parts: [{ text }] }
      continue
    }

    const role = msg.role === 'assistant' ? 'model' : 'user'

    if (typeof msg.content === 'string') {
      contents.push({ role, parts: [{ text: msg.content }] })
      continue
    }

    const parts: any[] = []
    for (const c of msg.content as any[]) {
      if (c.type === 'text') {
        parts.push({ text: c.text })
      } else if (c.type === 'image' && c.source) {
        parts.push({ inline_data: { mime_type: c.source.media_type, data: c.source.data } })
      } else if (c.type === 'image_url' && c.image_url?.url) {
        const url: string = c.image_url.url
        if (url.startsWith('data:')) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/)
          if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } })
        }
      }
    }
    contents.push({ role, parts })
  }

  return { systemInstruction, contents }
}

// ── SSE stream readers ──

async function readOpenAIStream(
  response: Response,
  callbacks: StreamCallbacks
) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let usage = { input_tokens: 0 as number | string, output_tokens: 0 as number | string }
  let tokenCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue

      try {
        const event = JSON.parse(data)
        const delta = event.choices?.[0]?.delta
        // Thinking/reasoning tokens (DeepSeek, Kimi, QwQ, etc.)
        const thinking = delta?.reasoning_content || delta?.reasoning
        if (thinking && callbacks.onThinking) {
          callbacks.onThinking(thinking)
        }
        if (delta?.content) {
          const chunk = delta.content
          fullText += chunk
          tokenCount++
          callbacks.onChunk(chunk, tokenCount)
        }
        if (event.usage) {
          usage = {
            input_tokens: event.usage.prompt_tokens || event.usage.input_tokens || 0,
            output_tokens: event.usage.completion_tokens || event.usage.output_tokens || 0,
          }
        }
      } catch { /* skip */ }
    }
  }

  callbacks.onDone(fullText, usage)
}

async function readGeminiStream(
  response: Response,
  callbacks: StreamCallbacks
) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let usage = { input_tokens: 0 as number | string, output_tokens: 0 as number | string }
  let tokenCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data) continue

      try {
        const event = JSON.parse(data)
        const parts = event.candidates?.[0]?.content?.parts
        if (parts) {
          for (const part of parts) {
            if (part.thought && part.text) {
              if (callbacks.onThinking) callbacks.onThinking(part.text)
              continue
            }
            if (part.text) {
              fullText += part.text
              tokenCount++
              callbacks.onChunk(part.text, tokenCount)
            }
          }
        }
        if (event.usageMetadata) {
          usage = {
            input_tokens: event.usageMetadata.promptTokenCount || 0,
            output_tokens: event.usageMetadata.candidatesTokenCount || 0,
          }
        }
      } catch { /* skip */ }
    }
  }

  callbacks.onDone(fullText, usage)
}

// ── Unified streaming entry point ──

export async function streamChat(
  provider: ProviderDef,
  apiKey: string,
  modelId: string,
  messages: Message[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  endpointOverride?: string
) {
  const endpoint = endpointOverride || provider.endpoint

  if (provider.type === 'gemini') {
    const apiUrl = `${endpoint}/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`
    const { systemInstruction, contents } = toGeminiPayload(messages)
    const body: any = { contents }
    if (systemInstruction) body.systemInstruction = systemInstruction

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`${provider.name} ${response.status}: ${errText}`)
    }

    return readGeminiStream(response, callbacks)
  }

  // OpenAI-compatible (z.ai, Fireworks, OpenRouter, Custom)
  if (!endpoint) throw new Error('No endpoint configured. Set a base URL in settings.')
  const openaiMessages = toOpenAIMessages(messages)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 16000,
      stream: true,
      messages: openaiMessages,
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`${provider.name} ${response.status}: ${errText}`)
  }

  return readOpenAIStream(response, callbacks)
}

// ── HTML extraction + cleanup ──

function cleanSyntaxArtifacts(html: string): string {
  let cleaned = html

  cleaned = cleaned.replace(/<span\s+class="s-[^"]*">/gi, '')
  cleaned = cleaned.replace(/<span\s+class="hljs-[^"]*">/gi, '')
  cleaned = cleaned.replace(/<span\s+class="token\s[^"]*">/gi, '')

  const openSpans = (cleaned.match(/<span[\s>]/gi) || []).length
  const closeSpans = (cleaned.match(/<\/span>/gi) || []).length
  let surplus = closeSpans - openSpans
  if (surplus > 0) {
    cleaned = cleaned.replace(/<\/span>/gi, (match) => {
      if (surplus > 0) { surplus--; return '' }
      return match
    })
  }

  cleaned = cleaned.replace(/class=class="s-[^"]*">"s-[^"]*">/g, '')
  cleaned = cleaned.replace(/"s-(tag|attr|str|kw|num|comment|meta)">/g, '')
  cleaned = cleaned.replace(/ class="s-(tag|attr|str|kw|num|comment|meta)"/g, '')

  return cleaned
}

export function extractHTML(text: string): string | null {
  const fenceMatch = text.match(/```(?:html)?\s*\n([\s\S]*?)```/)
  if (fenceMatch) return cleanSyntaxArtifacts(fenceMatch[1].trim())

  const htmlMatch = text.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i)
  if (htmlMatch) return cleanSyntaxArtifacts(htmlMatch[1].trim())

  const tagMatch = text.match(/(<html[\s\S]*<\/html>)/i)
  if (tagMatch) return cleanSyntaxArtifacts(tagMatch[1].trim())

  if (text.trim().startsWith('<')) return cleanSyntaxArtifacts(text.trim())
  return null
}
