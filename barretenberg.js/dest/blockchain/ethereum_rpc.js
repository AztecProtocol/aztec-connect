"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumRpc = void 0;
const address_1 = require("../address");
class EthereumRpc {
    constructor(provider) {
        this.provider = provider;
    }
    async getChainId() {
        const result = await this.provider.request({ method: 'eth_chainId' });
        return Number(result);
    }
    async getAccounts() {
        const result = await this.provider.request({ method: 'eth_accounts' });
        return result.map(address_1.EthAddress.fromString);
    }
    /**
     * TODO: Return proper type with converted properties.
     */
    async getTransaction(txHash) {
        const result = await this.provider.request({ method: 'eth_getTransactionByHash', params: [txHash.toString()] });
        return result;
    }
}
exports.EthereumRpc = EthereumRpc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXRoZXJldW1fcnBjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Jsb2NrY2hhaW4vZXRoZXJldW1fcnBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUF3QztBQUl4QyxNQUFhLFdBQVc7SUFDdEIsWUFBb0IsUUFBMEI7UUFBMUIsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7SUFBRyxDQUFDO0lBRTNDLEtBQUssQ0FBQyxVQUFVO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUN0RSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRU0sS0FBSyxDQUFDLFdBQVc7UUFDdEIsTUFBTSxNQUFNLEdBQWEsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYztRQUN4QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoSCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFwQkQsa0NBb0JDIn0=