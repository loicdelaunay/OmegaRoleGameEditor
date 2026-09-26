export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getMapPoint(
  element: HTMLDivElement | null,
  width: number,
  height: number,
  clientX: number,
  clientY: number,
  clampToBounds = true,
) {
  if (!element) {
    return { x: 0, y: 0 }
  }

  const rect = element.getBoundingClientRect()
  const rawX = ((clientX - rect.left) / rect.width) * width
  const rawY = ((clientY - rect.top) / rect.height) * height

  return {
    x: clampToBounds ? clamp(rawX, 0, width) : rawX,
    y: clampToBounds ? clamp(rawY, 0, height) : rawY,
  }
}

export function buildFlashlightConePath(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  distance: number,
  angleDegrees: number,
) {
  const dx = targetX - originX
  const dy = targetY - originY
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length < 1) {
    return ''
  }

  const angleRad = angleDegrees * (Math.PI / 180)
  const baseAngle = Math.atan2(dy, dx)
  const leftAngle = baseAngle - angleRad / 2
  const rightAngle = baseAngle + angleRad / 2

  const leftX = originX + Math.cos(leftAngle) * distance
  const leftY = originY + Math.sin(leftAngle) * distance
  const rightX = originX + Math.cos(rightAngle) * distance
  const rightY = originY + Math.sin(rightAngle) * distance

  const largeArcFlag = angleDegrees > 180 ? 1 : 0

  return `M ${originX} ${originY} L ${leftX} ${leftY} A ${distance} ${distance} 0 ${largeArcFlag} 1 ${rightX} ${rightY} Z`
}
