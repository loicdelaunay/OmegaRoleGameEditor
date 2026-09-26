import { BufferedNumberField } from '../../BufferedNumberField'
import { InspectorSection } from '../../InspectorSection'
import { getOrCreateTokenAssignment } from '../../../lib/tokens'
import { migrateCharacterDocument } from '../../../lib/character'
import {
  DEFAULT_LOCKED_VIEW_SIZE,
  DEFAULT_FLASHLIGHT_DISTANCE,
  DEFAULT_FLASHLIGHT_OPACITY,
  FLASHLIGHT_CONE_ANGLE_DEGREES,
} from '../../../lib/constants'
import type { PlayerViewMode, TokenAssignment } from '../../../types/terrain'
import type { AssignablePlayerOption } from '../../../types/room'
import type { WorkfolderFile } from '../../FicheDropdown'

export type AssignablePlayerWithTransfer = AssignablePlayerOption & {
  isTransfer: boolean
}

export type InspectorTokenSectionProps = {
  tokenId: string
  currentAssignment: TokenAssignment | null
  assignablePlayers: AssignablePlayerWithTransfer[]
  isPlayerPreallocationEnabled: boolean
  workfolderHandle: any
  workfolderCharacterFiles: WorkfolderFile[]
  onUpdateAssignment: (
    tokenId: string,
    updater: (current: TokenAssignment | null) => TokenAssignment | null,
  ) => void
  onStatusMessage: (message: string) => void
  clamp: (value: number, min: number, max: number) => number
}

export function InspectorTokenSection({
  tokenId,
  currentAssignment,
  assignablePlayers,
  isPlayerPreallocationEnabled,
  workfolderHandle,
  workfolderCharacterFiles,
  onUpdateAssignment,
  onStatusMessage,
  clamp,
}: InspectorTokenSectionProps) {
  const mode = currentAssignment?.mode ?? 'free'
  const lockVisibleArea = currentAssignment?.lockVisibleArea === true

  return (
    <InspectorSection title="Assignation Joueur" tone="token" className="token-assignment-field surface-tonal">
      <span className="field-label">Bind joueur sur ce pion</span>
      <span className="helper">Un joueur ne peut etre assigne qu a un seul pion a la fois.</span>
      <select
        value={currentAssignment?.playerId ?? ''}
        onChange={(event) => {
          const nextPlayerId = event.target.value
          onUpdateAssignment(tokenId, (current) => ({
            ...getOrCreateTokenAssignment(current),
            playerId: nextPlayerId,
          }))
        }}
      >
        <option value="">Aucun joueur</option>
        {assignablePlayers.map((player) => (
          <option key={player.id} value={player.id}>
            {player.isTransfer ? 'Transfert ' : ''}{player.name}
            {isPlayerPreallocationEnabled && !player.connectedPlayerId ? ' (hors ligne)' : ''}
          </option>
        ))}
      </select>
      <span className="field-label" style={{ marginTop: '12px' }}>Fiche de personnage liée</span>
      <span className="helper">Associer une fiche de personnage à ce pion.</span>
      <select
        value={currentAssignment?.characterFileName ?? ''}
        onChange={async (event) => {
          const fileName = event.target.value
          if (!fileName) {
            onUpdateAssignment(tokenId, (current) => {
              const next = getOrCreateTokenAssignment(current)
              delete next.characterFileName
              delete next.characterData
              return next
            })
            return
          }
          if (!workfolderHandle) return
          try {
            const fileHandle = await workfolderHandle.getFileHandle(fileName)
            const file = await fileHandle.getFile()
            const text = await file.text()
            const parsed = migrateCharacterDocument(JSON.parse(text))
            onUpdateAssignment(tokenId, (current) => ({
              ...getOrCreateTokenAssignment(current),
              characterFileName: fileName,
              characterData: parsed,
            }))
          } catch (e) {
            console.error('Failed to bind character', e)
            onStatusMessage('Erreur lors du chargement de la fiche de personnage.')
          }
        }}
      >
        <option value="">Aucune fiche</option>
        {workfolderCharacterFiles.map((file) => (
          <option key={file.fileName} value={file.fileName}>{file.name}</option>
        ))}
      </select>
      <label>
        Mode de vue
        <select
          value={mode}
          onChange={(event) =>
            onUpdateAssignment(tokenId, (current) => ({
              ...getOrCreateTokenAssignment(current),
              mode: event.target.value as PlayerViewMode,
            }))
          }
        >
          <option value="free">Libre</option>
          <option value="follow-host">Force suivis MJ</option>
          <option value="locked-token">Fige sur pion</option>
          <option value="follow-turn">Suivre par tour</option>
        </select>
      </label>
      {mode === 'follow-host' ? (
        <label className="switch-field compact-field inline-switch md-switch-field">
          <span className="md-switch-label">Activer aussi la zone visible verrouillee</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={lockVisibleArea}
              onChange={(event) =>
                onUpdateAssignment(tokenId, (current) => ({
                  ...getOrCreateTokenAssignment(current),
                  lockVisibleArea: event.target.checked,
                }))
              }
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
      ) : null}
      <label>
        Zone visible verrouillee
        <BufferedNumberField
          min={160}
          max={4000}
          step={20}
          value={currentAssignment?.lockedViewSize ?? DEFAULT_LOCKED_VIEW_SIZE}
          disabled={mode !== 'locked-token' && !(mode === 'follow-host' && lockVisibleArea)}
          onChange={(nextValue) =>
            onUpdateAssignment(tokenId, (current) => ({
              ...getOrCreateTokenAssignment(current),
              lockedViewSize: clamp(nextValue || DEFAULT_LOCKED_VIEW_SIZE, 160, 4000),
            }))
          }
        />
        <span className="helper">Taille du carre visible autour du pion ou du suivi MJ, par defaut 1000 x 1000.</span>
      </label>
      <div className="field-stack">
        <span className="field-label">Mode Nuit</span>
        <label className="switch-field compact-field inline-switch md-switch-field">
          <span className="md-switch-label">Activer le layer nuit (obscurite)</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={currentAssignment?.nightModeEnabled === true}
              onChange={(event) =>
                onUpdateAssignment(tokenId, (current) => ({
                  ...getOrCreateTokenAssignment(current),
                  nightModeEnabled: event.target.checked,
                }))
              }
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
        <span className="helper">Assombrit la vue du joueur. La lampe de poche perce l obscurite.</span>
      </div>
      <div className="field-stack">
        <span className="field-label">Lampe de poche</span>
        <label className="switch-field compact-field inline-switch md-switch-field">
          <span className="md-switch-label">Activer la lampe de poche</span>
          <span className="md-switch-control">
            <input
              className="md-switch-input"
              type="checkbox"
              checked={currentAssignment?.flashlightEnabled === true}
              onChange={(event) =>
                onUpdateAssignment(tokenId, (current) => ({
                  ...getOrCreateTokenAssignment(current),
                  flashlightEnabled: event.target.checked,
                }))
              }
            />
            <span className="md-switch-track">
              <span className="md-switch-thumb" />
            </span>
          </span>
        </label>
        <label>
          Distance du cone
          <BufferedNumberField
            min={80}
            max={4000}
            step={20}
            value={currentAssignment?.flashlightDistance ?? DEFAULT_FLASHLIGHT_DISTANCE}
            onChange={(nextValue) =>
              onUpdateAssignment(tokenId, (current) => ({
                ...getOrCreateTokenAssignment(current),
                flashlightDistance: clamp(nextValue || DEFAULT_FLASHLIGHT_DISTANCE, 80, 4000),
              }))
            }
          />
        </label>
        <label>
          Opacite de l ombre
          <BufferedNumberField
            min={0}
            max={100}
            step={5}
            fractionDigits={0}
            value={Math.round((currentAssignment?.flashlightOpacity ?? DEFAULT_FLASHLIGHT_OPACITY) * 100)}
            onChange={(nextValue) =>
              onUpdateAssignment(tokenId, (current) => ({
                ...getOrCreateTokenAssignment(current),
                flashlightOpacity: clamp((nextValue || 0) / 100, 0, 1),
              }))
            }
          />
        </label>
        <label>
          Angle de vision
          <BufferedNumberField
            min={10}
            max={180}
            step={1}
            fractionDigits={0}
            value={currentAssignment?.flashlightAngle ?? FLASHLIGHT_CONE_ANGLE_DEGREES}
            onChange={(nextValue) =>
              onUpdateAssignment(tokenId, (current) => ({
                ...getOrCreateTokenAssignment(current),
                flashlightAngle: clamp(nextValue || FLASHLIGHT_CONE_ANGLE_DEGREES, 10, 180),
              }))
            }
          />
        </label>
        <span className="helper">En mode Fige sur pion, le joueur verra noir sauf dans un cone oriente vers sa souris.</span>
      </div>
    </InspectorSection>
  )
}
