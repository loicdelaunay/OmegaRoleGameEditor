import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { interpretD100Roll, DICE_INTERPRETATION_COLOR } from '../lib/diceInterpretation'
import { playCriticalSuccessSound, playCriticalFailureSound } from '../lib/diceSounds'

export type DiceRollPopupEntry = {
  playerColor: string
  playerName: string
  count?: number
  sides: number
  modifier?: number
  reason?: string
  rolls?: number[]
  result: number | null
  isSecret: boolean
  /** Seuil de réussite pour les jets de caractéristique (d100). */
  successThreshold?: number
}

type DiceRollPopupProps = {
  roll: DiceRollPopupEntry
  stackIndex: number
  animationDurationMs: number
  resultDisplayDurationMs: number
}

export function DiceRollPopup({ roll, stackIndex, animationDurationMs, resultDisplayDurationMs }: DiceRollPopupProps) {
  const [displayValue, setDisplayValue] = useState(() => Math.max(1, Math.floor(Math.random() * roll.sides) + 1))
  const [isRevealed, setIsRevealed] = useState(false)
  const soundPlayedRef = useRef(false)

  useEffect(() => {
    setIsRevealed(false)
    soundPlayedRef.current = false
    setDisplayValue(Math.max(1, Math.floor(Math.random() * roll.sides) + 1))

    const scrambleDuration = Math.max(250, animationDurationMs)
    const intervalId = window.setInterval(() => {
      setDisplayValue(Math.max(1, Math.floor(Math.random() * roll.sides) + 1))
    }, 70)

    const revealTimeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId)
      setDisplayValue(roll.result ?? 0)
      setIsRevealed(true)
    }, scrambleDuration)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(revealTimeoutId)
    }
  }, [animationDurationMs, resultDisplayDurationMs, roll])

  const interpretation = useMemo(() => {
    if (!isRevealed || roll.result === null || roll.successThreshold === undefined || roll.sides !== 100) return null
    return interpretD100Roll(roll.result, roll.successThreshold)
  }, [isRevealed, roll.result, roll.successThreshold, roll.sides])

  // Joue le son critique une seule fois au moment du reveal.
  useEffect(() => {
    if (!isRevealed || soundPlayedRef.current) return
    if (!interpretation) return
    if (interpretation.kind === 'critical_success') {
      playCriticalSuccessSound()
      soundPlayedRef.current = true
    } else if (interpretation.kind === 'critical_failure') {
      playCriticalFailureSound()
      soundPlayedRef.current = true
    }
  }, [isRevealed, interpretation])

  const interpColor = interpretation ? DICE_INTERPRETATION_COLOR[interpretation.kind] : undefined
  const isCritical = interpretation?.kind === 'critical_success' || interpretation?.kind === 'critical_failure'

  // Classe CSS pour l'animation critique.
  const cardClassName = [
    'dice-roll-card',
    'surface-base',
    isRevealed ? 'revealed' : '',
    isCritical && isRevealed ? `dice-critical dice-critical-${interpretation!.kind}` : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="dice-roll-overlay" style={{ '--dice-stack-index': stackIndex } as CSSProperties}>
      <section
        className={cardClassName}
        style={{ '--dice-player-color': roll.playerColor } as CSSProperties}
      >
        <div className="dice-roll-header">
          <span className="dice-roll-kicker">{roll.isSecret ? 'Lancer discret' : 'Lancer partage'}</span>
          <strong>{roll.playerName}</strong>
        </div>
        <div className="dice-roll-body">
          <div className="dice-roll-face">{displayValue}</div>
          <div className="dice-roll-meta">
            <span>
              {`${Math.max(1, Math.round(roll.count ?? 1))}d${Math.max(2, Math.round(roll.sides))}`}
              {roll.modifier ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : ''}
              {roll.reason ? ` - ${roll.reason}` : ''}
            </span>
            <strong>
              {!isRevealed
                ? 'Resultat...'
                : roll.result === null
                ? 'Resultat masque'
                : `Resultat ${roll.result}`}
            </strong>
            {interpretation ? (
              <span
                className={`dice-interp-chip dice-interp-chip-${interpretation.kind}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: `color-mix(in srgb, ${interpColor} 18%, transparent)`,
                  color: interpColor,
                  border: `1px solid color-mix(in srgb, ${interpColor} 40%, transparent)`,
                }}
              >
                {interpretation.label}
                {interpretation.margin !== 0 ? ` (${interpretation.margin > 0 ? '+' : ''}${interpretation.margin})` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}