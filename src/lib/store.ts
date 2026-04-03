// Shared types

export interface ChatChip {
  role: 'user' | 'assistant'
  text: string
  images?: { src: string; label: string }[]
}
