"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destroyWorker = exports.createWorker = void 0;
const tslib_1 = require("tslib");
const threads_1 = require("threads");
const debug_1 = (0, tslib_1.__importDefault)(require("debug"));
async function createWorker(id, module, initial) {
    const debug = (0, debug_1.default)(`bb:wasm${id ? ':' + id : ''}`);
    const thread = await (0, threads_1.spawn)(new threads_1.Worker('./worker.js'));
    thread.logs().subscribe(debug);
    await thread.init(module, initial);
    return thread;
}
exports.createWorker = createWorker;
async function destroyWorker(worker) {
    await threads_1.Thread.terminate(worker);
}
exports.destroyWorker = destroyWorker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyX2ZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzbS93b3JrZXJfZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EscUNBQWdEO0FBQ2hELCtEQUFnQztBQUV6QixLQUFLLFVBQVUsWUFBWSxDQUFDLEVBQVcsRUFBRSxNQUEyQixFQUFFLE9BQWdCO0lBQzNGLE1BQU0sS0FBSyxHQUFHLElBQUEsZUFBVyxFQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxlQUFLLEVBQXFCLElBQUksZ0JBQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuQyxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBTkQsb0NBTUM7QUFFTSxLQUFLLFVBQVUsYUFBYSxDQUFDLE1BQTBCO0lBQzVELE1BQU0sZ0JBQU0sQ0FBQyxTQUFTLENBQUMsTUFBYSxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELHNDQUVDIn0=