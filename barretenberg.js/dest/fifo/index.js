"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFifo = void 0;
class MemoryFifo {
    constructor() {
        this.waiting = [];
        this.items = [];
        this.flushing = false;
    }
    length() {
        return this.items.length;
    }
    /**
     * Returns next item within the queue, or blocks until and item has been put into the queue.
     * If given a timeout, the promise will reject if no item is received after `timeout` seconds.
     * If the queue is flushing, `null` is returned.
     */
    async get(timeout) {
        if (this.items.length) {
            return Promise.resolve(this.items.shift());
        }
        if (this.items.length === 0 && this.flushing) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            this.waiting.push(resolve);
            if (timeout) {
                setTimeout(() => {
                    const index = this.waiting.findIndex(r => r === resolve);
                    if (index > -1) {
                        this.waiting.splice(index, 1);
                        const err = new Error('Timeout getting item from queue.');
                        reject(err);
                    }
                }, timeout * 1000);
            }
        });
    }
    /**
     * Put an item onto back of the queue.
     */
    put(item) {
        if (this.flushing) {
            return;
        }
        else if (this.waiting.length) {
            this.waiting.shift()(item);
        }
        else {
            this.items.push(item);
        }
    }
    /**
     * Once ended, no further items are added to queue. Consumers will consume remaining items within the queue.
     * The queue is not reusable after calling `end()`.
     */
    end() {
        this.flushing = true;
        this.waiting.forEach(resolve => resolve(null));
    }
    /**
     * Once cancelled, all items are discarded from the queue.
     * The queue is not reusable after calling `cancel()`.
     */
    cancel() {
        this.flushing = true;
        this.items = [];
        this.waiting.forEach(resolve => resolve(null));
    }
    /**
     * Helper method that can be used to continously consume and process items on the queue.
     */
    async process(handler) {
        try {
            while (true) {
                const item = await this.get();
                if (item === null) {
                    break;
                }
                await handler(item);
            }
        }
        catch (err) {
            // tslint:disable:no-console
            console.error('Queue handler exception:', err);
        }
    }
}
exports.MemoryFifo = MemoryFifo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZmlmby9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFhLFVBQVU7SUFBdkI7UUFDVSxZQUFPLEdBQWlDLEVBQUUsQ0FBQztRQUMzQyxVQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ2hCLGFBQVEsR0FBRyxLQUFLLENBQUM7SUFxRjNCLENBQUM7SUFuRlEsTUFBTTtRQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQWdCO1FBQy9CLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDckIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFHLENBQUMsQ0FBQztTQUM3QztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDNUMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlCO1FBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMvQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUzQixJQUFJLE9BQU8sRUFBRTtnQkFDWCxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxDQUFDO29CQUN6RCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRTt3QkFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7d0JBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDYjtnQkFDSCxDQUFDLEVBQUUsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQ3BCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxHQUFHLENBQUMsSUFBTztRQUNoQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakIsT0FBTztTQUNSO2FBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdCO2FBQU07WUFDTCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN2QjtJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSSxHQUFHO1FBQ1IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTTtRQUNYLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFtQztRQUN0RCxJQUFJO1lBQ0YsT0FBTyxJQUFJLEVBQUU7Z0JBQ1gsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQzlCLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtvQkFDakIsTUFBTTtpQkFDUDtnQkFDRCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNyQjtTQUNGO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWiw0QkFBNEI7WUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUM7Q0FDRjtBQXhGRCxnQ0F3RkMifQ==