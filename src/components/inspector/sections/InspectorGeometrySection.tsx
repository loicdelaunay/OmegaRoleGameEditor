import type { CSSProperties } from 'react'
import { BufferedNumberField } from '../../BufferedNumberField'
import { InspectorSection } from '../../InspectorSection'

export type InspectorGeometrySectionProps = {
  kind: string
  x: number
  y: number
  width: number
  height: number
  scale: number
  rotation: number
  opacity: number
  onPositionXChange: (value: number) => void
  onPositionYChange: (value: number) => void
  onWidthChange: (value: number) => void
  onHeightChange: (value: number) => void
  onScaleChange: (value: number) => void
  onRotationChange: (value: number) => void
  onOpacityChange: (value: number) => void
  onRotateStep: (delta: number) => void
  normalizedRotation: number
  clamp: (value: number, min: number, max: number) => number
}

export function InspectorGeometrySection({
  kind,
  x,
  y,
  width,
  height,
  scale,
  rotation,
  opacity,
  onPositionXChange,
  onPositionYChange,
  onWidthChange,
  onHeightChange,
  onScaleChange,
  onRotationChange,
  onOpacityChange,
  onRotateStep,
  normalizedRotation,
  clamp,
}: InspectorGeometrySectionProps) {
  return (
    <InspectorSection title="Géométrie" tone="geometry" className="surface-tonal">
      <span className="field-label">Transform</span>
      <div className="inline-grid">
        <label>
          Local X
          <BufferedNumberField
            step={0.1}
            fractionDigits={1}
            value={x}
            onChange={(nextValue) => onPositionXChange(nextValue || 0)}
          />
        </label>
        <label>
          Local Y
          <BufferedNumberField
            step={0.1}
            fractionDigits={1}
            value={y}
            onChange={(nextValue) => onPositionYChange(nextValue || 0)}
          />
        </label>
      </div>
      <div className="inline-grid">
        <label>
          Largeur
          <BufferedNumberField
            min={16}
            step={0.1}
            fractionDigits={1}
            value={width}
            onChange={(nextValue) => onWidthChange(Math.max(16, nextValue || 16))}
          />
        </label>
        <label>
          Hauteur
          <BufferedNumberField
            min={16}
            step={0.1}
            fractionDigits={1}
            value={height}
            onChange={(nextValue) => onHeightChange(Math.max(16, nextValue || 16))}
          />
        </label>
      </div>
      {kind !== 'audio' ? (
        <>
          <div className="inline-grid">
            <label>
              Scale local
              <BufferedNumberField
                min={0.05}
                max={64}
                step={0.1}
                fractionDigits={1}
                value={scale}
                onChange={(nextValue) => onScaleChange(clamp(nextValue || 1, 0.05, 64))}
              />
            </label>
            <label>
              Rotation
              <BufferedNumberField
                step={0.1}
                fractionDigits={1}
                value={rotation}
                onChange={(nextValue) => onRotationChange(nextValue || 0)}
              />
            </label>
          </div>
          <div className="rotation-stepper surface-tonal">
            <button type="button" className="ghost compact-icon-button" onClick={() => onRotateStep(-45)}>
              -
            </button>
            <span className="rotation-stepper-value">{normalizedRotation.toFixed(1)}°</span>
            <button type="button" className="ghost compact-icon-button" onClick={() => onRotateStep(45)}>
              +
            </button>
          </div>
        </>
      ) : null}
      <div className="inline-grid">
        <label>
          Opacite
          <div className="range-field">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(opacity * 100)}
              style={{ '--range-value': `${Math.round(opacity * 100)}%` } as CSSProperties}
              onChange={(event) => onOpacityChange(clamp((Number(event.target.value) || 0) / 100, 0, 1))}
            />
            <span className="range-value-pill">{Math.round(opacity * 100)}%</span>
          </div>
        </label>
      </div>
    </InspectorSection>
  )
}
