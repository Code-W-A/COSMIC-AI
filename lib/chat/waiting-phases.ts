// Fixed time thresholds — each phase appears once and stays stable until the next.
// Avoids cycling or rapid text changes that feel chaotic or falsely imply progress.
export const WAITING_PHASE_THRESHOLDS = [0, 1500, 4000, 8000, 15000] as const
export const WAITING_STOP_BUTTON_MS = 15000

export type WaitingPhaseIndex = 0 | 1 | 2 | 3 | 4

export function getWaitingPhaseIndex(elapsedMs: number): WaitingPhaseIndex {
  if (elapsedMs >= WAITING_PHASE_THRESHOLDS[4]) return 4
  if (elapsedMs >= WAITING_PHASE_THRESHOLDS[3]) return 3
  if (elapsedMs >= WAITING_PHASE_THRESHOLDS[2]) return 2
  if (elapsedMs >= WAITING_PHASE_THRESHOLDS[1]) return 1
  return 0
}

export function getWaitingPhaseMessageKey(
  phase: WaitingPhaseIndex,
  hasAstralProfile: boolean
): string {
  switch (phase) {
    case 0:
      return "chat.waiting.phase1"
    case 1:
      return hasAstralProfile ? "chat.waiting.phase2.profile" : "chat.waiting.phase2.neutral"
    case 2:
      return "chat.waiting.phase3"
    case 3:
      return "chat.waiting.phase4"
    case 4:
      return "chat.waiting.phase5"
  }
}
