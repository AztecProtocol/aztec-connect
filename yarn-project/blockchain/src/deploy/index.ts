#!/usr/bin/env node
import { EthAddress } from '@aztec/barretenberg/address';
import { deployContracts } from './deploy_contracts.js';

// Assume these env vars could be set to ''.
// Default values will not be picked up as '' !== undefined.
const { ETHEREUM_HOST, PRIVATE_KEY, VK, FAUCET_OPERATOR, ROLLUP_PROVIDER_ADDRESS } = process.env;

/**
 * We add gasLimit to all txs, to prevent calls to estimateGas that may fail. If a gasLimit is provided the calldata
 * is simply produced, there is nothing to fail. As long as all the txs are executed by the evm in order, things
 * should succeed. The NonceManager ensures all the txs have sequentially increasing nonces.
 * In some cases there maybe a "deployment sync point" which is required if we are making a "call" to the blockchain
 * straight after, that assumes the state is up-to-date at that point.
 * This drastically improves deployment times.
 */
async function main() {
  if (!ETHEREUM_HOST) {
    throw new Error('ETHEREUM_HOST not set');
  }
  const faucetOperator = FAUCET_OPERATOR ? EthAddress.fromString(FAUCET_OPERATOR) : undefined;
  const rollupProvider = ROLLUP_PROVIDER_ADDRESS ? EthAddress.fromString(ROLLUP_PROVIDER_ADDRESS) : undefined;
  const envVars = await deployContracts(ETHEREUM_HOST, VK, PRIVATE_KEY, faucetOperator, rollupProvider);

  for (const [k, v] of Object.entries(envVars)) {
    console.log(`export ${k}=${v}`);
    console.log(`export TF_VAR_${k}=${v}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
