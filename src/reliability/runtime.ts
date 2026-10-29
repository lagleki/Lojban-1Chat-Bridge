import { EventEmitter } from "events"

/**
 * Tiny process-wide registry so piers can talk to the reliability layer
 * without import cycles (piers are loaded before the manager exists).
 */

/** Piers emit "down" (messenger, reason) and "probe" (messenger) here. */
export const healthBus = new EventEmitter()
healthBus.setMaxListeners(100)

/** A native signal says the connection of `messenger` is gone. */
export function reportDown(messenger: string, reason: string): void {
  healthBus.emit("down", messenger, reason)
}

/** Something looks off for `messenger`: run an active probe soon. */
export function requestProbe(messenger: string): void {
  healthBus.emit("probe", messenger)
}

export interface CursorStore {
  getCursor(key: string): string | undefined
  setCursor(key: string, value: string): void
}

const memoryCursors = new Map<string, string>()
let cursorStore: CursorStore | null = null

export function setCursorStore(store: CursorStore | null): void {
  cursorStore = store
}

/** Persistent key/value (inbound catch-up positions). Falls back to memory. */
export function getCursor(key: string): string | undefined {
  return cursorStore ? cursorStore.getCursor(key) : memoryCursors.get(key)
}

export function setCursor(key: string, value: string): void {
  if (cursorStore) cursorStore.setCursor(key, value)
  else memoryCursors.set(key, value)
}

/** 31-bit positive integer hash (e.g. VK random_id) of a string key. */
export function hash31(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 1 || 1
}

/**
 * Remembers recently seen ids (bounded), so inbound catch-up does not relay a
 * message twice when it races with the live event stream.
 */
export class SeenSet {
  private readonly set = new Set<string>()
  constructor(private readonly max = 5000) {}
  /** Returns true if the id was new (and records it). */
  add(id: string | number): boolean {
    const k = String(id)
    if (this.set.has(k)) return false
    this.set.add(k)
    if (this.set.size > this.max) {
      const first = this.set.values().next().value
      if (first !== undefined) this.set.delete(first)
    }
    return true
  }
  has(id: string | number): boolean {
    return this.set.has(String(id))
  }
}
