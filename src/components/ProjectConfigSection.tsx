// src/components/ProjectConfigSection.tsx
// Section "Configuration" affichée dans le dialog "Gestion du projet".
// Permet d'éditer les constantes globales du projet (ex: divisor d'impact des
// caractéristiques) sauvegardées dans `config.json` à la racine du workfolder.

import { useEffect, useMemo, useRef } from 'react'
import { Box, IconButton, Slider, TextField, Tooltip } from '@mui/material'
import { RotateCcw, Info } from 'lucide-react'
import type { ProjectConfig, ProjectConfigEntry } from '../lib/projectConfig'

export interface ProjectConfigSectionProps {
  config: ProjectConfig | null
  disabled?: boolean
  onChange: (next: ProjectConfig) => void
  onPersist: (next: ProjectConfig) => void
}

/** Parse un string en number, avec fallback. */
function parseNumberValue(raw: string, fallback: number): number {
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Calcule un aperçu de la valeur de Réussite (pour feedback visuel live). */
function previewStatSuccess(statCurrent: number, divisor: number, modifier: number): number {
  if (!Number.isFinite(divisor) || divisor <= 0) return 50
  const raw = 90 - Math.floor((statCurrent * 5) / divisor) + modifier
  return Math.max(5, Math.min(95, Math.round(raw)))
}

/**
 * Construit un aperçu textuel court pour une entrée de config, en fonction
 * de son id. Retourne `null` si pas d'aperçu spécifique.
 *
 * Les IDs reconnus :
 *   - `statSuccessDivisor` : "Endurance 10 → Réussite = X%"
 *   - `successModifierMin` / `successModifierMax` / `vitalsCriticalThresholdPercent`
 *     / `vitalsWeightHealth` / `vitalsWeightMental` : exemples à 100% / 50% / 0%.
 */
function buildConfigPreview(
  entry: ProjectConfigEntry,
  numericValue: number,
  allEntries: ProjectConfigEntry[],
): string | null {
  switch (entry.id) {
    case 'statSuccessDivisor':
      return `Endurance 10 → Réussite = ${previewStatSuccess(10, numericValue, 0)}%`;
    case 'successModifierMin': {
      const v = Math.round(numericValue);
      return v === 0 ? '0 (neutre à pleine forme)' : v < 0 ? `Avantage de ${Math.abs(v)} à 100% PV/Sanité` : `Malus de ${v} à 100% PV/Sanité`;
    }
    case 'successModifierMax': {
      const v = Math.round(numericValue);
      return v === 0 ? '0 (neutre même à terre)' : v > 0 ? `Malus de ${v} à 0% PV/Sanité / palier critique` : `Avantage de ${Math.abs(v)} à 0% PV/Sanité`;
    }
    case 'vitalsCriticalThresholdPercent': {
      const v = Math.round(numericValue);
      return v === 0 ? 'Désactivé (interpolation linéaire toujours)' : `Si Santé OU Mental < ${v}%, mod forcé au max`;
    }
    case 'vitalsWeightHealth':
    case 'vitalsWeightMental': {
      const wH = parseNumberValue(
        allEntries.find((e) => e.id === 'vitalsWeightHealth')?.value ?? '1',
        1,
      );
      const wM = parseNumberValue(
        allEntries.find((e) => e.id === 'vitalsWeightMental')?.value ?? '1',
        1,
      );
      const total = wH + wM;
      if (total <= 0) return 'Ratio : 50/50 (fallback, poids totaux = 0)';
      const pctH = Math.round((wH / total) * 100);
      return `Ratio effectif : ${pctH}% Santé / ${100 - pctH}% Mental`;
    }
    default:
      return null;
  }
}

export function ProjectConfigSection({
  config,
  disabled = false,
  onChange,
  onPersist,
}: ProjectConfigSectionProps) {
  // Debounce la persistance sur disque (300ms) pour éviter d'écrire le fichier
  // à chaque frappe. La persistance est asynchrone et fail-soft côté parent.
  const persistTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
      }
    }
  }, [])

  function schedulePersist(next: ProjectConfig) {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null
      onPersist(next)
    }, 300)
  }

  function updateEntry(entryId: string, patch: Partial<ProjectConfigEntry>) {
    if (!config) return
    const next: ProjectConfig = {
      ...config,
      entries: config.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    }
    onChange(next)
    schedulePersist(next)
  }

  function resetEntry(entryId: string) {
    const entry = config?.entries.find((e) => e.id === entryId)
    if (!entry) return
    updateEntry(entryId, { value: entry.defaultValue })
  }

  if (!config) {
    return (
      <div style={{ padding: '8px 0', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem' }}>
        Aucune configuration chargée. Sélectionne un dossier de travail pour activer la configuration.
      </div>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {config.entries.map((entry) => (
        <ConfigEntryRow
          key={entry.id}
          entry={entry}
          allEntries={config.entries}
          disabled={disabled}
          onChange={(patch) => updateEntry(entry.id, patch)}
          onReset={() => resetEntry(entry.id)}
        />
      ))}
    </Box>
  )
}

interface ConfigEntryRowProps {
  entry: ProjectConfigEntry
  allEntries: ProjectConfigEntry[]
  disabled: boolean
  onChange: (patch: Partial<ProjectConfigEntry>) => void
  onReset: () => void
}

function ConfigEntryRow({ entry, allEntries, disabled, onChange, onReset }: ConfigEntryRowProps) {
  const numericValue = useMemo(
    () => parseNumberValue(entry.value, parseNumberValue(entry.defaultValue, 0)),
    [entry.value, entry.defaultValue],
  )
  const isText = entry.type === 'text'
  const defaultValue = isText ? entry.defaultValue : String(parseNumberValue(entry.defaultValue, 0))
  const isModified = entry.value !== entry.defaultValue
  const min = entry.min ?? 0
  const max = entry.max ?? 100
  const step = entry.step ?? 1

  // Aperçu spécifique (selon l'id de l'entrée) — pour feedback visuel live.
  // Pour les entrées de type 'text', on saute le calcul d'aperçu (le
  // `previewText` numérique ne s'applique pas). On affichera un aperçu
  // textuel à la place (cf. bloc "Colonne 3" plus bas).
  const previewText = isText ? null : buildConfigPreview(entry, numericValue, allEntries)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr) auto',
        columnGap: 2,
        rowGap: 0.5,
        alignItems: 'center',
        padding: '10px 12px',
        background: 'var(--md-sys-color-surface-container-low)',
        borderRadius: '10px',
        border: '1px solid var(--md-sys-color-outline-variant)',
      }}
    >
      {/* Colonne 1 : Label + description */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            {entry.label}
          </span>
          {entry.description ? (
            <Tooltip title={entry.description} placement="top" arrow>
              <Info size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            </Tooltip>
          ) : null}
        </Box>
        <span style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
          {/* Pour les entrées text, on affiche la valeur par défaut telle quelle
              (sans transformation numérique). Pour les nombres, on conserve
              l'ancien format `Défaut : X unit`. */}
          Défaut : {isText ? defaultValue : `${defaultValue}${entry.unit ? ` ${entry.unit}` : ''}`}
        </span>
      </Box>

      {/* Colonne 2 : Input (text ou number) + slider (number uniquement) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <TextField
          size="small"
          type={isText ? 'text' : 'number'}
          value={entry.value}
          disabled={disabled}
          onChange={(event) => {
            // Pour les entrées textuelles, on applique une limite de longueur
            // de sécurité (8 caractères, cf. description de `moneySuffix`).
            // On évite ainsi qu'un MJ colle un texte de 10k caractères dans
            // un champ censé afficher un suffixe court.
            const raw = event.target.value
            const next = isText ? raw.slice(0, 8) : raw
            onChange({ value: next })
          }}
          slotProps={{
            htmlInput: isText
              ? { maxLength: 8, 'aria-label': entry.label }
              : { min, max, step, 'aria-label': entry.label },
          }}
          sx={{
            width: isText ? '160px' : '110px',
            '& .MuiOutlinedInput-root': {
              background: 'var(--md-sys-color-surface)',
              borderRadius: '8px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            },
          }}
        />
        {!isText ? (
          <Slider
            size="small"
            value={numericValue}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(_e, value) => {
              if (typeof value === 'number') {
                // Garde la précision du step (0.1) pour les valeurs décimales
                onChange({ value: String(value) })
              }
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}${entry.unit ? ` ${entry.unit}` : ''}`}
            sx={{ flex: '1 1 0', minWidth: 0, color: 'var(--md-sys-color-primary)' }}
          />
        ) : null}
      </Box>

      {/* Colonne 3 : Bouton reset + aperçu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {isText ? (
          // Pour les entrées textuelles, l'aperçu montre la valeur courante
          // (qui deviendra l'unité affichée à côté de l'argent dans la
          // fiche personnage). Cela permet au MJ de visualiser en temps
          // réel l'effet de sa saisie.
          <Box
            data-testid={`config-preview-${entry.id}`}
            sx={{
              fontSize: '0.7rem',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              color: 'var(--md-sys-color-on-tertiary-container)',
              background: 'var(--md-sys-color-tertiary-container)',
              padding: '2px 8px',
              borderRadius: '100px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            = {entry.value || <em style={{ opacity: 0.6 }}>(vide)</em>}
          </Box>
        ) : previewText ? (
          <Tooltip
            title={previewText}
            placement="top"
            arrow
          >
            <Box
              data-testid={`config-preview-${entry.id}`}
              sx={{
                fontSize: '0.7rem',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: 'var(--md-sys-color-on-tertiary-container)',
                background: 'var(--md-sys-color-tertiary-container)',
                padding: '2px 8px',
                borderRadius: '100px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.id === 'statSuccessDivisor' ? `= ${previewStatSuccess(10, numericValue, 0)}%` : (numericValue > 0 && entry.id !== 'vitalsCriticalThresholdPercent' && entry.id !== 'vitalsWeightMental' ? `≈ ${Math.round(numericValue * 100) / 100}` : `= ${Math.round(numericValue)}`)}
            </Box>
          </Tooltip>
        ) : null}
        <Tooltip title={isModified ? 'Réinitialiser à la valeur par défaut' : 'Valeur par défaut'}>
          <span>
            <IconButton
              size="small"
              onClick={onReset}
              disabled={disabled || !isModified}
              sx={{
                color: isModified ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                opacity: isModified ? 1 : 0.4,
              }}
              aria-label="Réinitialiser à la valeur par défaut"
            >
              <RotateCcw size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}
