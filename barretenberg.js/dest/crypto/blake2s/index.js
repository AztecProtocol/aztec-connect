"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blake2s = void 0;
class Blake2s {
    constructor(wasm) {
        this.wasm = wasm;
    }
    hashToField(data) {
        const mem = this.wasm.call('bbmalloc', data.length);
        this.wasm.transferToHeap(data, mem);
        this.wasm.call('blake2s_to_field', mem, data.length, 0);
        this.wasm.call('bbfree', mem);
        return Buffer.from(this.wasm.sliceMemory(0, 32));
    }
}
exports.Blake2s = Blake2s;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY3J5cHRvL2JsYWtlMnMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxPQUFPO0lBQ2xCLFlBQW9CLElBQXNCO1FBQXRCLFNBQUksR0FBSixJQUFJLENBQWtCO0lBQUcsQ0FBQztJQUV2QyxXQUFXLENBQUMsSUFBZ0I7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0Y7QUFWRCwwQkFVQyJ9