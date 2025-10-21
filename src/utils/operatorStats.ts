import { CopilotDocV1 } from '../models/copilot.schema'

export type OperatorStats = {
  starLevel: number
  attack: number
  hp: number
  hasStar: boolean
  hasAttack: boolean
  hasHp: boolean
}

export const readOperatorStats = (op: CopilotDocV1.Operator): OperatorStats => {
  const extensions = (op as any).extensions as
    | {
        stats?: {
          starLevel?: number
          attack?: number
          hp?: number
        }
      }
    | undefined

  const starRaw = extensions?.stats?.starLevel ?? (op as any).starLevel
  const attackRaw = extensions?.stats?.attack ?? (op as any).attack
  const hpRaw = extensions?.stats?.hp ?? (op as any).hp

  const hasStar = starRaw !== undefined
  const hasAttack = attackRaw !== undefined
  const hasHp = hpRaw !== undefined

  return {
    starLevel: Number(starRaw) || 0,
    attack: Number(attackRaw) || 0,
    hp: Number(hpRaw) || 0,
    hasStar,
    hasAttack,
    hasHp,
  }
}
