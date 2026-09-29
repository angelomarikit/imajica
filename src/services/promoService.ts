import type { LandingPromo } from '@/types'

const STORAGE_KEY = 'imajica_landing_promo'
const CHANGE_EVENT = 'imajica:landing-promo-changed'

export const DEFAULT_LANDING_PROMOS: LandingPromo[] = []

/** @deprecated use createEmptyPromo() when no stored promos */
export const DEFAULT_LANDING_PROMO: LandingPromo = {
  id: 'landing-empty',
  badge: 'Special Offer',
  headline: 'New Promotion',
  description: 'Describe this offer for the landing card.',
  ctaLabel: 'View Special Promo Today',
  modalTitle: 'New Promotion',
  modalBody: 'Add the full promo details shown in the modal.',
  highlights: ['Highlight benefit one', 'Highlight benefit two'],
  validUntil: '',
  discountLabel: '',
  isActive: true,
  updatedAt: new Date().toISOString(),
}

function isPromo(value: unknown): value is LandingPromo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'headline' in value &&
    'modalTitle' in value
  )
}

function normalizeList(raw: unknown): LandingPromo[] | null {
  if (Array.isArray(raw)) {
    const list = raw.filter(isPromo)
    return list.length > 0 ? list : null
  }
  // Migrate legacy single-promo object
  if (isPromo(raw)) return [raw]
  return null
}

function readStored(): LandingPromo[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeList(JSON.parse(raw))
  } catch {
    return null
  }
}

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function getLandingPromos(): LandingPromo[] {
  const stored = readStored()
  if (stored && stored.length > 0) return stored
  if (DEFAULT_LANDING_PROMOS.length > 0) {
    return DEFAULT_LANDING_PROMOS.map((p) => ({ ...p }))
  }
  return [createEmptyPromo()]
}

/** Featured card content — first active promo, else first in list */
export function getLandingPromo(): LandingPromo {
  const list = getLandingPromos()
  return list.find((p) => p.isActive) ?? list[0] ?? createEmptyPromo()
}

export function getActiveLandingPromos(): LandingPromo[] {
  return getLandingPromos().filter((p) => p.isActive)
}

export function saveLandingPromos(promos: LandingPromo[]): LandingPromo[] {
  const stamp = new Date().toISOString()
  const next = promos.map((p) => ({ ...p, updatedAt: stamp }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange()
  return next
}

/** Save one promo (create or update by id) */
export function saveLandingPromo(promo: LandingPromo): LandingPromo {
  const list = getLandingPromos()
  const idx = list.findIndex((p) => p.id === promo.id)
  const next =
    idx >= 0
      ? list.map((p, i) => (i === idx ? promo : p))
      : [...list, promo]
  saveLandingPromos(next)
  return { ...promo, updatedAt: new Date().toISOString() }
}

export function deleteLandingPromo(id: string): LandingPromo[] {
  const next = getLandingPromos().filter((p) => p.id !== id)
  if (next.length === 0) return saveLandingPromos([createEmptyPromo()])
  return saveLandingPromos(next)
}

export function createEmptyPromo(): LandingPromo {
  return {
    id: `promo-${Date.now()}`,
    badge: 'Special Offer',
    headline: 'New Promotion',
    description: 'Describe this offer for the landing card.',
    ctaLabel: 'View Special Promo Today',
    modalTitle: 'New Promotion',
    modalBody: 'Add the full promo details shown in the modal.',
    highlights: ['Highlight benefit one', 'Highlight benefit two'],
    validUntil: '',
    discountLabel: '',
    isActive: true,
    updatedAt: new Date().toISOString(),
  }
}

export function subscribeLandingPromo(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
