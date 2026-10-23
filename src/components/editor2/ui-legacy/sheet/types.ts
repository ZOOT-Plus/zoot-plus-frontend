import { CopilotDocV1 } from '../../../../models/copilot.schema'

export type Operator = CopilotDocV1.Operator & { id?: string }
export type Group = Omit<CopilotDocV1.Group, 'opers'> & { id?: string; opers?: Operator[] }
