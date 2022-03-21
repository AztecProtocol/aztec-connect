"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockchainStatus = exports.getServiceName = void 0;
const blockchain_1 = require("../blockchain");
const iso_fetch_1 = require("../iso_fetch");
async function getServiceName(baseUrl) {
    const response = await (0, iso_fetch_1.fetch)(baseUrl);
    try {
        const body = await response.json();
        return body.serviceName;
    }
    catch (err) {
        throw new Error(`Bad response from: ${baseUrl}`);
    }
}
exports.getServiceName = getServiceName;
async function getBlockchainStatus(baseUrl) {
    const response = await (0, iso_fetch_1.fetch)(`${baseUrl}/status`);
    try {
        const body = await response.json();
        return (0, blockchain_1.blockchainStatusFromJson)(body.blockchainStatus);
    }
    catch (err) {
        throw new Error(`Bad response from: ${baseUrl}`);
    }
}
exports.getBlockchainStatus = getBlockchainStatus;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VydmljZS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4Q0FBeUQ7QUFDekQsNENBQXFDO0FBRTlCLEtBQUssVUFBVSxjQUFjLENBQUMsT0FBZTtJQUNsRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUEsaUJBQUssRUFBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxJQUFJO1FBQ0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ3pCO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ2xEO0FBQ0gsQ0FBQztBQVJELHdDQVFDO0FBRU0sS0FBSyxVQUFVLG1CQUFtQixDQUFDLE9BQWU7SUFDdkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFBLGlCQUFLLEVBQUMsR0FBRyxPQUFPLFNBQVMsQ0FBQyxDQUFDO0lBQ2xELElBQUk7UUFDRixNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUEscUNBQXdCLEVBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7S0FDeEQ7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLE9BQU8sRUFBRSxDQUFDLENBQUM7S0FDbEQ7QUFDSCxDQUFDO0FBUkQsa0RBUUMifQ==