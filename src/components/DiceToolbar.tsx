import { Dices, History } from 'lucide-react'
import type { CharacterDocument } from '../lib/character'
import { CharacteristicDiceDropdown } from './dice/CharacteristicDiceDropdown'
import { GMCharacterDiceDropdown, type GMCharacterEntry } from './dice/GMCharacterDiceDropdown'
import type { CharacteristicEntry, CharacteristicConfig } from '../lib/characteristics'

type DiceToolbarProps = {
  isSecretDiceRoll: boolean
  selectedDiceCount: number
  selectedDiceSides: number
  customDiceFormula: string
  diceRollReason: string
  /** Valeur cible (seuil de réussite) optionnelle. Vide = pas d'interprétation. */
  diceTarget: string
  onSecretDiceRollChange: (nextValue: boolean) => void
  onDiceRollReasonChange: (reason: string) => void
  onDiceTargetChange: (target: string) => void
  onSelectDicePreset: (sides: number) => void
  onCustomDiceFormulaChange: (value: string) => void
  onCustomDiceFormulaBlur: () => void
  onOpenDiceHistory: () => void
  onRequestDiceRoll: () => void
  /** Fiche du joueur connecté (mode joueur). Si présente, affiche le dropdown de caractéristiques. */
  playerCharacterData?: CharacterDocument | null
  /** Liste des fiches assignées (mode MJ). Si non vide, affiche le dropdown de fiches. */
  gmCharacters?: GMCharacterEntry[]
  /** Callback appelé quand le joueur ou le MJ lance un jet de caractéristique. */
  onRollCharacteristic?: (entry: CharacteristicEntry, character?: GMCharacterEntry) => void
  /** Config projet pour le calcul dynamique des seuils de réussite. */
  characteristicConfig?: CharacteristicConfig
}

export function DiceToolbar({
  isSecretDiceRoll,
  selectedDiceCount,
  selectedDiceSides,
  customDiceFormula,
  diceRollReason,
  diceTarget,
  onSecretDiceRollChange,
  onDiceRollReasonChange,
  onDiceTargetChange,
  onSelectDicePreset,
  onCustomDiceFormulaChange,
  onCustomDiceFormulaBlur,
  onOpenDiceHistory,
  onRequestDiceRoll,
  playerCharacterData,
  gmCharacters,
  onRollCharacteristic,
  characteristicConfig,
}: DiceToolbarProps) {
  return (
    <div className="toolbar-group toolbar-dice-group">
      <span className="toolbar-group-label">Des</span>
      <label className="dice-custom-field dice-reason-field" style={{ width: '120px' }}>
        <input
          type="text"
          placeholder="Raison..."
          value={diceRollReason}
          onChange={(event) => onDiceRollReasonChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onRequestDiceRoll()
            }
          }}
          style={{ width: '100%', textTransform: 'none', fontWeight: 'normal' }}
        />
      </label>
      <label className="dice-custom-field dice-target-field" style={{ width: '70px' }} title="Cible à atteindre (≥ pour réussir, 100 = réussite critique, 1 = échec critique). Vide = pas d'interprétation.">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          placeholder="Cible"
          value={diceTarget}
          onChange={(event) => onDiceTargetChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onRequestDiceRoll()
            }
          }}
          style={{ width: '100%', textTransform: 'none', fontWeight: 'normal' }}
        />
      </label>
      <label className="switch-field compact-field inline-switch md-switch-field dice-secret-toggle">
        <span className="md-switch-label">Discret</span>
        <span className="md-switch-control">
          <input
            className="md-switch-input"
            type="checkbox"
            checked={isSecretDiceRoll}
            onChange={(event) => onSecretDiceRollChange(event.target.checked)}
          />
          <span className="md-switch-track">
            <span className="md-switch-thumb" />
          </span>
        </span>
      </label>
      <div className="dice-preset-row">
        {[4, 6, 12, 100].map((sides) => (
          <button
            key={`dice-preset-${sides}`}
            type="button"
            className={selectedDiceCount === 1 && selectedDiceSides === sides ? 'secondary dice-chip active' : 'ghost dice-chip'}
            onClick={() => onSelectDicePreset(sides)}
          >
            1D{sides}
          </button>
        ))}
      </div>
      {playerCharacterData && onRollCharacteristic ? (
        <CharacteristicDiceDropdown
          characterData={playerCharacterData}
          config={characteristicConfig}
          onRollCharacteristic={(entry) => onRollCharacteristic(entry)}
        />
      ) : null}
      {gmCharacters && gmCharacters.length > 0 && onRollCharacteristic ? (
        <GMCharacterDiceDropdown
          characters={gmCharacters}
          config={characteristicConfig}
          onRollCharacteristic={(character, entry) => onRollCharacteristic(entry, character)}
        />
      ) : null}
      <div className="dice-toolbar-divider" />
      <label className="dice-custom-field">
        <input
          type="text"
          inputMode="text"
          pattern="^\\d+d\\d+(?:[+\\-]\\d+)?$"
          placeholder="XdX+X"
          value={customDiceFormula}
          onChange={(event) => onCustomDiceFormulaChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onCustomDiceFormulaBlur()
              onRequestDiceRoll()
            }
          }}
          onBlur={onCustomDiceFormulaBlur}
        />
      </label>
      <button type="button" className="secondary dice-action-button" onClick={() => onRequestDiceRoll()}>
        <span className="button-content">
          <Dices className="button-icon" strokeWidth={2.2} />
          <span>Lancer</span>
        </span>
      </button>
      <button
        type="button"
        className="ghost compact-icon-button dice-history-button"
        title="Afficher l historique des des"
        aria-label="Afficher l historique des des"
        onClick={onOpenDiceHistory}
      >
        <History className="button-icon" strokeWidth={2.2} />
      </button>
    </div>
  )
}