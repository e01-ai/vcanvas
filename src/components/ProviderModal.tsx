import React, { useState, useCallback, useEffect, useRef } from 'react'
import { PROVIDERS, fetchOpenRouterModels, type ProviderDef, type ProviderState, type ModelDef } from '../lib/providers'
import './ProviderModal.css'

interface Props {
  state: ProviderState
  onUpdate: (state: ProviderState) => void
  onClose: () => void
}

export function ProviderModal({ state, onUpdate, onClose }: Props) {
  const [keys, setKeys] = useState<Record<string, string>>({ ...state.keys })
  const [activeProviderId, setActiveProviderId] = useState(state.activeProviderId)
  const [activeModelId, setActiveModelId] = useState(state.activeModelId)
  const [customEndpoint, setCustomEndpoint] = useState(state.customEndpoint || '')
  const [manualModelId, setManualModelId] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // OpenRouter fetched models
  const [fetchedModels, setFetchedModels] = useState<ModelDef[] | null>(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const fetchedRef = useRef(false)

  const activeProvider = PROVIDERS.find(p => p.id === activeProviderId) || PROVIDERS[0]

  // Auto-fetch OpenRouter models when that card is active
  useEffect(() => {
    if (activeProviderId === 'openrouter' && !fetchedRef.current) {
      fetchedRef.current = true
      setFetchLoading(true)
      fetchOpenRouterModels()
        .then(models => {
          setFetchedModels(models)
          setFetchLoading(false)
        })
        .catch(err => {
          setFetchError(err.message)
          setFetchLoading(false)
        })
    }
  }, [activeProviderId])

  const handleKeyChange = useCallback((providerId: string, key: string) => {
    setKeys(prev => ({ ...prev, [providerId]: key }))
  }, [])

  const handleSelectProvider = useCallback((provider: ProviderDef) => {
    setActiveProviderId(provider.id)
    if (provider.id !== activeProviderId) {
      setActiveModelId(provider.models[0]?.id || '')
      setShowManualInput(false)
      setManualModelId('')
      setModelSearch('')
    }
  }, [activeProviderId])

  const handleSelectModel = useCallback((modelId: string) => {
    setActiveModelId(modelId)
    setShowManualInput(false)
  }, [])

  const handleManualModelSubmit = useCallback(() => {
    const id = manualModelId.trim()
    if (id) {
      setActiveModelId(id)
      setShowManualInput(false)
    }
  }, [manualModelId])

  const handleSave = useCallback(() => {
    onUpdate({
      activeProviderId,
      activeModelId,
      keys,
      customEndpoint: customEndpoint || undefined,
      customModelId: activeProviderId === 'custom' ? activeModelId : undefined,
    })
    onClose()
  }, [activeProviderId, activeModelId, keys, customEndpoint, onUpdate, onClose])

  const getKeyStatus = (providerId: string): 'none' | 'set' | 'active' => {
    const key = keys[providerId] || ''
    if (key.length <= 4) return 'none'
    if (providerId === activeProviderId) return 'active'
    return 'set'
  }

  // Get models to display for a provider
  const getDisplayModels = (provider: ProviderDef): ModelDef[] => {
    if (provider.id === 'openrouter' && fetchedModels) {
      const query = modelSearch.toLowerCase()
      if (query) {
        return fetchedModels.filter(m =>
          m.id.toLowerCase().includes(query) || m.label.toLowerCase().includes(query)
        ).slice(0, 30)
      }
      // Default: show curated list
      return provider.models
    }
    return provider.models
  }

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <h2 className="pm-title">Model Settings</h2>
          <button className="pm-close" onClick={onClose}>&times;</button>
        </div>

        <div className="pm-body">
          <div className="pm-cards">
            {PROVIDERS.map((provider) => {
              const isActive = provider.id === activeProviderId
              const keyStatus = getKeyStatus(provider.id)
              const key = keys[provider.id] || ''
              const displayModels = isActive ? getDisplayModels(provider) : []

              return (
                <div
                  key={provider.id}
                  className={`pm-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectProvider(provider)}
                >
                  <div className="pm-card-header">
                    <div className="pm-card-name-row">
                      <span className={`pm-card-dot ${keyStatus}`} />
                      <span className="pm-card-name">{provider.name}</span>
                      {provider.id === 'custom' && <span className="pm-card-tag">OpenAI-compat</span>}
                    </div>
                    {isActive && <span className="pm-card-active-badge">ACTIVE</span>}
                  </div>

                  {/* Custom endpoint input */}
                  {isActive && provider.customEndpoint && (
                    <div className="pm-card-endpoint-row" onClick={(e) => e.stopPropagation()}>
                      <span className="pm-endpoint-label">URL</span>
                      <input
                        type="text"
                        className="pm-key-input"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                        placeholder="https://api.example.com/v1/chat/completions"
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {/* API key input */}
                  <div className="pm-card-key-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="password"
                      className="pm-key-input"
                      value={key}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      placeholder={provider.keyHint}
                      spellCheck={false}
                    />
                    {provider.keyUrl && (
                      <a
                        className="pm-key-link"
                        href={provider.keyUrl}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {provider.keyUrlLabel} &rarr;
                      </a>
                    )}
                  </div>

                  {/* Model selection */}
                  {isActive && (
                    <div className="pm-card-models" onClick={(e) => e.stopPropagation()}>
                      {/* Search bar for OpenRouter */}
                      {provider.fetchModels && (
                        <div className="pm-model-search-row">
                          <input
                            type="text"
                            className="pm-model-search"
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            placeholder="Search vision models..."
                            spellCheck={false}
                          />
                          {fetchLoading && <span className="pm-fetch-status">loading...</span>}
                          {fetchError && <span className="pm-fetch-error">err</span>}
                          {fetchedModels && !modelSearch && (
                            <span className="pm-fetch-status">{fetchedModels.length} models</span>
                          )}
                        </div>
                      )}

                      {/* Model buttons */}
                      {displayModels.map((model) => (
                        <button
                          key={model.id}
                          className={`pm-model-btn ${activeModelId === model.id ? 'selected' : ''}`}
                          onClick={() => handleSelectModel(model.id)}
                          title={model.id}
                        >
                          {model.label}
                          {model.vision && <span className="pm-vision-tag">V</span>}
                        </button>
                      ))}

                      {/* Manual input toggle */}
                      {!showManualInput ? (
                        <button
                          className="pm-model-btn pm-manual-btn"
                          onClick={() => setShowManualInput(true)}
                        >
                          + Custom ID
                        </button>
                      ) : (
                        <div className="pm-manual-row">
                          <input
                            type="text"
                            className="pm-manual-input"
                            value={manualModelId}
                            onChange={(e) => setManualModelId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualModelSubmit()}
                            placeholder="type model ID..."
                            spellCheck={false}
                            autoFocus
                          />
                          <button className="btn btn-primary pm-manual-go" onClick={handleManualModelSubmit}>
                            Use
                          </button>
                        </div>
                      )}

                      {/* Show currently active model if it's custom */}
                      {activeModelId && !displayModels.find(m => m.id === activeModelId) && !provider.models.find(m => m.id === activeModelId) && (
                        <div className="pm-custom-model-active">
                          Using: <span className="pm-custom-model-id">{activeModelId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="pm-footer">
          <div className="pm-footer-info">
            <span className="pm-footer-provider">{activeProvider.name}</span>
            <span className="pm-footer-sep">/</span>
            <span className="pm-footer-model">
              {activeProvider.models.find(m => m.id === activeModelId)?.label || activeModelId}
            </span>
          </div>
          <div className="pm-footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
