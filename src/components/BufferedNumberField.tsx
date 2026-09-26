import { useEffect, useState, type CSSProperties } from 'react'

type BufferedNumberFieldProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  fractionDigits?: number
  className?: string
  style?: CSSProperties
  title?: string
  /**
   * `id` HTML appliqué à l'`<input>` interne. Utile pour brancher un
   * `<label htmlFor="...">` extérieur (cf. card "Argent" de la fiche
   * personnage). Si absent, l'input reste anonyme.
   */
  id?: string
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToFractionDigits(value: number, fractionDigits?: number) {
  if (fractionDigits === undefined) {
    return value
  }

  const multiplier = 10 ** fractionDigits
  return Math.round(value * multiplier) / multiplier
}

function formatDraftValue(value: number, fractionDigits?: number) {
  const roundedValue = roundToFractionDigits(value, fractionDigits)
  return fractionDigits === undefined ? String(roundedValue) : roundedValue.toFixed(fractionDigits)
}

export function BufferedNumberField({
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  fractionDigits,
  className,
  style,
  title,
  id,
}: BufferedNumberFieldProps) {
  const [draft, setDraft] = useState(() => formatDraftValue(value, fractionDigits))

  useEffect(() => {
    setDraft(formatDraftValue(value, fractionDigits))
  }, [fractionDigits, value])

  const commitValue = () => {
    if (disabled) {
      return
    }

    const parsed = Number(draft.replace(',', '.'))
    if (!Number.isFinite(parsed)) {
      setDraft(formatDraftValue(value, fractionDigits))
      return
    }

    const clampedValue = clampValue(parsed, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY)
    const roundedValue = roundToFractionDigits(clampedValue, fractionDigits)
    onChange(roundedValue)
    setDraft(formatDraftValue(roundedValue, fractionDigits))
  }

  return (
    <span className={className ? `number-apply-field ${className}` : 'number-apply-field'} style={style}>
      <input
        type="text"
        id={id}
        inputMode={fractionDigits === undefined || fractionDigits === 0 ? 'numeric' : 'decimal'}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') {
            return
          }

          event.preventDefault()
          commitValue()
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        data-step={step}
        title={title}
      />
    </span>
  )
}
