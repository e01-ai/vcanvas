/** Provider and model configuration */

export type ApiType = 'openai' | 'gemini'

export interface ModelDef {
  id: string
  label: string
  vision?: boolean
}

export interface ProviderDef {
  id: string
  name: string
  type: ApiType
  endpoint: string
  models: ModelDef[]
  keyHint: string
  keyUrl: string
  keyUrlLabel: string
  storageKey: string
  /** Allow user to type a custom endpoint URL */
  customEndpoint?: boolean
  /** Allow fetching models from API */
  fetchModels?: boolean
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'zai',
    name: 'z.ai',
    type: 'openai',
    endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
    models: [
      { id: 'glm-5v-turbo', label: 'GLM-5V Turbo', vision: true },
    ],
    keyHint: 'paste z.ai key',
    keyUrl: 'https://z.ai',
    keyUrlLabel: 'z.ai',
    storageKey: 'glm5v_key',
  },
  {
    id: 'google',
    name: 'Google',
    type: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', vision: true },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3.1 Flash', vision: true },
      { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite', vision: true },
    ],
    keyHint: 'paste Google AI key',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'AI Studio',
    storageKey: 'gemini_key',
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    type: 'openai',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    models: [
      { id: 'accounts/fireworks/routers/kimi-k2p5-turbo', label: 'Kimi K2.5 Turbo', vision: true },
    ],
    keyHint: 'paste Fire Pass key',
    keyUrl: 'https://app.fireworks.ai/fire-pass',
    keyUrlLabel: 'Fire Pass',
    storageKey: 'fireworks_key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    fetchModels: true,
    models: [
      { id: 'anthropic/claude-4.6-sonnet-20260217', label: 'Claude 4.6 Sonnet', vision: true },
      { id: 'anthropic/claude-opus-4.6', label: 'Claude 4.6 Opus', vision: true },
      { id: 'google/gemini-3-flash-preview-20251217', label: 'Gemini 3 Flash', vision: true },
      { id: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast', vision: true },
      { id: 'qwen/qwen3.5-plus-02-15', label: 'Qwen 3.5 Plus', vision: true },
      { id: 'xiaomi/mimo-v2-omni', label: 'MiMo V2 Omni', vision: true },
      { id: 'moonshotai/kimi-k2.5-0127', label: 'Kimi K2.5', vision: true },
    ],
    keyHint: 'paste OpenRouter key',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'OpenRouter',
    storageKey: 'openrouter_key',
  },
  {
    id: 'custom',
    name: 'Custom',
    type: 'openai',
    endpoint: '',
    customEndpoint: true,
    models: [],
    keyHint: 'paste API key (if needed)',
    keyUrl: '',
    keyUrlLabel: '',
    storageKey: 'custom_key',
  },
]

export function getProvider(id: string): ProviderDef {
  return PROVIDERS.find(p => p.id === id) || PROVIDERS[0]
}

/** Saved user state */
export interface ProviderState {
  activeProviderId: string
  activeModelId: string
  keys: Record<string, string>
  /** Custom endpoint URL for the "custom" provider */
  customEndpoint?: string
  /** Custom model ID for manual input */
  customModelId?: string
}

const STORAGE_KEY = 'vcanvas_provider_state'

export function loadProviderState(): ProviderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      for (const p of PROVIDERS) {
        if (!parsed.keys?.[p.id]) {
          const oldKey = localStorage.getItem(p.storageKey)
          if (oldKey) {
            if (!parsed.keys) parsed.keys = {}
            parsed.keys[p.id] = oldKey
          }
        }
      }
      if (!PROVIDERS.find(p => p.id === parsed.activeProviderId) && parsed.activeProviderId !== 'custom') {
        parsed.activeProviderId = PROVIDERS[0].id
        parsed.activeModelId = PROVIDERS[0].models[0].id
      }
      return parsed
    }
  } catch { /* ignore */ }

  const keys: Record<string, string> = {}
  for (const p of PROVIDERS) {
    const oldKey = localStorage.getItem(p.storageKey)
    if (oldKey) keys[p.id] = oldKey
  }

  const oldProvider = localStorage.getItem('vcanvas_provider')
  let activeProviderId = PROVIDERS[0].id
  if (oldProvider === 'glm5v') activeProviderId = 'zai'
  else if (oldProvider === 'gemini') activeProviderId = 'google'

  const provider = getProvider(activeProviderId)
  return {
    activeProviderId,
    activeModelId: provider.models[0]?.id || '',
    keys,
  }
}

export function saveProviderState(state: ProviderState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Fetch vision-capable models from OpenRouter API */
export async function fetchOpenRouterModels(): Promise<ModelDef[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  if (!res.ok) throw new Error(`OpenRouter API ${res.status}`)
  const data = await res.json()
  const models: ModelDef[] = []
  for (const m of data.data || []) {
    const modalities = m.architecture?.input_modalities
    if (Array.isArray(modalities) && modalities.includes('image')) {
      models.push({
        id: m.id,
        label: (m.name || m.id).replace(/^[^:]+:\s*/, ''),
        vision: true,
      })
    }
  }
  return models
}
