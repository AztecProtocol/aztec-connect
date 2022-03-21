/// <reference types="node" />

import "core-js/modules/es.symbol.async-iterator"

interface ReadableStream extends NodeJS.ReadableStream {
  closed?: boolean
  destroyed?: boolean

  destroy?(): void
}

export class PromiseReadable<TReadable extends ReadableStream> implements AsyncIterable<Buffer | string> {
  static [Symbol.hasInstance](instance: any): boolean {
    return instance._isPromiseReadable
  }

  readonly _isPromiseReadable: boolean = true

  _errored?: Error

  constructor(readonly stream: TReadable) {
    stream.on("error", this.errorHandler)
  }

  read(size?: number): Promise<Buffer | string | undefined> {
    const stream = this.stream

    return new Promise((resolve, reject) => {
      if (this._errored) {
        const err = this._errored
        this._errored = undefined
        return reject(err)
      }

      if (!stream.readable || stream.closed || stream.destroyed) {
        return resolve()
      }

      const readableHandler = () => {
        const chunk = stream.read(size)

        if (chunk !== null) {
          removeListeners()
          resolve(chunk)
        }
      }

      const closeHandler = () => {
        removeListeners()
        resolve()
      }

      const endHandler = () => {
        removeListeners()
        resolve()
      }

      const errorHandler = (err: Error) => {
        this._errored = undefined
        removeListeners()
        reject(err)
      }

      const removeListeners = () => {
        stream.removeListener("close", closeHandler)
        stream.removeListener("error", errorHandler)
        stream.removeListener("end", endHandler)
        stream.removeListener("readable", readableHandler)
      }

      stream.on("close", closeHandler)
      stream.on("end", endHandler)
      stream.on("error", errorHandler)
      stream.on("readable", readableHandler)

      readableHandler()
    })
  }

  readAll(): Promise<Buffer | string | undefined> {
    const stream = this.stream
    const bufferArray: Buffer[] = []
    let content = ""

    return new Promise((resolve, reject) => {
      if (this._errored) {
        const err = this._errored
        this._errored = undefined
        return reject(err)
      }

      if (!stream.readable || stream.closed || stream.destroyed) {
        return resolve()
      }

      const dataHandler = (chunk: Buffer | string) => {
        if (typeof chunk === "string") {
          content += chunk
        } else {
          bufferArray.push(chunk)
        }
      }

      const closeHandler = () => {
        removeListeners()
        resolve()
      }

      const endHandler = () => {
        removeListeners()

        if (bufferArray.length) {
          resolve(Buffer.concat(bufferArray))
        } else {
          resolve(content)
        }
      }

      const errorHandler = (err: Error) => {
        this._errored = undefined
        removeListeners()
        reject(err)
      }

      const removeListeners = () => {
        stream.removeListener("close", closeHandler)
        stream.removeListener("data", dataHandler)
        stream.removeListener("error", errorHandler)
        stream.removeListener("end", endHandler)
      }

      stream.on("close", closeHandler)
      stream.on("data", dataHandler)
      stream.on("end", endHandler)
      stream.on("error", errorHandler)

      stream.resume()
    })
  }

  setEncoding(encoding: string): this {
    this.stream.setEncoding(encoding)
    return this
  }

  once(event: "close" | "end" | "error"): Promise<void>
  once(event: "open"): Promise<number>

  once(event: string): Promise<void | number> {
    const stream = this.stream

    return new Promise((resolve, reject) => {
      if (this._errored) {
        const err = this._errored
        this._errored = undefined
        return reject(err)
      }

      if (stream.closed) {
        if (event === "close") {
          return resolve()
        } else {
          return reject(new Error(`once ${event} after close`))
        }
      } else if (stream.destroyed) {
        if (event === "close" || event === "end") {
          return resolve()
        } else {
          return reject(new Error(`once ${event} after destroy`))
        }
      }

      const closeHandler = () => {
        removeListeners()
        resolve()
      }

      const eventHandler =
        event !== "close" && event !== "end" && event !== "error"
          ? (argument: any) => {
              removeListeners()
              resolve(argument)
            }
          : undefined

      const endHandler =
        event !== "close"
          ? () => {
              removeListeners()
              resolve()
            }
          : undefined

      const errorHandler = (err: Error) => {
        this._errored = undefined
        removeListeners()
        reject(err)
      }

      const removeListeners = () => {
        if (eventHandler) {
          stream.removeListener(event, eventHandler)
        }

        stream.removeListener("error", errorHandler)

        if (endHandler) {
          stream.removeListener("end", endHandler)
        }

        stream.removeListener("error", errorHandler)
      }

      if (eventHandler) {
        stream.on(event, eventHandler)
      }

      stream.on("close", closeHandler)

      if (endHandler) {
        stream.on("end", endHandler)
      }

      stream.on("error", errorHandler)
    })
  }

  iterate(size?: number): AsyncIterableIterator<Buffer | string> {
    const promiseReadable = this

    let wasEof = false

    return {
      [Symbol.asyncIterator](): AsyncIterableIterator<Buffer | string> {
        return this
      },

      next(): Promise<IteratorResult<Buffer | string>> {
        if (wasEof) {
          return Promise.resolve({value: "", done: true})
        } else {
          return promiseReadable.read(size).then(value => {
            if (value === undefined) {
              wasEof = true
              return {value: "", done: true}
            } else {
              return {value, done: false}
            }
          })
        }
      },
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer | string> {
    return this.iterate()
  }

  destroy(): void {
    if (this.stream) {
      this.stream.removeListener("error", this.errorHandler)
      if (typeof this.stream.destroy === "function") {
        this.stream.destroy()
      }
    }
  }

  private readonly errorHandler = (err: Error): void => {
    this._errored = err
  }
}

export default PromiseReadable
