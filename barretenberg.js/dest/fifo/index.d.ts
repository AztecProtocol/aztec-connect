export declare class MemoryFifo<T> {
    private waiting;
    private items;
    private flushing;
    length(): number;
    /**
     * Returns next item within the queue, or blocks until and item has been put into the queue.
     * If given a timeout, the promise will reject if no item is received after `timeout` seconds.
     * If the queue is flushing, `null` is returned.
     */
    get(timeout?: number): Promise<T | null>;
    /**
     * Put an item onto back of the queue.
     */
    put(item: T): void;
    /**
     * Once ended, no further items are added to queue. Consumers will consume remaining items within the queue.
     * The queue is not reusable after calling `end()`.
     */
    end(): void;
    /**
     * Once cancelled, all items are discarded from the queue.
     * The queue is not reusable after calling `cancel()`.
     */
    cancel(): void;
    /**
     * Helper method that can be used to continously consume and process items on the queue.
     */
    process(handler: (item: T) => Promise<void>): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map