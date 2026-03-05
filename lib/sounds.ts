const STORAGE_KEY = "chatapp_sound_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === "true"; // default on
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

function playTone(freq: number, duration: number, volume = 0.08, delay = 0): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
    osc.onended = () => ctx.close();
  } catch {
    // Ignore audio errors (user hasn't interacted yet, etc.)
  }
}

/** Short pop — new chat message from another user */
export function playMessageSound(): void {
  if (!isSoundEnabled()) return;
  playTone(880, 0.1, 0.07);
}

/** Two-tone chime — new @mention notification */
export function playNotificationSound(): void {
  if (!isSoundEnabled()) return;
  playTone(660, 0.12, 0.09, 0);
  playTone(880, 0.14, 0.09, 0.13);
}
