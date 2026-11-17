import { useMemo, useState } from 'react'
import { Game } from './components/Game'
import { dailyNumber, dailySeed, generatePuzzle, todayKey, type Difficulty } from './game/generator'
import './App.css'

type Mode = 'daily' | 'practice'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const randomSeed = () => Math.floor(Math.random() * 2 ** 32)
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

function App() {
  const [mode, setMode] = useState<Mode>('daily')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [practiceSeed, setPracticeSeed] = useState(randomSeed)
  const [dayKey] = useState(() => todayKey())

  const seed = mode === 'daily' ? dailySeed(dayKey, difficulty) : practiceSeed
  const puzzle = useMemo(() => generatePuzzle(seed, difficulty), [seed, difficulty])
  const title =
    mode === 'daily'
      ? `LangGuessr #${dailyNumber(dayKey)} · ${capitalize(difficulty)}`
      : `LangGuessr Practice · ${capitalize(difficulty)}`

  return (
    <main className="app">
      <header className="header">
        <h1 className="logo">LangGuessr</h1>
        <p className="tagline">
          These words are sorted alphabetically in an unknown alphabet. Work out the order of its letters.
        </p>
        <div className="controls">
          <div className="segmented" role="group" aria-label="Mode">
            {(['daily', 'practice'] as const).map((m) => (
              <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                {capitalize(m)}
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button key={d} className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)}>
                {capitalize(d)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Game
        key={`${mode}:${seed}:${difficulty}`}
        puzzle={puzzle}
        title={title}
        onNewPuzzle={mode === 'practice' ? () => setPracticeSeed(randomSeed()) : undefined}
      />
    </main>
  )
}

export default App
