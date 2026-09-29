import type { WasteInventoryItem } from '@/types'

const STORAGE_KEY = 'imajica_waste_inventory'
const CHANGE_EVENT = 'imajica:waste-changed'

const DEFAULT_ITEMS: WasteInventoryItem[] = []

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readStored(): WasteInventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WasteInventoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_deleted`)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

/** Days past expiry (0 if not yet expired). */
export function daysExpired(expiryDate: string, now = new Date()): number {
  const end = new Date(expiryDate)
  end.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - end.getTime()) / 86_400_000)
  return Math.max(0, diff)
}

export function getWasteItems(): WasteInventoryItem[] {
  const extra = readStored()
  const deleted = readDeleted()
  const seedIds = new Set(DEFAULT_ITEMS.map((i) => i.id))
  const overrides = new Map(extra.filter((i) => seedIds.has(i.id)).map((i) => [i.id, i]))
  const customs = extra.filter((i) => !seedIds.has(i.id))
  return [...customs, ...DEFAULT_ITEMS.map((i) => overrides.get(i.id) ?? i)]
    .filter((i) => !deleted.has(i.id) && daysExpired(i.expiryDate) > 0)
    .sort((a, b) => daysExpired(b.expiryDate) - daysExpired(a.expiryDate))
}

export function getWasteBranches(): string[] {
  const names = new Set(getWasteItems().map((i) => i.branchName))
  return [...names].sort()
}

export function saveWasteItem(item: WasteInventoryItem): WasteInventoryItem {
  const extra = readStored()
  const idx = extra.findIndex((i) => i.id === item.id)
  const next = idx >= 0 ? extra.map((i, n) => (n === idx ? item : i)) : [item, ...extra]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emit()
  return item
}

export function deleteWasteItem(id: string) {
  if (id.startsWith('waste-') && !DEFAULT_ITEMS.some((i) => i.id === id)) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readStored().filter((i) => i.id !== id)),
    )
  } else {
    const deleted = readDeleted()
    deleted.add(id)
    localStorage.setItem(`${STORAGE_KEY}_deleted`, JSON.stringify([...deleted]))
  }
  emit()
}

export function subscribeWaste(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === `${STORAGE_KEY}_deleted`) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
