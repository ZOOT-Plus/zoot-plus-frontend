import { useEffect, useRef } from 'react'

const DEBUG = false as boolean

let messengerName = 'Copilot'

export type Message<T extends string = string, D = undefined> = D extends undefined
  ? BaseMessage<T>
  : PayloadMessage<T, D>

interface BaseMessage<T extends string = string> {
  readonly id?: number | string
  readonly type: T
}

export interface PayloadMessage<T extends string = string, D = never> extends BaseMessage<T> {
  readonly data: D
}

interface Messenger {
  addEventListener<M extends Message>(type: string, callback: ((ev: MessengerEvent<M>) => void) | null): void
  addEventListener(type: string, callback: EventListenerOrEventListenerObject): void
  removeEventListener<M extends Message>(type: string, callback: ((ev: MessengerEvent<M>) => void) | null): void
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject): void
}

class Messenger extends EventTarget {}

export class MessengerEvent<M extends Message = Message> extends Event {
  readonly source: MessageEvent['source']
  readonly origin: MessageEvent['origin']
  readonly message: M

  constructor(params: Pick<MessengerEvent<M>, 'type' | 'source' | 'origin' | 'message'>) {
    super(params.type)
    this.source = params.source
    this.origin = params.origin
    this.message = params.message

    // allow the method to be destructured etc.
    this.reply = this.reply.bind(this)
  }

  /**
   * Handy method to reply to the message's source.
   * @returns a promise which is the result of `sendMessage()`.
   */
  public reply(message: Message) {
    if (this.source) {
      return sendMessage(this.source as Window, this.origin, message)
    }

    return Promise.resolve(false)
  }
}

const messenger = new Messenger()

window.addEventListener('message', (event: MessageEvent) => {
  const { data, origin, source } = event

  if (data && typeof data.type === 'string') {
    if (DEBUG) {
      if (!isAckType(data.type)) {
        log('received', data)
      }
    }

    messenger.dispatchEvent(
      new MessengerEvent({
        type: data.type,
        message: data,
        origin: origin,
        source: source,
      }),
    )
  }
})

export function useMessage<M extends Message>(
  origin: string,
  type: M['type'],
  listener: (message: MessengerEvent<M>) => void,
) {
  const listenerRef = useRef(listener)
  listenerRef.current = listener
  useEffect(() => {
    const handler: typeof listener = (message) => {
      if (isAckType(message.type)) {
        return
      }

      if (origin === '*' || message.origin === origin) {
        // we assume that the received message always has an id,
        // since we generate one if it's missing when sending
        const id = message.message.id!

        message.reply({ type: getAckType(id) }).catch((e) => log('Error:', e))

        // processing messages received from outside can be error-prone, so we wrap the listener in a try-catch
        try {
          listenerRef.current(message)
        } catch (e) {
          log('Error:', e)
        }
      }
    }
    messenger.addEventListener(type, handler)
    return () => {
      messenger.removeEventListener(type, handler)
    }
  }, [type, origin])
}

export function sendMessage<M extends Message>(
  target: Pick<Window, 'postMessage'>,
  origin: string,
  message: M,
  timeout = 500,
): Promise<boolean> {
  const messageToSend: Message & { id: NonNullable<Message['id']> } = {
    id: message.id ?? defaultIdGenerator(),
    ...message,
  }

  if (DEBUG) {
    if (!isAckType(messageToSend.type)) {
      log('sending', messageToSend)
    }
  }

  const eventType = getAckType(messageToSend.id)

  return new Promise<boolean>((resolve) => {
    target.postMessage(messageToSend, origin)

    const handler = () => {
      messenger.removeEventListener(eventType, handler)
      resolve(true)
    }

    if (timeout > 0) {
      window.setTimeout(() => {
        messenger.removeEventListener(eventType, handler)
        resolve(false)
      }, timeout)
    }

    messenger.addEventListener(eventType, handler)
  })
}

function getAckType(id: NonNullable<Message['id']>) {
  return `ack:${id}`
}

function isAckType(type: string) {
  return type.startsWith('ack:')
}

function defaultIdGenerator(): NonNullable<Message['id']> {
  return Math.random().toString(36).slice(2, 6)
}

export function setMessengerName(name: string) {
  messengerName = name
}

function log(...args: any[]) {
  console.log(`[Msg:${messengerName}]`, ...args)
}
