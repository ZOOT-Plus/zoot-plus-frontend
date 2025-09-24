import { CopilotDocV1 } from '../../models/copilot.schema'
import { PartialDeep } from '../../utils/partial-deep'
import { SetRequired, Simplify } from 'type-fest'

export type WithId<T = {}> = T extends never ? never : T & { id: string }

export type WithPartialCoordinates<T> = T extends {
  location?: [number, number]
}
  ? Omit<T, 'location'> & {
      location?: [number | undefined, number | undefined]
    }
  : T extends {
        distance?: [number, number]
      }
    ? Omit<T, 'distance'> & {
        distance?: [number | undefined, number | undefined]
      }
    : T

export type EditorOperationBase = Simplify<
  Omit<
    PartialDeep<CopilotDocV1.Operation>,
    'doc' | 'opers' | 'groups' | 'actions'
  > & {
    minimumRequired: string
    doc: PartialDeep<CopilotDocV1.Doc>
  }
>

export type EditorOperator = Simplify<
  WithId<SetRequired<PartialDeep<CopilotDocV1.Operator>, 'name'>>
>
export type EditorGroup = Simplify<
  WithId<
    PartialDeep<Omit<CopilotDocV1.Group, 'opers'>> & {
      name: string
      opers: EditorOperator[]
    }
  >
>

type GenerateEditorAction<T extends CopilotDocV1.Action> = T extends never
  ? never
  : Simplify<
      WithPartialCoordinates<
        Omit<
          SetRequired<PartialDeep<T>, 'type'>,
          'preDelay' | 'postDelay' | 'rearDelay'
        >
      > &
        WithId<{
          intermediatePreDelay?: number
          intermediatePostDelay?: number
        }>
    >

export type EditorAction = GenerateEditorAction<CopilotDocV1.Action>

export interface EditorOperation extends EditorOperationBase {
  opers: EditorOperator[]
  groups: EditorGroup[]
  actions: EditorAction[]
}

export interface EditorMetadata {
  visibility: 'public' | 'private'
}

export interface EditorState {
  operation: EditorOperation
  metadata: EditorMetadata
}
