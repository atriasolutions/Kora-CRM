let audioContext: AudioContext | null = null
let unlockListenerAttached = false

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  audioContext ??= new Ctor()
  return audioContext
}

/** Los navegadores bloquean audio hasta la primera interacción del usuario. */
export function unlockActivityReminderAudio(): void {
  if (typeof window === 'undefined' || unlockListenerAttached) return
  unlockListenerAttached = true

  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') {
      void ctx.resume()
    }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }

  window.addEventListener('pointerdown', unlock, { once: true, passive: true })
  window.addEventListener('keydown', unlock, { once: true, passive: true })
}

/** Campanilla breve al activarse un recordatorio de actividad. */
export function playActivityReminderSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => playActivityReminderSound())
    return
  }

  const start = ctx.currentTime
  const tones: { freq: number; at: number }[] = [
    { freq: 523.25, at: 0 },
    { freq: 659.25, at: 0.14 },
    { freq: 783.99, at: 0.28 },
  ]

  for (const { freq, at } of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t0 = start + at
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.34)
  }
}
