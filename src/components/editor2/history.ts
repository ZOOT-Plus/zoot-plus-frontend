import { Getter, PrimitiveAtom, Setter, atom, useAtomValue, useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { SetStateAction, useCallback } from 'react'

export interface Checkpoint {
  action: string
  desc: string
  squashBy?: string | number
}

interface HistoryRecord<T> extends Checkpoint {
  state: T
  time: number
}

interface InternalHistoryTracker<T extends {}> {
  stack: HistoryRecord<T | null>[]
  index: number
  limit: number
}

interface HistoryTracker<T extends {}> {
  stack: HistoryRecord<T>[]
  index: number
  limit: number
  /** 主要是为了便于在 Redux Devtools 里查看 diff 用的，不要在代码里使用 */
  _current?: HistoryRecord<T>
}

function createInitialTrackerState<T extends {}>(limit: number): InternalHistoryTracker<T> {
  const record = {
    state: null,
    action: 'init',
    desc: 'Initialize (Locked)',
    time: Date.now(),
  }
  return {
    stack: [record],
    index: 0,
    limit,
  }
}

export function createHistoryAtom<T extends {}>(stateAtom: PrimitiveAtom<T>, limit: number) {
  const historyTrackerAtom = atom(createInitialTrackerState<T>(limit))

  const fromInternal = <T extends {}>(tracker: InternalHistoryTracker<T>, currentState: T) => {
    let current = tracker.stack[tracker.index]
    if (current.state !== null) {
      if (process.env.NODE_ENV === 'development') {
        console.error('historyAtom: state of the "current" record is not null', current)
      }
    }
    current = { ...current, state: currentState }
    return {
      ...tracker,
      stack: tracker.stack.map((record, i) => (i === tracker.index ? current : record)) as HistoryRecord<T>[],
      _current: current as HistoryRecord<T>,
    } satisfies HistoryTracker<T>
  }

  const toInternal = <T extends {}>(tracker: HistoryTracker<T>): InternalHistoryTracker<T> => {
    return {
      ...tracker,
      stack: tracker.stack.map((record, i) => ({
        ...record,
        state: i === tracker.index ? null : record.state,
      })),
    }
  }

  return atom(
    (get) => fromInternal(get(historyTrackerAtom), get(stateAtom)),
    (get, set, update: SetStateAction<HistoryTracker<T>> | 'RESET') => {
      const internalTracker = get(historyTrackerAtom)

      if (update === 'RESET') {
        set(historyTrackerAtom, createInitialTrackerState<T>(internalTracker.limit))
        return
      }
      const { _current, ...tracker } = fromInternal(internalTracker, get(stateAtom))
      if (typeof update === 'function') {
        update = update(tracker)
      }
      const current = update.stack[update.index]
      set(stateAtom, current.state)
      set(historyTrackerAtom, toInternal(update))
    },
  )
}

export function useHistoryValue<T extends {}>(atom: PrimitiveAtom<HistoryTracker<T>>) {
  const history = useAtomValue(atom)
  return {
    history,
    state: history.stack[history.index].state,
    canUndo: history.index > 0,
    canRedo: history.index < history.stack.length - 1,
  }
}

export function useHistoryControls<T extends {}>(historyAtom: PrimitiveAtom<HistoryTracker<T>>) {
  const setHistory = useSetAtom(historyAtom)
  const undo = () => {
    setHistory((prev) => {
      if (prev.index <= 0) {
        return prev
      }
      return { ...prev, index: prev.index - 1 }
    })
  }
  const redo = () => {
    setHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) {
        return prev
      }
      return { ...prev, index: prev.index + 1 }
    })
  }
  const checkout = (index: number) => {
    setHistory((prev) => {
      if (index < 0 || index >= prev.stack.length) {
        return prev
      }
      return { ...prev, index }
    })
  }

  return {
    undo,
    redo,
    checkout,
  }
}

type HistoryEditFn = ((get: Getter, set: Setter, skip: Checkpoint) => Checkpoint) & {}

// skips the history change
const skipCheckpoint: Checkpoint = {
  action: 'skip',
  desc: 'Skip checkpoint',
}

// soft checkpoint is a special checkpoint that won't show up in the history
// but will prevent the next checkpoint from being squashed
const softCheckpoint: Checkpoint = {
  action: 'soft',
  desc: 'Soft checkpoint',
}

export function useHistoryEdit<T extends {}>(historyAtom: PrimitiveAtom<HistoryTracker<T>>) {
  return useAtomCallback(
    useCallback(
      (get, set, editFn?: HistoryEditFn) => {
        let checkpoint: Checkpoint

        if (!editFn) {
          editFn = () => softCheckpoint
        }

        const snapshot = get(historyAtom)
        checkpoint = editFn(get, set, skipCheckpoint)
        const history = get(historyAtom)

        if (checkpoint === skipCheckpoint) {
          if (process.env.NODE_ENV === 'development') {
            if (history !== snapshot) {
              console.warn(
                'History edit: received skip checkpoint but history has changed. If this is intended, use a standard checkpoint with `squashBy` instead.',
              )
            }
          }
          return
        }

        const current = history.stack[history.index]
        const snapshottedCurrent = snapshot.stack[snapshot.index]

        const shouldSquash =
          checkpoint.action === current.action &&
          checkpoint.squashBy !== undefined &&
          checkpoint.squashBy === current.squashBy &&
          // only squash if currently on top of the history stack
          history.index === history.stack.length - 1

        // make it a soft checkpoint if the checkpoint is non-squashable but the state is unchanged,
        // because we don't want the history to advance when the state is unchanged, but still want to
        // prevent the next checkpoint from being squashed since a non-squashable checkpoint is being used
        // and it's supposed to block the squashing even if it's not actually inserted into the history
        if (
          !shouldSquash &&
          current.state === snapshottedCurrent.state &&
          JSON.stringify(current.state) === JSON.stringify(snapshottedCurrent.state)
        ) {
          checkpoint = softCheckpoint
        }

        let newCurrent: HistoryRecord<T>

        if (checkpoint === softCheckpoint) {
          // reset squashBy so that the next checkpoint will never be squashed
          newCurrent = {
            ...current,
            squashBy: undefined,
          }
        } else {
          newCurrent = {
            ...current,
            ...checkpoint,
            // explicitly overwrite this property in case it's omitted in the checkpoint
            squashBy: checkpoint.squashBy,
            time: Date.now(),
          }
        }

        if (shouldSquash || checkpoint === softCheckpoint) {
          const newStack = [
            ...history.stack.slice(0, history.index),
            newCurrent,
            ...history.stack.slice(history.index + 1),
          ]
          set(historyAtom, {
            ...history,
            stack: newStack,
          })
        } else {
          const newStack = [...history.stack.slice(-(history.limit - 2), history.index), snapshottedCurrent, newCurrent]
          // 永远保留第一条记录
          if (history.index >= history.limit - 2) {
            newStack.unshift(snapshot.stack[0])
          }
          set(historyAtom, {
            ...history,
            stack: newStack,
            index: newStack.length - 1,
          })
        }
      },
      [historyAtom],
    ),
  )
}
