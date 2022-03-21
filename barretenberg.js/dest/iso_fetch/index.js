"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = void 0;
const tslib_1 = require("tslib");
const detect_node_1 = (0, tslib_1.__importDefault)(require("detect-node"));
function fetch(input, init) {
    if (detect_node_1.default) {
        // eslint-disable-next-line
        const f = require('node-fetch').default;
        return f(input, init);
    }
    else {
        return window.fetch(input, init);
    }
}
exports.fetch = fetch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaXNvX2ZldGNoL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSwyRUFBaUM7QUFFakMsU0FBZ0IsS0FBSyxDQUFDLEtBQWtCLEVBQUUsSUFBa0I7SUFDMUQsSUFBSSxxQkFBTSxFQUFFO1FBQ1YsMkJBQTJCO1FBQzNCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDeEMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3ZCO1NBQU07UUFDTCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ2xDO0FBQ0gsQ0FBQztBQVJELHNCQVFDIn0=