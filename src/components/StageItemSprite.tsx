import { memo } from 'react'
import type { MouseEventHandler, PointerEventHandler } from 'react'
import { buildGeneratedAssetDataUrl } from '../lib/terrain'
import type { TerrainItem } from '../types/terrain'
import iconAudioUrl from '../assets/icon-audio.png'
import { StickyNote } from 'lucide-react'

type StageItemTransform = {
  x: number
  y: number
  scale: number
  rotation: number
}

type StageItemSpriteProps = {
  item: TerrainItem
  resolved: StageItemTransform
  outline?: string
  onPointerDown?: PointerEventHandler<HTMLElement>
  onPointerEnter?: PointerEventHandler<HTMLElement>
  onPointerMove?: PointerEventHandler<HTMLElement>
  onPointerLeave?: PointerEventHandler<HTMLElement>
  onClick?: MouseEventHandler<HTMLElement>
}

function buildStageItemTransform(flipX: boolean, flipY: boolean, rotation: number) {
  const scaleX = flipX ? -1 : 1
  const scaleY = flipY ? -1 : 1

  return `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`
}

function buildItemOutlineShadow(enabled: boolean, width: number, color: string) {
  const thickness = Math.max(0, Math.min(24, Math.round(width)))
  if (!enabled || thickness === 0) {
    return 'none'
  }

  return `0 0 0 ${thickness}px ${color}`
}

function buildVisualEffectsFilter(item: TerrainItem) {
  const filters: string[] = []

  if (item.grayscaleEnabled) {
    filters.push('grayscale(1)')
  }

  if (item.effects) {
    for (const effect of item.effects) {
      if (effect.type === 'blur') filters.push(`blur(${effect.intensity}px)`)
      else if (effect.type === 'sepia') filters.push(`sepia(${effect.intensity}%)`)
      else if (effect.type === 'grayscale') filters.push(`grayscale(${effect.intensity}%)`)
      else if (effect.type === 'invert') filters.push(`invert(${effect.intensity}%)`)
      else if (effect.type === 'brightness') filters.push(`brightness(${effect.intensity}%)`)
      else if (effect.type === 'contrast') filters.push(`contrast(${effect.intensity}%)`)
      else if (effect.type === 'hue-rotate') filters.push(`hue-rotate(${effect.intensity}deg)`)
      else if (effect.type === 'drop-shadow') filters.push(`drop-shadow(${effect.offsetX}px ${effect.offsetY}px ${effect.blurRadius}px ${effect.color})`)
      else if (effect.type === 'glow') filters.push(`drop-shadow(0px 0px ${effect.intensity}px ${effect.color})`)
    }
  }

  return filters.length > 0 ? filters.join(' ') : 'none'
}

export const StageItemSprite = memo(function StageItemSprite({
  item,
  resolved,
  outline = 'none',
  onPointerDown,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onClick,
}: StageItemSpriteProps) {
  const src = item.generatedAsset ? buildGeneratedAssetDataUrl(item.generatedAsset) : item.src
  const boxShadow = buildItemOutlineShadow(item.outlineEnabled, item.outlineWidth, item.outlineColor)
  const filter = buildVisualEffectsFilter(item)

  const animClasses = []
  let animIntensity = 10
  if (item.rippleEnabled) animClasses.push('anim-ripple')
  if (item.effects) {
    for (const effect of item.effects) {
      if (
        effect.type === 'anim-ripple' ||
        effect.type === 'anim-fire' ||
        effect.type === 'anim-glitch' ||
        effect.type === 'anim-pulse' ||
        effect.type === 'anim-float' ||
        effect.type === 'anim-spin'
      ) {
        animClasses.push(effect.type)
        animIntensity = (effect as any).intensity || 10
      }
    }
  }

  const className = [
    item.kind === 'token' ? 'stage-item token' : 'stage-item',
    item.rippleEnabled && !animClasses.includes('anim-ripple') ? 'ripple-effect' : '',
    ...animClasses
  ]
    .filter(Boolean)
    .join(' ')

  const customStyles = {
    '--inline-filter': filter !== 'none' ? filter : 'none',
    '--anim-intensity': animIntensity,
    filter: filter !== 'none' ? filter : undefined,
  } as React.CSSProperties

  if (item.kind === 'note') {
    return (
      <div
        className={className + " note-sprite"}
        data-item-id={item.id}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        style={{
          ...customStyles,
          position: 'absolute',
          left: `${resolved.x}px`,
          top: `${resolved.y}px`,
          width: `${item.width * resolved.scale}px`,
          height: `${item.height * resolved.scale}px`,
          transform: buildStageItemTransform(item.flipX, item.flipY, resolved.rotation),
          opacity: item.opacity,
          boxShadow,
          outline,
          pointerEvents: 'auto',
          backgroundColor: item.noteColor ?? '#fef08a',
          border: item.noteColor ? '1px solid rgba(0,0,0,0.2)' : '1px solid #eab308',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: item.noteColor ? 'var(--md-sys-color-on-surface)' : '#92400e',
          fontSize: `calc(${12 * resolved.scale}px * var(--inverse-zoom, 1))`,
          padding: '4px',
          boxSizing: 'border-box',
          overflow: 'visible',
          cursor: 'pointer'
        }}
        onPointerDown={onPointerDown as any}
        onPointerEnter={onPointerEnter as any}
        onPointerMove={onPointerMove as any}
        onPointerLeave={onPointerLeave as any}
        onClick={onClick as any}
      >
        <StickyNote size={24 * resolved.scale} strokeWidth={2} style={{ opacity: 0.8, marginBottom: '2px', flexShrink: 0 }} />
        <span style={{
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'center',
          fontWeight: 600,
          flexShrink: 1,
          display: '-webkit-box',
          WebkitLineClamp: 6,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word'
        }}>
          {item.name || 'Note'}
        </span>
      </div>
    )
  }

  if (item.kind === 'audio') {
    return (
      <img
        src={iconAudioUrl}
        alt="Audio Gizmo"
        className={className + " audio-sprite"}
        data-item-id={item.id}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        style={{
          ...customStyles,
          position: 'absolute',
          left: `${resolved.x}px`,
          top: `${resolved.y}px`,
          width: `${item.width * resolved.scale}px`,
          height: `${item.height * resolved.scale}px`,
          transform: buildStageItemTransform(item.flipX, item.flipY, resolved.rotation),
          opacity: item.opacity,
          boxShadow,
          outline,
          pointerEvents: 'auto',
          objectFit: 'contain'
        }}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      />
    )
  }

  return (
    <img
      src={src || undefined}
      className={className}
      data-item-id={item.id}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      style={{
        ...customStyles,
        position: 'absolute',
        left: `${resolved.x}px`,
        top: `${resolved.y}px`,
        width: `${item.width * resolved.scale}px`,
        height: `${item.height * resolved.scale}px`,
        transform: buildStageItemTransform(item.flipX, item.flipY, resolved.rotation),
        opacity: item.opacity,
        boxShadow,
        outline,
        pointerEvents: 'auto',
        objectFit: 'fill'
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    />
  )
}, (prev, next) => {
  // Comparateur custom : compare item par référence, resolved par valeur, outline par valeur.
  // Les handlers sont des closures recréées par item à chaque render du parent mais leur
  // comportement est équivalent (mêmes closures capturant le même item via la map),
  // on les ignore donc pour éviter des re-renders inutiles pendant le drag.
  return (
    prev.item === next.item &&
    prev.resolved.x === next.resolved.x &&
    prev.resolved.y === next.resolved.y &&
    prev.resolved.scale === next.resolved.scale &&
    prev.resolved.rotation === next.resolved.rotation &&
    prev.outline === next.outline
  )
})