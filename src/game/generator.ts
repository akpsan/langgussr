import { GLYPH_SETS } from './glyphs'
import { hashString, mulberry32, randInt, shuffle, type Rng } from './rng'

export type Difficulty = 'easy' | 'medium' | 'hard'

/** A word is a list of letter ranks; rank r is the r-th letter of the secret alphabet. */
export type Word = readonly number[]

/** "Letter `from` comes before letter `to`", learned from words[pair] vs words[pair + 1]. */
export interface Edge {
  from: number
  to: number
  pair: number
  position: number
}

export interface Puzzle {
  seed: number
  difficulty: Difficulty
  scriptName: string
  /** alphabet[rank] = glyph, so this array is also the answer. */
  alphabet: string[]
  /** Words sorted by the secret alphabet. */
  words: Word[]
  /** Shuffled ranks, the order glyphs appear in the tray. */
  trayOrder: number[]
}

const SETTINGS: Record<
  Difficulty,
  { size: number; minLen: number; maxLen: number; extraWords: number; startLetters: number }
> = {
  easy: { size: 5, minLen: 2, maxLen: 3, extraWords: 2, startLetters: 2 },
  medium: { size: 7, minLen: 2, maxLen: 4, extraWords: 1, startLetters: 3 },
  hard: { size: 9, minLen: 2, maxLen: 5, extraWords: 0, startLetters: 3 },
}

export function compareWords(a: Word, b: Word): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

/** Index of the first differing letter, or -1 if one word is a prefix of the other. */
export function firstDifference(a: Word, b: Word): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return i
  }
  return -1
}

/** The Alien Dictionary step: every adjacent pair of words gives at most one ordering clue. */
export function deriveEdges(words: readonly Word[]): Edge[] {
  const edges: Edge[] = []
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i]
    const b = words[i + 1]
    const d = firstDifference(a, b)
    if (d >= 0) edges.push({ from: a[d], to: b[d], pair: i, position: d })
  }
  return edges
}

/**
 * A DAG has exactly one topological order iff that order is a Hamiltonian path, so every
 * consecutive pair (r, r+1) of the true order must be linked by a direct clue.
 */
export function hasUniqueOrder(words: readonly Word[], size: number): boolean {
  const seen = new Set(deriveEdges(words).map((e) => e.from * size + e.to))
  for (let r = 0; r < size - 1; r++) {
    if (!seen.has(r * size + r + 1)) return false
  }
  return true
}

function randomWord(
  rng: Rng,
  size: number,
  minLen: number,
  maxLen: number,
  starts: readonly number[],
): number[] {
  const len = randInt(rng, minLen, maxLen)
  const word = [starts[randInt(rng, 0, starts.length - 1)]]
  while (word.length < len) word.push(randInt(rng, 0, size - 1))
  return word
}

export function generatePuzzle(seed: number, difficulty: Difficulty): Puzzle {
  const rng = mulberry32(seed)
  const { size, minLen, maxLen, extraWords, startLetters } = SETTINGS[difficulty]
  const set = GLYPH_SETS[randInt(rng, 0, GLYPH_SETS.length - 1)]
  const alphabet = shuffle(rng, set.glyphs).slice(0, size)

  for (;;) {
    // 1. Lots of random words, sorted by the secret order. Words only start with a few
    //    letters (like one page of a dictionary) so the first column can't give the answer away.
    const starts = shuffle(rng, alphabet.map((_, r) => r)).slice(0, startLetters)
    const pool = new Map<string, Word>()
    while (pool.size < size * 10) {
      const w = randomWord(rng, size, minLen, maxLen, starts)
      pool.set(w.join(','), w)
    }
    const all = [...pool.values()].sort(compareWords)
    if (!hasUniqueOrder(all, size)) continue

    // 2. Remove words one at a time while the answer stays unique, leaving a minimal list.
    let kept = all
    const removed: Word[] = []
    for (const w of shuffle(rng, all)) {
      const without = kept.filter((k) => k !== w)
      if (hasUniqueOrder(without, size)) {
        kept = without
        removed.push(w)
      }
    }

    // 3. Easier levels add back a few redundant words.
    const words = [...kept, ...shuffle(rng, removed).slice(0, extraWords)].sort(compareWords)

    let trayOrder = shuffle(rng, alphabet.map((_, r) => r))
    if (trayOrder.every((r, i) => r === i)) trayOrder = trayOrder.reverse()

    return { seed, difficulty, scriptName: set.name, alphabet, words, trayOrder }
  }
}

/**
 * Hint: reveal the clue that tells the player which letter follows the correctly placed
 * prefix, skipping clues already revealed.
 */
export function nextHint(
  puzzle: Puzzle,
  slots: readonly (number | null)[],
  revealedFrom: ReadonlySet<number>,
): Edge | null {
  const n = puzzle.alphabet.length
  const edges = deriveEdges(puzzle.words)
  const firstWrong = slots.findIndex((r, i) => r !== i)
  const start = firstWrong <= 0 ? 0 : firstWrong - 1
  for (let k = 0; k < n - 1; k++) {
    const r = (start + k) % (n - 1)
    if (revealedFrom.has(r)) continue
    const edge = edges.find((e) => e.from === r && e.to === r + 1)
    if (edge) return edge
  }
  return null
}

const EPOCH = Date.UTC(2026, 10, 17)

export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dailyNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000) + 1
}

export function dailySeed(key: string, difficulty: Difficulty): number {
  return hashString(`langguessr:${key}:${difficulty}`)
}
