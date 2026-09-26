/**
 * Sons synthétiques pour les jets de dés critiques.
 * Utilise l'API Web Audio (pas de fichiers externes nécessaires).
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  // Resume si suspendu (politique autoplay du navigateur).
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

/**
 * Joue un son de réussite critique : deux notes ascendantes lumineuses.
 */
export function playCriticalSuccessSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1320, start: 0.08, dur: 0.18 },
  ]

  for (const note of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = note.freq
    gain.gain.setValueAtTime(0, now + note.start)
    gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + note.start)
    osc.stop(now + note.start + note.dur)
  }
}

/**
 * Joue un son d'échec critique : un buzz grave descendant.
 */
export function playCriticalFailureSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.4)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.5)
}