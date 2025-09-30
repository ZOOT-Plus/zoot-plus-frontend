export const DEFAULT_SIMING_ATTACK_DELAY = 3000
export const DEFAULT_SIMING_ULTIMATE_DELAY = 5000
export const DEFAULT_SIMING_DEFENSE_DELAY = 3000

export interface SimingActionDelays {
  attack: number
  ultimate: number
  defense: number
}

export const DEFAULT_SIMING_ACTION_DELAYS: SimingActionDelays = {
  attack: DEFAULT_SIMING_ATTACK_DELAY,
  ultimate: DEFAULT_SIMING_ULTIMATE_DELAY,
  defense: DEFAULT_SIMING_DEFENSE_DELAY,
}
