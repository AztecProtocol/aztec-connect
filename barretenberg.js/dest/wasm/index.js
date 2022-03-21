"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCode = void 0;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const detect_node_1 = (0, tslib_1.__importDefault)(require("detect-node"));
const util_1 = require("util");
const events_1 = require("events");
(0, tslib_1.__exportStar)(require("./barretenberg_wasm"), exports);
(0, tslib_1.__exportStar)(require("./worker_pool"), exports);
(0, tslib_1.__exportStar)(require("./worker_factory"), exports);
events_1.EventEmitter.defaultMaxListeners = 30;
async function fetchCode() {
    if (detect_node_1.default) {
        return await (0, util_1.promisify)(fs_1.readFile)(__dirname + '/barretenberg.wasm');
    }
    else {
        const res = await fetch('/barretenberg.wasm');
        return Buffer.from(await res.arrayBuffer());
    }
}
exports.fetchCode = fetchCode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2FzbS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkJBQThCO0FBQzlCLDJFQUFpQztBQUNqQywrQkFBaUM7QUFDakMsbUNBQXNDO0FBRXRDLG1FQUFvQztBQUNwQyw2REFBOEI7QUFDOUIsZ0VBQWlDO0FBR2pDLHFCQUFZLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0FBRS9CLEtBQUssVUFBVSxTQUFTO0lBQzdCLElBQUkscUJBQU0sRUFBRTtRQUNWLE9BQU8sTUFBTSxJQUFBLGdCQUFTLEVBQUMsYUFBUSxDQUFDLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDLENBQUM7S0FDcEU7U0FBTTtRQUNMLE1BQU0sR0FBRyxHQUFHLE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDOUMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDN0M7QUFDSCxDQUFDO0FBUEQsOEJBT0MifQ==