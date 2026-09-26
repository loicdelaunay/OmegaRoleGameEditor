import type { CSSProperties, RefObject } from 'react'
import { X } from 'lucide-react'
import type { DiceHistoryEntry } from '../../types/dice'
import { interpretD100Roll, DICE_INTERPRETATION_COLOR } from '../../lib/diceInterpretation'

function formatDiceFormula(count: number, sides: number, modifier?: number) {
  const rawValue = `${normalizeDiceCount(count)}d${normalizeDiceSides(sides)}`
  if (!modifier) return rawValue
  return `${rawValue}${modifier > 0 ? '+' : ''}${modifier}`
}

function normalizeDiceSides(value: number) {
  if (!Number.isFinite(value)) {
    return 6
  }
  return Math.max(2, Math.min(1000, Math.round(value)))
}

function normalizeDiceCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.min(100, Math.round(value)))
}

export type DiceHistoryDialogProps = {
  isOpen: boolean
  backdropPointerDownRef: RefObject<boolean>
  diceHistory: DiceHistoryEntry[]
  onClose: () => void
}

export function DiceHistoryDialog({
  isOpen,
  backdropPointerDownRef,
  diceHistory,
  onClose,
}: DiceHistoryDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => { backdropPointerDownRef.current = e.target === e.currentTarget }}
      onClick={() => { if (backdropPointerDownRef.current) onClose() }}
    >
      <section className="dialog conn-dialog card surface-base dice-history-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="library-dialog-header surface-tonal">
          <div className="library-dialog-title-row">
            <div className="library-dialog-intro">
              <h2>Historique des dés</h2>
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              <X className="button-icon" strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <div className="conn-dialog-body dice-history-list" style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          {diceHistory.length === 0 ? (
            <p className="helper">Aucun lancer pour cette salle.</p>
          ) : (
            diceHistory.map((entry) => {
              const interpretation =
                entry.successThreshold !== undefined && entry.sides === 100 && entry.result !== null
                  ? interpretD100Roll(entry.result, entry.successThreshold)
                  : null
              return (
              <article
                key={entry.id}
                className="dice-history-entry surface-tonal"
                style={{ '--dice-player-color': entry.playerColor } as CSSProperties}
              >
                <div className="dice-history-entry-row">
                  <strong className="dice-history-player">
                    <span className="dice-history-player-swatch" />
                    <span>{entry.playerName}</span>
                  </strong>
                  <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="dice-history-entry-row">
                  <span>
                    {formatDiceFormula(entry.count ?? 1, entry.sides, entry.modifier)}
                    {entry.reason ? ` - ${entry.reason}` : ''}
                  </span>
                  <span className={entry.isSecret ? 'dice-history-tag secret' : 'dice-history-tag'}>
                    {entry.isSecret ? 'Discret' : 'Public'}
                  </span>
                </div>
                <div className="dice-history-entry-row">
                  <strong className="dice-history-result">
                    {entry.result === null
                      ? 'Resultat masque'
                      : `Resultat ${entry.result}`}
                  </strong>
                  {interpretation ? (
                    <strong
                      className="dice-history-interpretation"
                      style={{ color: DICE_INTERPRETATION_COLOR[interpretation.kind], fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      {interpretation.label}
                      {interpretation.margin !== 0 ? ` (${interpretation.margin > 0 ? '+' : ''}${interpretation.margin})` : ''}
                    </strong>
                  ) : null}
                </div>
              </article>
              )
            })
          )}
        </div>
        <div className="conn-dialog-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="text-button ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </section>
    </div>
  )
}
