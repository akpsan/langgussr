import { useState, type DragEvent } from 'react'
import { nextHint, type Edge, type Puzzle } from '../game/generator'

interface GameProps {
  puzzle: Puzzle
  title: string
  onNewPuzzle?: () => void
}

type SlotMark = 'correct' | 'wrong' | null
type DragSource = { kind: 'tray'; rank: number } | { kind: 'slot'; index: number }

const DRAG_TYPE = 'application/x-langguessr'

export function Game({ puzzle, title, onNewPuzzle }: GameProps) {
  const n = puzzle.alphabet.length
  const [slots, setSlots] = useState<(number | null)[]>(() => Array<number | null>(n).fill(null))
  const [marks, setMarks] = useState<SlotMark[] | null>(null)
  /** Length of the correct prefix for each check. */
  const [attempts, setAttempts] = useState<number[]>([])
  const [hints, setHints] = useState<Edge[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const solved = attempts.length > 0 && attempts[attempts.length - 1] === n
  const placed = new Set(slots.filter((r): r is number => r !== null))
  const tray = puzzle.trayOrder.filter((r) => !placed.has(r))
  const full = slots.every((s) => s !== null)
  const mistakes = attempts.filter((a) => a < n).length

  const highlights = new Map<number, number>()
  for (const h of hints) {
    highlights.set(h.pair, h.position)
    highlights.set(h.pair + 1, h.position)
  }

  function commit(next: (number | null)[]) {
    setSlots(next)
    setMarks(null)
    setSelected(null)
  }

  function place(rank: number, target?: number) {
    const index = target ?? (selected !== null && slots[selected] === null ? selected : slots.indexOf(null))
    if (index < 0) return
    const next = [...slots]
    next[index] = rank // any glyph already there goes back to the tray
    commit(next)
  }

  function swap(a: number, b: number) {
    const next = [...slots]
    ;[next[a], next[b]] = [next[b], next[a]]
    commit(next)
  }

  function remove(index: number) {
    const next = [...slots]
    next[index] = null
    commit(next)
  }

  function clickSlot(i: number) {
    if (selected === null) return setSelected(i)
    if (selected === i) return slots[i] !== null ? remove(i) : setSelected(null)
    if (slots[selected] === null && slots[i] === null) return setSelected(i)
    swap(selected, i)
  }

  function check() {
    let prefix = 0
    while (prefix < n && slots[prefix] === prefix) prefix++
    setAttempts([...attempts, prefix])
    setMarks(slots.map((_, i) => (i < prefix ? 'correct' : i === prefix ? 'wrong' : null)))
    setSelected(null)
  }

  function hint() {
    const edge = nextHint(puzzle, slots, new Set(hints.map((h) => h.from)))
    if (edge) setHints([...hints, edge])
  }

  function shareText(): string {
    const rows = attempts.map((p) =>
      p === n ? '🟩'.repeat(n) : '🟩'.repeat(p) + '🟥' + '⬜'.repeat(n - p - 1),
    )
    const hintText = hints.length === 1 ? '1 hint' : `${hints.length} hints`
    const tries = attempts.length === 1 ? '1 try' : `${attempts.length} tries`
    return `${title}\n🔣 ${tries} · ${hintText}\n${rows.join('\n')}`
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText())
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  // Drag and drop (desktop); tapping works everywhere.
  function onDragStart(e: DragEvent, source: DragSource) {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(source))
    e.dataTransfer.effectAllowed = 'move'
  }

  function readDrag(e: DragEvent): DragSource | null {
    const raw = e.dataTransfer.getData(DRAG_TYPE)
    return raw ? (JSON.parse(raw) as DragSource) : null
  }

  function onDropSlot(e: DragEvent, index: number) {
    e.preventDefault()
    const source = readDrag(e)
    if (!source) return
    if (source.kind === 'tray') place(source.rank, index)
    else if (source.index !== index) swap(source.index, index)
  }

  function onDropTray(e: DragEvent) {
    e.preventDefault()
    const source = readDrag(e)
    if (source?.kind === 'slot') remove(source.index)
  }

  const allowDrop = (e: DragEvent) => e.preventDefault()

  return (
    <div className="game">
      <section className="panel">
        <h2 className="panel-title">
          The dictionary <span className="muted">· {puzzle.words.length} words, in order</span>
        </h2>
        <ol className="words">
          {puzzle.words.map((word, wi) => (
            <li key={wi} className={highlights.has(wi) ? 'word hinted' : 'word'}>
              <span className="word-index">{wi + 1}</span>
              <span className="glyphs">
                {word.map((r, gi) => (
                  <span key={gi} className={highlights.get(wi) === gi ? 'glyph diff' : 'glyph'}>
                    {puzzle.alphabet[r]}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
        {hints.length > 0 && (
          <ul className="clues">
            {hints.map((h) => (
              <li key={h.from}>
                Words {h.pair + 1} &amp; {h.pair + 2}: <span className="glyph">{puzzle.alphabet[h.from]}</span>{' '}
                comes before <span className="glyph">{puzzle.alphabet[h.to]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Your alphabet <span className="muted">· first → last</span>
        </h2>
        <div className="slots">
          {slots.map((rank, i) => {
            const classes = ['slot']
            if (rank === null) classes.push('empty')
            if (selected === i) classes.push('selected')
            if (marks?.[i]) classes.push(marks[i])
            return (
              <button
                key={i}
                className={classes.join(' ')}
                disabled={solved}
                draggable={rank !== null && !solved}
                onDragStart={(e) => rank !== null && onDragStart(e, { kind: 'slot', index: i })}
                onDragOver={allowDrop}
                onDrop={(e) => onDropSlot(e, i)}
                onClick={() => clickSlot(i)}
                aria-label={rank === null ? `Empty position ${i + 1}` : `Position ${i + 1}: ${puzzle.alphabet[rank]}`}
              >
                {rank === null ? <span className="slot-number">{i + 1}</span> : puzzle.alphabet[rank]}
              </button>
            )
          })}
        </div>

        {!solved && (
          <>
            <div className="tray" onDragOver={allowDrop} onDrop={onDropTray}>
              {tray.length === 0 ? (
                <span className="muted tray-empty">All letters placed. Drag one back here to remove it.</span>
              ) : (
                tray.map((r) => (
                  <button
                    key={r}
                    className="tile"
                    draggable
                    onDragStart={(e) => onDragStart(e, { kind: 'tray', rank: r })}
                    onClick={() => place(r)}
                    aria-label={`Place ${puzzle.alphabet[r]}`}
                  >
                    {puzzle.alphabet[r]}
                  </button>
                ))
              )}
            </div>

            <div className="actions">
              <button className="button primary" disabled={!full} onClick={check}>
                Check
              </button>
              <button className="button" onClick={hint} disabled={hints.length >= n - 1}>
                Hint
              </button>
              <button className="button" onClick={() => commit(Array<number | null>(n).fill(null))}>
                Clear
              </button>
            </div>
            <p className="status muted">
              {marks && marks.includes('wrong')
                ? 'Green letters are in the right place. The red one is your first mistake.'
                : 'Tap a letter to place it. Tap two slots to swap them, or tap a selected slot to remove it.'}
              {attempts.length > 0 && ` Mistakes: ${mistakes}.`}
            </p>
          </>
        )}

        {solved && (
          <div className="win">
            <p className="win-title">Deciphered!</p>
            <p>
              {mistakes === 0 ? 'No mistakes' : mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`},{' '}
              {hints.length === 1 ? '1 hint' : `${hints.length} hints`}. These glyphs come from{' '}
              {puzzle.scriptName}, in an invented order.
            </p>
            <pre className="share">{shareText()}</pre>
            <div className="actions">
              <button className="button primary" onClick={copyShare}>
                {copied ? 'Copied' : 'Copy result'}
              </button>
              {onNewPuzzle && (
                <button className="button" onClick={onNewPuzzle}>
                  New puzzle
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
